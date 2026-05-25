import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { RoleEnum } from "@/common/constants";
import { TokenPayload } from "@/common/types";
import { UserStatusEnum } from "@/core";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET")!,
      passReqToCallback: true,
    });
  }
  async validate(req: Request, payload: any): Promise<TokenPayload> {
    await Promise.resolve();
    return {
      roles: payload.roles || [RoleEnum.USER],
      userId: payload.userId,
      status: payload.status as UserStatusEnum,
    };
  }
}
