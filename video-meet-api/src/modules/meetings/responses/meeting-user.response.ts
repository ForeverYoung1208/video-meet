import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class MeetingUserResponse {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  email!: string;

  @ApiProperty()
  @Expose()
  role!: 'admin' | 'user';
}
