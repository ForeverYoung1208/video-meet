import { IsString, IsObject, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum WebhookEventType {
  ROOM_STARTED = 'room_started',
  ROOM_ENDED = 'room_ended',
  PARTICIPANT_JOINED = 'participant_joined',
  PARTICIPANT_LEFT = 'participant_left',
  TRACK_PUBLISHED = 'track_published',
  TRACK_UNPUBLISHED = 'track_unpublished',
  TRACK_SUBSCRIBED = 'track_subscribed',
  TRACK_UNSUBSCRIBED = 'track_unsubscribed',
}

export class WebhookEventDto {
  @ApiProperty({
    description: 'The type of webhook event',
    enum: WebhookEventType,
  })
  @IsEnum(WebhookEventType)
  event!: WebhookEventType;

  @ApiProperty({
    description: 'The room where the event occurred',
  })
  @IsString()
  room!: string;

  @ApiProperty({
    description: 'The participant involved in the event (if applicable)',
    required: false,
  })
  @IsOptional()
  @IsString()
  participant?: string;

  @ApiProperty({
    description: 'Additional event data',
    required: false,
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiProperty({
    description: 'Timestamp when the event occurred',
  })
  @IsString()
  timestamp!: string;

  @ApiProperty({
    description: 'Unique ID for this webhook event',
  })
  @IsString()
  id!: string;
}

export class WebhookResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'ok',
  })
  @IsString()
  status!: string;

  @ApiProperty({
    description: 'Response message',
    example: 'Webhook received successfully',
    required: false,
  })
  @IsOptional()
  @IsString()
  message?: string;
}
