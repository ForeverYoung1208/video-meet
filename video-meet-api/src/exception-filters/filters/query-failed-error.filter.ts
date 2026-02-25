import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { TypeORMError } from 'typeorm';
import { TErrorResponseBody } from '../types';
import { EXCEPTION_FILTER_CONFIG_TOKEN } from '../constants';
import { IExceptionFiltersConfig } from '../types';
import { ErrorCodes } from '../../constants/system';

@Catch(TypeORMError)
@Injectable()
export class QueryFailedErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    @Inject(EXCEPTION_FILTER_CONFIG_TOKEN)
    private readonly exceptionFiltersConfig: IExceptionFiltersConfig,
  ) {}

  catch(exception: TypeORMError, host: ArgumentsHost): void {
    const payload = this.exceptionFiltersConfig.doAttachStack
      ? exception.stack
      : undefined;

    const errorResponseBody: TErrorResponseBody = {
      errorCode: ErrorCodes.DATABASE_SERVER_ERROR,
      message: exception.message || 'Database error',
      payload,
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
