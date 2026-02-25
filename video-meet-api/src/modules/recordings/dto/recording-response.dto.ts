import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { MeetingResponse } from '../../meetings/responses/meeting.response';

@Exclude()
export class RecordingResponse {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  s3Url!: string;

  @ApiProperty()
  @Expose()
  duration!: number;

  @ApiProperty({
    enum: ['processing', 'ready', 'failed'],
  })
  @Expose()
  status!: 'processing' | 'ready' | 'failed';

  @ApiProperty()
  @Expose()
  meetingId!: string;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  @Type(() => MeetingResponse)
  meeting!: MeetingResponse;
}
