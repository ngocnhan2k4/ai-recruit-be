import { NestFactory } from "@nestjs/core";
import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { ConfigModule } from "@nestjs/config";
import type * as admin from "firebase-admin";
import { FIREBASE_ADMIN } from "@/common/constants";
import { PostgresDataServicesModule } from "@/frameworks/data-services/postgres/postgres-data-services.module";
import { FireBaseAuthServicesModule } from "@/frameworks/auth-services/firebase/firebase-auth-services.module";
import {
  users,
  userIdentities,
} from "@/frameworks/data-services/postgres/models";
import type { DBDrizzle } from "@/frameworks/data-services/postgres/types";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { normalizeProvider } from "@/common/utils/firebase";

type DbIdentityCapabilities = {
  providerEmail: boolean;
  providerName: boolean;
  providerPicture: boolean;
};

const getDbIdentityCapabilities = async (
  drizzleDb: DBDrizzle,
): Promise<DbIdentityCapabilities> => {
  const pool = (drizzleDb as any)?.$client;
  if (!pool?.query) {
    // Fall back: assume schema is up to date.
    return { providerEmail: true, providerName: true, providerPicture: true };
  }

  const result = await pool.query(
    `select column_name
     from information_schema.columns
     where table_schema = 'public'
       and table_name = 'user_identities'`,
  );

  const cols = new Set<string>(
    (result?.rows ?? []).map((r: any) => String(r.column_name)),
  );
  return {
    providerEmail: cols.has("provider_email"),
    providerName: cols.has("provider_name"),
    providerPicture: cols.has("provider_picture"),
  };
};

const isFirebaseUserNotFoundError = (e: unknown): boolean => {
  const anyErr = e as any;
  const code = anyErr?.code ?? anyErr?.errorInfo?.code;
  if (code === "auth/user-not-found") return true;
  const message = anyErr?.message ?? String(e);
  return (
    message.includes("auth/user-not-found") ||
    message.toLowerCase().includes("no user record") ||
    message.toLowerCase().includes("no user")
  );
};

const formatDbError = (e: unknown): string => {
  const anyErr = e as any;
  const parts: string[] = [];
  if (anyErr?.code) parts.push(`code=${anyErr.code}`);
  if (anyErr?.severity) parts.push(`severity=${anyErr.severity}`);
  if (anyErr?.constraint) parts.push(`constraint=${anyErr.constraint}`);
  if (anyErr?.table) parts.push(`table=${anyErr.table}`);
  if (anyErr?.detail) parts.push(`detail=${anyErr.detail}`);
  if (anyErr?.hint) parts.push(`hint=${anyErr.hint}`);

  const message = anyErr?.message ?? String(e);
  return `${message}${parts.length ? ` (${parts.join(" ")})` : ""}`;
};

const upsertUserIdentity = async (
  drizzleDb: DBDrizzle,
  identity: {
    userId: string;
    provider: any;
    providerUserId?: string;
    providerEmail?: string | null;
    providerName?: string | null;
    providerPicture?: string | null;
  },
): Promise<"updated" | "inserted"> => {
  const updateSet: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (identity.providerUserId !== undefined)
    updateSet.providerUserId = identity.providerUserId;
  if (identity.providerEmail !== undefined)
    updateSet.providerEmail = identity.providerEmail;
  if (identity.providerName !== undefined)
    updateSet.providerName = identity.providerName;
  if (identity.providerPicture !== undefined)
    updateSet.providerPicture = identity.providerPicture;

  // 1) Prefer UPDATE to avoid relying on unique indexes.
  const updated = await drizzleDb
    .update(userIdentities)
    .set(updateSet as any)
    .where(
      and(
        eq(userIdentities.userId, identity.userId),
        eq(userIdentities.provider, identity.provider),
        sql`${userIdentities.deletedAt} IS NULL`,
      ),
    )
    .returning({ id: userIdentities.id });
  if (updated.length > 0) return "updated";

  // 2) If nothing updated, try INSERT.
  try {
    await drizzleDb
      .insert(userIdentities)
      .values(identity as any)
      .onConflictDoNothing();
    return "inserted";
  } catch (e) {
    // If we raced another insert that has a unique constraint, retry UPDATE once.
    const code = (e as any)?.code;
    if (code === "23505") {
      await drizzleDb
        .update(userIdentities)
        .set(updateSet as any)
        .where(
          and(
            eq(userIdentities.userId, identity.userId),
            eq(userIdentities.provider, identity.provider),
            sql`${userIdentities.deletedAt} IS NULL`,
          ),
        );
      return "updated";
    }
    throw e;
  }
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", ".env.development", ".env.production"],
    }),
    // Provide CACHE_MANAGER without pulling in Redis (defaults to in-memory).
    CacheModule.register({ isGlobal: true }),
    PostgresDataServicesModule,
    FireBaseAuthServicesModule,
  ],
})
class SyncFirebaseIdentitiesModule {}

type Options = {
  limit: number;
  batchSize: number;
  concurrency: number;
  dryRun: boolean;
  timeoutMs: number;
  forceExit: boolean;
};

const parseArgs = (): Options => {
  const args = new Map<string, string>();
  for (const raw of process.argv.slice(2)) {
    const [k, v] = raw.split("=");
    if (k.startsWith("--")) args.set(k, v ?? "true");
  }

  return {
    limit: Number(args.get("--limit") ?? 0), // 0 = no limit
    batchSize: Number(args.get("--batch") ?? 200),
    concurrency: Number(args.get("--concurrency") ?? 3),
    dryRun: (args.get("--dry-run") ?? "false") === "true",
    timeoutMs: Number(args.get("--timeoutMs") ?? 15000),
    forceExit: (args.get("--force-exit") ?? "false") === "true",
  };
};

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;

  let timeoutHandle: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`[timeout] ${label} after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
};

const mapWithConcurrency = async <T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  });

  await Promise.all(workers);
  return results;
};

const providerKeyFromProviderId = (providerId?: string): string | undefined => {
  if (!providerId) return undefined;
  if (providerId.includes("google")) return "google.com";
  if (providerId.includes("facebook")) return "facebook.com";
  if (providerId.includes("github")) return "github.com";
  if (providerId.includes("password")) return "password";
  return providerId;
};

async function main() {
  const options = parseArgs();
  console.log(
    `[sync] start limit=${options.limit} batch=${options.batchSize} concurrency=${options.concurrency} dryRun=${options.dryRun} timeoutMs=${options.timeoutMs} forceExit=${options.forceExit}`,
  );
  const app = await NestFactory.createApplicationContext(
    SyncFirebaseIdentitiesModule,
    {
      logger: ["log", "warn", "error"],
    },
  );

  let db: DBDrizzle | undefined;

  try {
    const drizzleDb = app.get<DBDrizzle>("DRIZZLE");
    db = drizzleDb;
    const firebaseApp = app.get<admin.app.App>(FIREBASE_ADMIN as any);

    const capabilities = await getDbIdentityCapabilities(drizzleDb);
    if (
      !capabilities.providerEmail ||
      !capabilities.providerName ||
      !capabilities.providerPicture
    ) {
      console.warn(
        `[sync] user_identities missing columns: provider_email=${capabilities.providerEmail} provider_name=${capabilities.providerName} provider_picture=${capabilities.providerPicture}. Will sync without missing fields.`,
      );
    }

    let offset = 0;
    let syncedUsers = 0;
    let insertedRows = 0;
    let firebaseNotFound = 0;
    let erroredUsers = 0;

    // Loop by pages to avoid loading all users into memory.
    while (true) {
      const rows = await drizzleDb
        .select({
          id: users.id,
          firebaseUid: users.firebaseUid,
          provider: users.provider,
        })
        .from(users)
        .where(isNotNull(users.firebaseUid))
        .limit(options.batchSize)
        .offset(offset);

      if (rows.length === 0) break;

      const limitedRows =
        options.limit > 0
          ? rows.slice(0, Math.max(0, options.limit - syncedUsers))
          : rows;

      if (limitedRows.length === 0) break;

      console.log(
        `[sync] batch offset=${offset} rows=${rows.length} processing=${limitedRows.length}`,
      );

      await mapWithConcurrency(
        limitedRows,
        options.concurrency,
        async (row) => {
          const firebaseUid = row.firebaseUid as string;
          let userRecord: admin.auth.UserRecord;

          try {
            userRecord = await withTimeout(
              firebaseApp.auth().getUser(firebaseUid),
              options.timeoutMs,
              `firebase.getUser uid=${firebaseUid}`,
            );
          } catch (e) {
            // User might not exist in Firebase anymore; skip.
            if (isFirebaseUserNotFoundError(e)) {
              firebaseNotFound++;
              console.warn(
                `[sync] Firebase user not found: uid=${firebaseUid}`,
              );
              return;
            }

            erroredUsers++;
            console.warn(
              `[sync] Firebase getUser failed: uid=${firebaseUid} err=${(e as any)?.message ?? String(e)}`,
            );
            return;
          }

          // Prefer providerData (authoritative for linked providers).
          const providerData = userRecord.providerData ?? [];

          // If providerData is empty, fall back to the user's provider.
          const fallbackProviders = providerData.length
            ? []
            : [
                {
                  providerId: providerKeyFromProviderId(String(row.provider)),
                  uid: undefined,
                },
              ];

          const toInsert = [...providerData, ...fallbackProviders]
            .map((p) => {
              const provider = normalizeProvider(p.providerId ?? "password");
              const base: any = {
                userId: row.id,
                provider,
                providerUserId: p.uid ?? undefined,
              };

              if (capabilities.providerEmail)
                base.providerEmail = (p as any).email ?? null;
              if (capabilities.providerName)
                base.providerName = (p as any).displayName ?? null;
              if (capabilities.providerPicture)
                base.providerPicture = (p as any).photoURL ?? null;

              return base;
            })
            .filter((r) => r.provider);

          if (toInsert.length === 0) return;

          if (options.dryRun) {
            console.log(
              `[dry-run] user=${row.id} providers=${toInsert.map((x) => x.provider).join(",")}`,
            );
            return;
          }

          // Insert each provider row. Use ON CONFLICT DO NOTHING without target for maximum
          // compatibility with either legacy unique index or the newer partial unique index.
          for (const identity of toInsert) {
            try {
              await withTimeout(
                upsertUserIdentity(drizzleDb, identity as any),
                options.timeoutMs,
                `db.insert user_identity userId=${row.id} provider=${identity.provider}`,
              );
              insertedRows++;
            } catch (e) {
              erroredUsers++;
              console.warn(
                `[sync] upsert failed: user=${row.id} provider=${identity.provider} err=${formatDbError(e)}`,
              );
            }
          }
        },
      );

      syncedUsers += limitedRows.length;
      offset += rows.length;

      console.log(
        `[sync] processed=${syncedUsers} inserted=${insertedRows} notFound=${firebaseNotFound} errors=${erroredUsers}`,
      );

      if (options.limit > 0 && syncedUsers >= options.limit) break;
    }

    console.log(
      `[sync] done processed=${syncedUsers} inserted=${insertedRows} notFound=${firebaseNotFound} errors=${erroredUsers}`,
    );
  } finally {
    // IMPORTANT: Postgres pool is created inside a `useFactory` provider, so Nest does not
    // automatically call `pool.end()` on shutdown. Without this, the Node process can stay alive.
    try {
      await db?.$client?.end();
    } catch (e: any) {
      console.warn("[sync] db.$client.end() warning:", e?.message ?? e);
    }

    try {
      await app.close();
    } catch (e: any) {
      // Best-effort shutdown; some providers may already be closed.
      console.warn("[sync] app.close() warning:", e?.message ?? e);
    }

    if (options.forceExit) {
      process.exit(0);
    }
  }
}

main().catch((err) => {
  console.error("[sync] failed", err);
  process.exit(1);
});
