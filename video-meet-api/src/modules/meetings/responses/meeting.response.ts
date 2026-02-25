import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { MeetingUserResponse } from './meeting-user.response';

@Exclude()
export class MeetingResponse {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  title!: string;

  @ApiProperty()
  @Expose()
  sessionId!: string;

  @ApiProperty({
    enum: ['active', 'ended', 'recording'],
  })
  @Expose()
  status!: 'active' | 'ended' | 'recording';

  @ApiProperty()
  @Expose()
  @Type(() => MeetingUserResponse)
  createdBy!: MeetingUserResponse;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;
}
