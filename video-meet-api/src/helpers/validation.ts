import { validate, ValidateNested, ValidationError } from 'class-validator';
import { ValidationException } from '../exceptions/validation-exception';
import { ClassConstructor, plainToInstance, Type } from 'class-transformer';
import { validationPipeConfig } from '../config/validation-pipe.config';

export type ValidationErrorDetail = {
  [property: string]: string[] | ValidationErrorDetail[] | string;
};
export type ValidationExceptionPayload = ValidationErrorDetail[];

export const validationExceptionFactory = (errors: ValidationError[]) => {
  function getDetails(error: ValidationError): ValidationErrorDetail {
    if (error?.children?.length) {
      return { [error.property]: error.children.map((e) => getDetails(e)) };
    }
    return {
      [error.property]: error.constraints
        ? Object.values(error.constraints)
        : [],
    };
  }

  function makePayload(errors: ValidationError[]): ValidationExceptionPayload {
    return errors.reduce((arr, e) => {
      arr.push(getDetails(e));
      return arr;
    }, [] as ValidationExceptionPayload);
  }

  return new ValidationException(makePayload(errors));
};

export const validateArrayWithClassValidator = async <T>(
  items: T[],
  validateClass: ClassConstructor<T>,
): Promise<void> => {
  // wrap results into single dto with array property 'data' to leverage class-validator ability to iterate over arrays
  class ValidateDto {
    @ValidateNested({ each: true })
    @Type(() => validateClass)
    data!: T[];
  }

  const dto = plainToInstance(ValidateDto, { data: items });
  const errors = await validate(dto, validationPipeConfig);

  // unwrap first level of errors (corresponding to the property 'data') to return validation errors (if any) for each item of the property 'data'
  if (errors[0]?.children?.length) {
    const err = validationExceptionFactory(errors[0].children);
    throw err;
  }
};
