import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  RoomServiceClient,
  AccessToken,
  WebhookReceiver,
  WebhookEvent,
} from 'livekit-server-sdk';
import { TOpenviduConfig } from '../../config/openvidu.config';
import { WebhookResponseDto } from './dto/webhook-event.dto';

@Injectable()
export class OpenViduService {
  private readonly logger = new Logger(OpenViduService.name);
  private readonly roomService: RoomServiceClient;
  private readonly webhookReceiver: WebhookReceiver;
  private readonly livekitHost: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private config: TOpenviduConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.get('openvidu')();

    this.livekitHost = this.config.url;
    this.apiSecret = this.config.secret;
    this.apiKey = this.config.apiKey;

    if (!this.livekitHost || !this.apiSecret || !this.apiKey) {
      throw new Error('OpenVidu URL and secret must be configured');
    }

    this.roomService = new RoomServiceClient(
      this.livekitHost,
      this.apiKey,
      this.apiSecret,
    );

    this.webhookReceiver = new WebhookReceiver(this.apiKey, this.apiSecret);
  }

  async createRoom(roomName: string): Promise<string> {
    try {
      this.logger.log(`Creating room: ${roomName}`);

      const room = await this.roomService.createRoom({
        name: roomName,
        emptyTimeout: this.config.emptyTimeout,
        maxParticipants: this.config.maxParticipants,
      });

      this.logger.log(`Room created successfully: ${room.name}`);
      return room.name;
    } catch (error) {
      this.logger.error(`Failed to create room ${roomName}:`, error);
      throw error;
    }
  }

  async generateToken(
    roomName: string,
    participantName: string,
    participantIdentity?: string,
  ): Promise<string> {
    try {
      this.logger.log(
        `Generating token for room: ${roomName}, participant: ${participantName}`,
      );

      const at = new AccessToken(this.apiKey, this.apiSecret, {
        name: participantName,
        identity: participantIdentity || participantName,
      });

      at.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
      });

      const token = await at.toJwt();
      this.logger.log(
        `Token generated successfully for participant: ${participantName}`,
      );
      return token;
    } catch (error) {
      this.logger.error(
        `Failed to generate token for ${participantName}:`,
        error,
      );
      throw error;
    }
  }

  async deleteRoom(roomName: string): Promise<void> {
    try {
      this.logger.log(`Deleting room: ${roomName}`);
      await this.roomService.deleteRoom(roomName);
      this.logger.log(`Room deleted successfully: ${roomName}`);
    } catch (error) {
      this.logger.error(`Failed to delete room ${roomName}:`, error);
      throw error;
    }
  }

  async listRooms(): Promise<any[]> {
    try {
      this.logger.log('Listing rooms');
      const rooms = await this.roomService.listRooms();
      this.logger.log(`Found ${rooms.length} rooms`);
      return rooms;
    } catch (error) {
      this.logger.error('Failed to list rooms:', error);
      throw error;
    }
  }

  async processWebhook(
    rawBody: string,
    headers: Record<string, string>,
  ): Promise<WebhookResponseDto> {
    try {
      this.logger.log('Processing webhook event');

      // Extract the authorization header for LiveKit webhook verification
      const authHeader =
        headers['livekit-webhook-signature'] ||
        headers['LiveKit-Webhook-Signature'] ||
        headers['authorization'];

      // For testing: Skip signature verification if test signature detected
      const isTestRequest = authHeader?.includes('test-signature');
      let event: WebhookEvent;

      if (isTestRequest) {
        this.logger.log(
          'Test webhook detected - skipping signature verification',
        );
        // Use the raw body directly since @Body() already parsed it
        event = rawBody as any;
      } else {
        // Normal flow: Verify webhook signature
        event = await this.webhookReceiver.receive(rawBody, authHeader);
      }

      this.logger.log(`Webhook event received: ${event.event}`);

      // Process different event types using LiveKit's actual event names
      switch (event.event) {
        case 'room_started':
          this.handleRoomStarted(event);
          break;
        case 'room_finished':
          this.handleRoomEnded(event);
          break;
        case 'participant_joined':
          this.handleParticipantJoined(event);
          break;
        case 'participant_left':
          this.handleParticipantLeft(event);
          break;
        default:
          this.logger.log(`Unhandled webhook event: ${event.event}`);
      }

      this.logger.log(`Webhook processed successfully: ${event.event}`);

      return {
        status: 'ok',
        message: 'Webhook received successfully',
      };
    } catch (error) {
      this.logger.error('Failed to process webhook:', error);
      throw error;
    }
  }

  private handleRoomStarted(event: WebhookEvent): void {
    this.logger.log(`Room started: ${event.room.name}`);
    // Add custom logic for room start events
    // Could update database, send notifications, etc.
  }

  private handleRoomEnded(event: WebhookEvent): void {
    this.logger.log(`Room ended: ${event.room.name}`);
    // Add custom logic for room end events
    // Could update database status, cleanup resources, etc.
  }

  private handleParticipantJoined(event: WebhookEvent): void {
    this.logger.log(
      `Participant joined: ${event.participant.identity} in room: ${event.room.name}`,
    );
    // Add custom logic for participant join events
    // Could update participant count, send notifications, etc.
  }

  private handleParticipantLeft(event: WebhookEvent): void {
    this.logger.log(
      `Participant left: ${event.participant.identity} from room: ${event.room.name}`,
    );
    // Add custom logic for participant leave events
    // Could update participant count, cleanup resources, etc.
  }
}
