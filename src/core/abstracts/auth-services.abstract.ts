export abstract class IAuthServices {
    abstract verifyIdToken(idToken: string): Promise<{ uid: string , email: string, name: string, picture?: string }>;
    abstract signJwt(payload: any): {accessToken: string, refreshToken: string};
}