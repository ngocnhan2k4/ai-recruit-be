import { Module } from "@nestjs/common";
import { AuthUseCases } from "./auth.use-case";
import { AuthServicesModule } from "@/services/auth-services/auth-services.module";
import { DataServicesModule } from "@/services/data-services/data-services.module";
@Module({
    imports: [AuthServicesModule, DataServicesModule],
    providers: [AuthUseCases],
    exports: [AuthUseCases],
})
export class AuthUseCasesModule {}