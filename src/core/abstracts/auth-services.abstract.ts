import { RoleEnum } from "@/common/constants";

export abstract class IAuthService {
  abstract verifyIdToken(idToken: string): Promise<{
    uid: string;
    email?: string;
    name?: string;
    picture?: string;
    provider_id?: string;
    firebase?: {
      identities: {
        "google.com"?: string[];
        "facebook.com"?: string[];
        "github.com"?: string[];
      };
    };
    roles?: RoleEnum[];
  }>;
  abstract signJwt(payload: any): string;
  abstract overlapUserClaims(uid: string, claims: any): Promise<any>;
  abstract customTokenWithClaims(uid: string, claims: any): Promise<string>;
  abstract updateUserClaims(uid: string, claims: any): Promise<void>;
}
