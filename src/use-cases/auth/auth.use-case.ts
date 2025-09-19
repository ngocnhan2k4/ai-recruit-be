import { Injectable } from "@nestjs/common";
import { IAuthServices, User } from "@/core";
import { IDataServices } from "@/core/abstracts/data-services.abstract";
import { LoginResponseDto } from "@/interfaces/dtos";
@Injectable()
export class AuthUseCases {
    constructor(private readonly authService: IAuthServices,
        private readonly dataServices: IDataServices
    ) { }
    async logIn(idToken: string): Promise<LoginResponseDto> {
        const decode = await this.authService.verifyIdToken(idToken);
        let user = await this.dataServices.users.getByField({ firebaseUid: decode.uid });
        if (!user) {
            console.log("Creating new user");
            user = await this.dataServices.users.create(new User({
                email: decode.email,
                name: decode.name,
                avatar: decode.picture,
                firebaseUid: decode.uid,
                roles: ["user"],
                createdAt: new Date(),
                updatedAt: new Date(),
                age: 0
            }));
        } else{
            console.log("User found");
            // Update user info if necessary
        }
        const payload = {
            sub: user ? user.id : 0,
            uid: user ? user.firebaseUid : "",
            roles: user ? user.roles : [],
        };
        const accessToken = this.authService.signJwt(payload);
        console.log("accessToken", accessToken);
        return new LoginResponseDto(accessToken, user);
    }
}