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
import { isNotNull, sql } from "drizzle-orm";
import { normalizeProvider } from "@/common/utils/firebase";

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
            const message = (e as any)?.message ?? String(e);
            if (message.includes("auth/user-not-found")) {
              firebaseNotFound++;
              console.warn(
                `[sync] Firebase user not found: uid=${firebaseUid}`,
              );
              return;
            }

            erroredUsers++;
            console.warn(
              `[sync] Firebase getUser failed: uid=${firebaseUid} err=${message}`,
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
              return {
                userId: row.id,
                provider,
                providerUserId: p.uid ?? undefined,
                providerEmail: (p as any).email ?? null,
                providerName: (p as any).displayName ?? null,
                providerPicture: (p as any).photoURL ?? null,
              };
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
                drizzleDb
                  .insert(userIdentities)
                  .values(identity)
                  .onConflictDoUpdate({
                    target: [userIdentities.userId, userIdentities.provider],
                    where: sql`${userIdentities.deletedAt} IS NULL`,
                    set: {
                      providerUserId: identity.providerUserId,
                      providerEmail: (identity as any).providerEmail,
                      providerName: (identity as any).providerName,
                      providerPicture: (identity as any).providerPicture,
                      updatedAt: new Date(),
                    } as any,
                  }),
                options.timeoutMs,
                `db.insert user_identity userId=${row.id} provider=${identity.provider}`,
              );
              insertedRows++;
            } catch (e) {
              erroredUsers++;
              const message = (e as any)?.message ?? String(e);
              console.warn(
                `[sync] insert failed: user=${row.id} provider=${identity.provider} err=${message}`,
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
