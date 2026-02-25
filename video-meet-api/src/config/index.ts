import { databaseConfig } from './db/database.config';
import { validationPipeConfig } from './validation-pipe.config';
import { openviduConfig } from './openvidu.config';

export const envFilePath = (): string => '.env';

export default () => ({
  databaseConfig,
  validation: validationPipeConfig,
  openvidu: openviduConfig,
});
