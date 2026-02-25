import { ValidationPipeOptions } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { ValidationException } from '../exceptions/validation-exception';
import { ValidationErrorDetail } from '../helpers/validation';

export const validationPipeConfig: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  errorHttpStatusCode: 422,
  exceptionFactory(errors: ValidationError[]) {
    return new ValidationException(
      errors.reduce((arr: ValidationErrorDetail[], e) => {
        arr.push(getDetails(e));
        return arr;
      }, []),
    );
  },
};

const getDetails = (err: ValidationError): ValidationErrorDetail => {
  if (err?.children?.length) {
    return { [err.property]: err.children.map((e) => getDetails(e)) };
  }
  return { [err.property]: Object.values(err.constraints || {}) };
};
