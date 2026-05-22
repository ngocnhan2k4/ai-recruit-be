import { Module } from "@nestjs/common";
import { DeploymentUseCases } from "./deployment.use-case";
import { SshModule } from "@/frameworks/ssh/ssh.module";

@Module({
  imports: [SshModule],
  providers: [DeploymentUseCases],
  exports: [DeploymentUseCases],
})
export class DeploymentUseCasesModule {}
