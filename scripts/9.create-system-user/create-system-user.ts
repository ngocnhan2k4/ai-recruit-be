/**
 * Create a system user account (Firebase + Postgres + Casbin + FREE subscription).
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/9.create-system-user/create-system-user.ts \
 *     --email=admin@example.com \
 *     --password='YourStrongPass1!' \
 *     --name="System Admin" \
 *     --role=ADMIN
 *
 * Roles: USER | ADMIN | SUPER_ADMIN | MODERATOR
 *
 * Optional:
 *   --username=system.admin
 *   --dry-run=true
 *   --force-exit=true
 */
import { NestFactory } from "@nestjs/core";
import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { ConfigModule } from "@nestjs/config";
import type * as admin from "firebase-admin";
import { eq } from "drizzle-orm";
import { FIREBASE_ADMIN, RoleEnum } from "@/common/constants";
import { generateUsername } from "@/common/utils";
import { PostgresDataServicesModule } from "@/frameworks/data-services/postgres/postgres-data-services.module";
import { FireBaseAuthServicesModule } from "@/frameworks/auth-services/firebase/firebase-auth-services.module";
import { CasbinModule } from "@/frameworks/auth-services/casbin/casbin.module";
import { CasbinService } from "@/frameworks/auth-services/casbin/casbin.service";
import {
  users,
  userIdentities,
  subscriptions,
  userSubscriptions,
  subscriptionFeatures,
  userFeatureUsages,
} from "@/frameworks/data-services/postgres/models";
import type { DBDrizzle } from "@/frameworks/data-services/postgres/types";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", ".env.development", ".env.production"],
    }),
    CacheModule.register({ isGlobal: true }),
    PostgresDataServicesModule,
    FireBaseAuthServicesModule,
    CasbinModule,
  ],
})
class CreateSystemUserModule {}

type Options = {
  email: string;
  password: string;
  name: string;
  role: RoleEnum;
  username?: string;
  dryRun: boolean;
  forceExit: boolean;
};

const ALLOWED_ROLES = new Set<string>([
  RoleEnum.USER,
  RoleEnum.ADMIN,
  RoleEnum.SUPER_ADMIN,
  RoleEnum.MODERATOR,
]);

const parseArgs = (): Options => {
  const args = new Map<string, string>();
  for (const raw of process.argv.slice(2)) {
    const eqIdx = raw.indexOf("=");
    if (!raw.startsWith("--")) continue;
    if (eqIdx === -1) {
      args.set(raw, "true");
    } else {
      args.set(raw.slice(0, eqIdx), raw.slice(eqIdx + 1));
    }
  }

  const email = args.get("--email")?.trim();
  const password = args.get("--password");
  const name = args.get("--name")?.trim() || "System User";
  const roleRaw = (args.get("--role") || RoleEnum.ADMIN).toUpperCase();

  if (!email) {
    throw new Error("Missing --email=...");
  }
  if (!password || password.length < 6) {
    throw new Error("Missing/invalid --password=... (min 6 chars)");
  }
  if (!ALLOWED_ROLES.has(roleRaw)) {
    throw new Error(
      `Invalid --role=${roleRaw}. Allowed: ${[...ALLOWED_ROLES].join(", ")}`,
    );
  }

  return {
    email,
    password,
    name,
    role: roleRaw as RoleEnum,
    username: args.get("--username")?.trim() || undefined,
    dryRun: (args.get("--dry-run") ?? "false") === "true",
    forceExit: (args.get("--force-exit") ?? "true") === "true",
  };
};

async function ensureFreeSubscription(db: DBDrizzle, userId: string) {
  const [freeSub] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.name, "FREE" as any))
    .limit(1);

  if (!freeSub) {
    console.warn("[create-user] FREE subscription not found — skip sub/usage");
    return;
  }

  await db
    .insert(userSubscriptions)
    .values({
      userId,
      subscriptionId: freeSub.id,
      status: "active",
    })
    .onConflictDoNothing();

  const features = await db
    .select({
      featureId: subscriptionFeatures.featureId,
    })
    .from(subscriptionFeatures)
    .where(eq(subscriptionFeatures.subscriptionId, freeSub.id));

  if (features.length === 0) return;

  await db
    .insert(userFeatureUsages)
    .values(
      features.map((f) => ({
        userId,
        featureId: f.featureId,
        usage: 0,
        lastRefillAt: new Date(),
      })),
    )
    .onConflictDoNothing();
}
// bun create:system-user --email=admin@airecruit.software --password='airecruit123@A' --name='CareerLens Admin' --role=SUPER_ADMIN
async function main() {
  const options = parseArgs();
  console.log(
    `[create-user] email=${options.email} name=${options.name} role=${options.role} dryRun=${options.dryRun}`,
  );

  const app = await NestFactory.createApplicationContext(
    CreateSystemUserModule,
    { logger: ["log", "warn", "error"] },
  );

  let db: DBDrizzle | undefined;

  try {
    db = app.get<DBDrizzle>("DRIZZLE");
    const firebaseApp = app.get<admin.app.App>(FIREBASE_ADMIN as any);
    const casbinService = app.get(CasbinService);

    if (options.dryRun) {
      console.log("[create-user] dry-run OK — no changes written");
      return;
    }

    // 1) Firebase Auth user
    let firebaseUser: admin.auth.UserRecord;
    try {
      firebaseUser = await firebaseApp.auth().getUserByEmail(options.email);
      console.log(
        `[create-user] Firebase user already exists uid=${firebaseUser.uid}`,
      );
      await firebaseApp.auth().updateUser(firebaseUser.uid, {
        password: options.password,
        displayName: options.name,
        emailVerified: true,
        disabled: false,
      });
    } catch (e: any) {
      if (e?.code !== "auth/user-not-found") throw e;
      firebaseUser = await firebaseApp.auth().createUser({
        email: options.email,
        password: options.password,
        displayName: options.name,
        emailVerified: true,
        disabled: false,
      });
      console.log(
        `[create-user] Firebase user created uid=${firebaseUser.uid}`,
      );
    }

    await firebaseApp.auth().setCustomUserClaims(firebaseUser.uid, {
      roles: [options.role],
    });

    // 2) Postgres user
    const username =
      options.username || generateUsername(options.name || options.email);

    const existingByEmail = await db
      .select({ id: users.id, firebaseUid: users.firebaseUid })
      .from(users)
      .where(eq(users.email, options.email))
      .limit(1);

    const existingByFirebase = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.firebaseUid, firebaseUser.uid))
      .limit(1);

    let userId: string;

    if (existingByEmail[0] || existingByFirebase[0]) {
      userId = (existingByEmail[0] || existingByFirebase[0]).id;
      await db
        .update(users)
        .set({
          name: options.name,
          username,
          firebaseUid: firebaseUser.uid,
          roles: [options.role],
          emailVerified: true,
          provider: "email",
          status: "active",
        })
        .where(eq(users.id, userId));
      console.log(`[create-user] DB user updated id=${userId}`);
    } else {
      const [created] = await db
        .insert(users)
        .values({
          email: options.email,
          username,
          name: options.name,
          firebaseUid: firebaseUser.uid,
          roles: [options.role],
          emailVerified: true,
          provider: "email",
          status: "active",
          onboardingCompleted: true,
        })
        .returning({ id: users.id });
      userId = created.id;
      console.log(`[create-user] DB user created id=${userId}`);
    }

    // 3) Identity
    await db
      .insert(userIdentities)
      .values({
        userId,
        provider: "email",
        providerUserId: firebaseUser.uid,
        providerEmail: options.email,
        providerName: options.name,
      })
      .onConflictDoNothing();

    // 4) FREE subscription + feature usage
    await ensureFreeSubscription(db, userId);

    // 5) Casbin role
    await casbinService.addRoleForUser(userId, options.role);
    await casbinService.savePolicy();

    console.log("[create-user] done");
    console.log(
      JSON.stringify(
        {
          userId,
          firebaseUid: firebaseUser.uid,
          email: options.email,
          username,
          role: options.role,
        },
        null,
        2,
      ),
    );
  } finally {
    try {
      await db?.$client?.end();
    } catch (e: any) {
      console.warn("[create-user] db end warning:", e?.message ?? e);
    }
    try {
      await app.close();
    } catch (e: any) {
      console.warn("[create-user] app.close warning:", e?.message ?? e);
    }
    if (options.forceExit) process.exit(0);
  }
}

main().catch((err) => {
  console.error("[create-user] failed", err);
  process.exit(1);
});
