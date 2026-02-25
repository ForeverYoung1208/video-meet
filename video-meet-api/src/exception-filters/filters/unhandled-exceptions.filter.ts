import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { TErrorResponseBody } from '../types';

@Catch()
@Injectable()
export class UnhandledExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(this.constructor.name);

  catch(exception: Error, host: ArgumentsHost): void {
    const errorResponseBody: TErrorResponseBody = {
      errorCode: 'UNKNOWN_ERROR',
      message: exception.message || 'Unhandled error',
      payload: exception.stack,
    };

    this.logger.error({
      method: host.switchToHttp().getRequest().method,
      path: host.switchToHttp().getRequest().url,
      errorResponseBody,
      stack: exception.stack,
    });

    const contextType = host.getType();

    if (contextType !== 'http') {
      throw new Error(JSON.stringify(errorResponseBody));
    }

    host
      .switchToHttp()
      .getResponse()
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(errorResponseBody);
  }
}
