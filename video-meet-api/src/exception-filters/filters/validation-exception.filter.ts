import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { TErrorResponseBody } from '../types';
import { ValidationException } from '../../exceptions/validation-exception';
import { ErrorCodes } from '../../constants/system';

@Catch(ValidationException)
@Injectable()
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: ValidationException, host: ArgumentsHost): void {
    const errorResponseBody: TErrorResponseBody = {
      errorCode: ErrorCodes.VALIDATION_FAILED,
      message: 'Validation failed',
      payload: exception.payload,
    };

    const contextType = host.getType();

    if (contextType !== 'http') {
      throw new Error(JSON.stringify(errorResponseBody));
    }

    host
      .switchToHttp()
      .getResponse()
      .status(HttpStatus.UNPROCESSABLE_ENTITY)
      .json(errorResponseBody);
  }
}
