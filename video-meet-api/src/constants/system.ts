export const ENV_LOCAL = 'local';
export const ENV_DEV = 'development';
export const ENV_STAGE = 'staging';
export const ENV_PROD = 'production';
export const ENV_TEST = 'test';

export enum ErrorCodes {
  UNKNOWN_ERROR = 'unknown-error',
  VALIDATION_FAILED = 'validation-failed',
  COMMON_ERROR_WITH_MESSAGE = 'common-error-with-message',
  DATA_PROCESSING_ERROR = 'data-processing-error',
  DATABASE_SERVER_ERROR = 'database-server-error',
  ACCESS_ERROR = 'access-error',
}

export enum Roles {
  ADMIN = 'admin',
  USER = 'user',
}
