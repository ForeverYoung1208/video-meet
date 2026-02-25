import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { TErrorResponseBody } from '../types';
import { AccessCommonException } from '../../exceptions/access-exceptions';
import { ICustomException } from '../../exceptions/types';
import { ErrorCodes } from '../../constants/system';

@Catch(AccessCommonException)
@Injectable()
export class CommonErrorsWithMessageFilter implements ExceptionFilter {
  catch(error: ICustomException | HttpException, host: ArgumentsHost): void {
    let errorCode: ErrorCodes = ErrorCodes.ACCESS_ERROR;
    if ('errorCode' in error && error.errorCode) {
      errorCode = error.errorCode;
    }

    const errorResponseBody: TErrorResponseBody = {
      errorCode,
      message: error.message || 'Access error with message',
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
