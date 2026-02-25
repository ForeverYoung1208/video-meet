import { Controller, Get, Logger, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { AuthDto } from './dto/auth.dto';
import { PasswordAuthGuard } from './guard/password-auth.guard';
import { ResponseTokenDto } from './dto/response-token.dto';
import { JwtUserPayloadDto } from './dto/jwt-user-payload.dto';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { JwtRefreshAuthGuard } from './guard/jwt-refresh-auth.guard';
import { UseResponse } from '../../decorators/use-response.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  protected readonly logger = new Logger(this.constructor.name);
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'SignIn user' })
  @ApiBody({ type: AuthDto })
  @ApiOkResponse({ type: ResponseTokenDto })
  @UseResponse(ResponseTokenDto)
  @UseGuards(PasswordAuthGuard)
  @Post('signin')
  async signin(@AuthUser() user: JwtUserPayloadDto): Promise<ResponseTokenDto> {
    return this.authService.signin(user);
  }

  @ApiOperation({
    summary: 'Refresh access_token and refresh_token with refresh token',
  })
  @ApiOkResponse({ type: ResponseTokenDto })
  @ApiForbiddenResponse({ description: 'access denied' })
  @ApiUnauthorizedResponse({ description: 'invalid refresh token' })
  @ApiBearerAuth()
  @UseResponse(ResponseTokenDto)
  @UseGuards(JwtRefreshAuthGuard)
  @Get('refresh')
  async refresh(
    @AuthUser() user: JwtUserPayloadDto,
  ): Promise<ResponseTokenDto> {
    return this.authService.refresh(user);
  }
}
