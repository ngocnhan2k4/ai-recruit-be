import { Module } from "@nestjs/common";
import * as admin from "firebase-admin";
import { FireBaseAuthService } from "./firebase-auth-services.service";
import { IAuthService } from "@/core";
import { JwtModule } from "@nestjs/jwt";
import { FIREBASE_ADMIN } from "@/common/constants";
import { ConfigService } from "@nestjs/config";

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: configService.get<string>(
            "JWT_EXPIRES_IN",
          ) as unknown as number,
        },
      }),
    }),
  ],
  providers: [
    {
      provide: FIREBASE_ADMIN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return admin.initializeApp({
          credential: admin.credential.cert({
            projectId: configService.get<string>("FIREBASE_PROJECT_ID"),
            clientEmail: configService.get<string>("FIREBASE_CLIENT_EMAIL"),
            privateKey: configService.get<string>("FIREBASE_PRIVATE_KEY"),
          }),
          storageBucket: configService.get<string>("FIREBASE_STORAGE_BUCKET"),
        });
      },
    },
    {
      provide: IAuthService,
      useClass: FireBaseAuthService,
    },
  ],
  exports: [IAuthService],
})
export class FireBaseAuthServicesModule {}
