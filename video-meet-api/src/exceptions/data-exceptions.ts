import { ErrorCodes } from '../constants/system';
import { ICustomException } from './types';

export class DataException extends Error implements ICustomException {
  getStatus = () => 400;
  errorCode = ErrorCodes.DATA_PROCESSING_ERROR;
  constructor(public message = 'Data error') {
    super(message);
  }
}

export class DataProcessingException extends DataException {
  getStatus = () => 400;
  constructor(public message = 'Data processing error') {
    super(message);
  }
}

export class DataNotFoundException extends DataException {
  getStatus = () => 404;
  constructor(public message = 'Data not found') {
    super(message);
  }
}

export class DataNotAcceptableException extends DataException {
  getStatus = () => 406;
  constructor(public message = 'Data not acceptable') {
    super(message);
  }
}

export class DataConflictException extends DataException {
  getStatus = () => 409;
  constructor(public message = 'Data conflicted') {
    super(message);
  }
}
