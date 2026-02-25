import { ErrorCodes } from '../constants/system';
import { ICustomException } from './types';

export class AccessCommonException extends Error implements ICustomException {
  getStatus = () => 400;
  errorCode = ErrorCodes.ACCESS_ERROR;
  constructor(public message = 'Access error') {
    super(message);
  }
}

export class AccessForbiddenException extends AccessCommonException {
  getStatus = () => 403;
  constructor(public message = 'Access forbidden') {
    super(message);
  }
}

export class AccessUnauthorizedException extends AccessCommonException {
  getStatus = () => 401;
  constructor(public message = 'Unauthorized') {
    super(message);
  }
}

export class AccessNotFoundException extends AccessCommonException {
  getStatus = () => 404;
  constructor(public message = 'Access data not found') {
    super(message);
  }
}

export class AccessTokenGenerationException extends AccessCommonException {
  getStatus = () => 400;
  constructor(public message = 'Token generation error') {
    super(message);
  }
}
