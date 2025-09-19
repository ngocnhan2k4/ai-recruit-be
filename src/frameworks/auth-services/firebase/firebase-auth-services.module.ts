import {Module} from "@nestjs/common";
import * as admin from "firebase-admin";
import {FireBaseAuthServices} from "./firebase-auth-services.service";
import { IAuthServices } from "@/core";
import { JwtModule } from "@nestjs/jwt";
import { FIREBASE_ADMIN } from "@/common/constants/constants";

@Module({
    imports:[JwtModule.register({
        secret: process.env.JWT_SECRET,
        signOptions: {expiresIn: process.env.JWT_EXPIRES_IN},
    })],
    providers:[{
        provide: FIREBASE_ADMIN,
        useFactory: () =>{
            return admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                })
            });
        }
    },
    {
        provide: IAuthServices,
        useClass: FireBaseAuthServices
    }],
    exports:[IAuthServices],
})
export class FireBaseAuthServicesModule {}