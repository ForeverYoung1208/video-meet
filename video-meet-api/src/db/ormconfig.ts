import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../config/db/data-source-options.config';
import { ConfigModule } from '@nestjs/config';
import { envFilePath } from '../config';

// this is needed for DataSource to work properly independently of the application (as part of CLI tool, for example migration:generate)
void ConfigModule.forRoot({
  isGlobal: true,
  load: [dataSourceOptions],
  envFilePath: envFilePath(),
});

export default new DataSource(dataSourceOptions());
