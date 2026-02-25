export interface IExceptionFiltersConfig {
  doAttachStack: boolean;
  doLogCommonErrors: boolean;
}

export interface TErrorResponseBody {
  errorCode: string;
  message: string;
  payload?: any;
}
