import { RoleEnum } from "@/common/constants/roles";

export abstract class IAuthService {
  abstract verifyIdToken(idToken: string): Promise<{
    uid: string;
    email?: string;
    name?: string;
    picture?: string;
    provider_id?: string;
    roles?: RoleEnum[];
  }>;
  abstract signJwt(payload: any): string;
}
