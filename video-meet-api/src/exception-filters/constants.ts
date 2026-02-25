export const EXCEPTION_FILTER_CONFIG_TOKEN = Symbol('ExceptionFilterConfig');

export interface IExceptionFiltersConfig {
  doAttachStack: boolean;
  doLogCommonErrors: boolean;
}

export interface TErrorResponseBody {
  errorCode: string;
  message: string;
  payload?: any;
}
