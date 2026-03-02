import { Inject, Injectable } from "@nestjs/common";
import * as admin from "firebase-admin";
import { IAuthService } from "@/core";
import { JwtService } from "@nestjs/jwt";
import { FIREBASE_ADMIN, RoleEnum } from "@/common/constants";
@Injectable()
export class FireBaseAuthService implements IAuthService {
  constructor(
    @Inject(FIREBASE_ADMIN) private readonly firebaseApp: admin.app.App,
    private readonly jwtService: JwtService,
  ) {}
  async verifyIdToken(idToken: string): Promise<{
    uid: string;
    email?: string;
    name?: string;
    picture?: string;
    provider_id?: string;
    roles?: RoleEnum[];
    emailVerified?: boolean;
  }> {
    const decodedToken = await this.firebaseApp.auth().verifyIdToken(idToken);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
      provider_id:
        decodedToken.provider_id || decodedToken.firebase.sign_in_provider,
      roles: (decodedToken as any).roles || [RoleEnum.USER],
      emailVerified: decodedToken.email_verified,
    };
  }

  signJwt(payload: any): string {
    const accessToken = this.jwtService.sign(payload as object);
    return accessToken;
  }

  async updateUserClaims(
    uid: string,
    claims: { roles: RoleEnum[] },
  ): Promise<void> {
    const newClaims = await this.overlapUserClaims(uid, claims);
    await this.firebaseApp.auth().setCustomUserClaims(uid, newClaims);
  }

  async overlapUserClaims(uid: string, claims: any): Promise<any> {
    const user = await this.firebaseApp.auth().getUser(uid);
    const currentClaims = user.customClaims || {};
    for (const key in claims) {
      currentClaims[key] = claims[key];
    }
    return currentClaims;
  }
  async customTokenWithClaims(uid: string, claims: any): Promise<string> {
    const token = await this.firebaseApp.auth().createCustomToken(uid, claims);
    return token;
  }
}
