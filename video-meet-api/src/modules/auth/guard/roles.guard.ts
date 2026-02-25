import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from '../../users/users.service';
import { Roles } from '../../../constants/system';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.get<Roles[]>('roles', context.getHandler());
    const request = context.switchToHttp().getRequest();
    const userPartialId: { id: string } = request.user;
    const hasRole = await this.usersService.hasRole(userPartialId.id, roles);

    return hasRole;
  }
}
