import { Injectable } from "@nestjs/common";
import { ExecutionContext } from "@nestjs/common";
import { CasbinGuard } from "./casbin.guard";

@Injectable()
export class SystemAuthorizeGuard extends CasbinGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    return super.authorizeSystem(context);
  }
}
