import { HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '../constants/system';

export interface ICustomException {
  getStatus(): HttpStatus; // suggested http status code (may be overriden in the exception filter)
  message: string;
  errorCode?: ErrorCodes; // suggested error code (may be overriden in the exception filter)
  payload?: any;
  stack?: string;
}
