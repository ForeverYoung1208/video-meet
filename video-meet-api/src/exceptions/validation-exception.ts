import { ValidationExceptionPayload } from '../helpers/validation';
import { ICustomException } from './types';

// Exception for validation errors. Thrown by class-validator. Do not throw this exception manually.
export class ValidationException extends Error implements ICustomException {
  getStatus = () => 422;
  constructor(
    public payload: ValidationExceptionPayload,
    public message = 'Validation failed',
  ) {
    super(message);
  }
}
