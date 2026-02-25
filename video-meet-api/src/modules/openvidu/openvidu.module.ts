import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenViduService } from './openvidu.service';
import { OpenViduController } from './openvidu.controller';

@Module({
  imports: [ConfigModule],
  controllers: [OpenViduController],
  providers: [OpenViduService],
  exports: [OpenViduService],
})
export class OpenViduModule {}
