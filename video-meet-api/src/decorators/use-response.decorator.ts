import { SetMetadata, UseInterceptors, applyDecorators } from '@nestjs/common';
import { PlainToResponseInterceptor } from '../interceptors/plain-to-response.interceptor';

export const UseResponse = (responceClass) => {
  return applyDecorators(
    SetMetadata('response-class', responceClass),
    UseInterceptors(PlainToResponseInterceptor),
  );
};
