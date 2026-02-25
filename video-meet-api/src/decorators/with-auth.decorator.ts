import {
  applyDecorators,
  CanActivate,
  UseGuards,
  Type,
  SetMetadata,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../modules/auth/guard/jwt-auth.guard';
import { Roles } from '../constants/system';
import { RolesGuard } from '../modules/auth/guard/roles.guard';

/**
 * Auth decorator, provides accessToken validation
 */
export const WithAuth = (roles?: Roles[]) => {
  const guards: Array<Type<CanActivate>> = [JwtAuthGuard];
  if (roles?.length) {
    guards.push(RolesGuard);
  }
  return applyDecorators(
    ApiBearerAuth(),
    ApiResponse({
      status: 401,
      description: 'Access token has expired, need to refresh or not exists',
    }),
    SetMetadata('roles', roles),
    UseGuards(...guards),
  );
};
