export class RefreshToken {
    id: number;
    userId: number;
    token: string;
    expiresAt: Date;
    createdAt: Date;
    revoked: boolean;
    constructor({userId, token, expiresAt, createdAt, revoked}: 
        {userId: number; token: string; expiresAt: Date; createdAt: Date; revoked: boolean;}) {
        this.userId = userId;
        this.token = token;
        this.expiresAt = expiresAt;
        this.createdAt = createdAt;
        this.revoked = revoked;
    }
}