import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Injectable } from '@nestjs/common';
import { JwtUserPayloadDto } from '../dto/jwt-user-payload.dto';
import { JwtPayload } from './jwt.strategy';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../../entities/user.entity';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET_KEY'),
      passReqToCallback: false,
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtUserPayloadDto> {
    const user = await this.usersRepository.findOneBy({ id: payload.sub });
    if (!user) {
      throw new Error('User not found');
    }
    return { id: payload.sub };
  }
}
