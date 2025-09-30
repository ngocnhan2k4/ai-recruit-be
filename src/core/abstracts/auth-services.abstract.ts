export abstract class IAuthServices {
  abstract verifyIdToken(idToken: string): Promise<{
    uid: string;
    email?: string;
    name?: string;
    picture?: string;
    provider_id?: string;
  }>;
  abstract signJwt(payload: any): string;
}
