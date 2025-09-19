import { User } from "../../core/entities/user.entity";
export class LoginResponseDto{
    accessToken: string;
    user: User | null;

    constructor(accessToken: string, user: User | null){
        this.accessToken = accessToken;
        this.user = user;
    }
}