import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class RoomTokenResponseDto {
  @Expose()
  @ApiProperty({
    description: 'Participant identity',
    example: 'user123',
  })
  @IsString()
  identity!: string;

  @Expose()
  @ApiProperty({
    description: 'JWT token for accessing the room',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  token!: string;
}
