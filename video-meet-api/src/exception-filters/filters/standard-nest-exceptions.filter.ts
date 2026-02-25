import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotAcceptableException,
  UnprocessableEntityException,
  NotFoundException,
} from '@nestjs/common';
import { TErrorResponseBody } from '../types';
import { ICustomException } from '../../exceptions/types';
import { ErrorCodes } from '../../constants/system';

@Catch(
  // built-in http exceptions
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  NotAcceptableException,
  UnprocessableEntityException,
)
@Injectable()
export class StandardNestExceptionsFilter implements ExceptionFilter {
  catch(error: ICustomException | HttpException, host: ArgumentsHost): void {
    let errorCode: ErrorCodes = ErrorCodes.COMMON_ERROR_WITH_MESSAGE;
    if ('errorCode' in error && error.errorCode) {
      errorCode = error.errorCode;
    }

    const errorResponseBody: TErrorResponseBody = {
      errorCode,
      message: error.message || 'Common error with message',
    };
    if ('payload' in error && error.payload) {
      errorResponseBody.payload = error.payload;
    }

    const contextType = host.getType();

    if (contextType !== 'http') {
      throw new Error(JSON.stringify(errorResponseBody));
    }

    host
      .switchToHttp()
      .getResponse()
      .status(error.getStatus() || HttpStatus.BAD_REQUEST)
      .json(errorResponseBody);
  }
}
