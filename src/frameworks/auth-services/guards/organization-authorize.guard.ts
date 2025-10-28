import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { CasbinGuard } from "./casbin.guard";

@Injectable()
export class OrganizationAuthorizeGuard extends CasbinGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    return super.authorizeOrganization(context);
  }
}
