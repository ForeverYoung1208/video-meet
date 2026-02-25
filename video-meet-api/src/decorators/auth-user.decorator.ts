import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtUserPayloadDto } from '../modules/auth/dto/jwt-user-payload.dto';

export const AuthUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtUserPayloadDto => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
