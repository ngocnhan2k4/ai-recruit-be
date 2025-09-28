export class RefreshToken {
  id: number;
  userId: number;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  revoked: boolean;
}
