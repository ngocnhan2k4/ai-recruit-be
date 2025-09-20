import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERM_KEY } from "@/common/constants/constants";
import { CasbinService } from "../casbin/casbin.service";

@Injectable()
export class CasbinGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly casbinService: CasbinService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();
        const user = req.user;
        const meta = this.reflector.getAllAndOverride<{ obj: string; act: string }>(PERM_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!meta) {
            return true;
        }

        const ok = await this.casbinService.can(user.roles, meta.obj, meta.act);
        if (!ok) {
            throw new ForbiddenException("You don't have permission to access this resource");
        }

        return true;
    }
}