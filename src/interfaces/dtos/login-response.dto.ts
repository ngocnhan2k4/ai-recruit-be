import { User } from "../../core/entities/user.entity";
export class LoginResponseDto{
    accessToken: string;
    refreshToken: string;
    user: User;

    constructor(accessToken: string, refreshToken: string, user: User){
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.user = user;
    }
}