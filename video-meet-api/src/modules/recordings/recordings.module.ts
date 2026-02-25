import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecordingsController } from './recordings.controller';
import { RecordingsService } from './recordings.service';
import { Recording } from '../../entities/recording.entity';
import { Meeting } from '../../entities/meeting.entity';
import { OpenViduModule } from '../openvidu/openvidu.module';

@Module({
  imports: [TypeOrmModule.forFeature([Recording, Meeting]), OpenViduModule],
  controllers: [RecordingsController],
  providers: [RecordingsService],
  exports: [RecordingsService],
})
export class RecordingsModule {}
