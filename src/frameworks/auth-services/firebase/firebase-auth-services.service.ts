import { Inject, Injectable } from "@nestjs/common";
import * as admin from "firebase-admin";
import { IAuthServices } from "@/core";
import { JwtService } from "@nestjs/jwt";
import { FIREBASE_ADMIN } from "@/common/constants/response";
@Injectable()
export class FireBaseAuthServices implements IAuthServices {
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
  }> {
    const decodedToken = await this.firebaseApp.auth().verifyIdToken(idToken);

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
      provider_id:
        decodedToken.provider_id || decodedToken.firebase.sign_in_provider,
    };
  }

  signJwt(payload: any): string {
    const accessToken = this.jwtService.sign(payload as object);
    return accessToken;
  }
}
