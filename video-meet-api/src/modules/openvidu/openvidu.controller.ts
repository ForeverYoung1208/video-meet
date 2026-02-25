import {
  Controller,
  Post,
  Logger,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { OpenViduService } from './openvidu.service';
import { WebhookResponseDto } from './dto/webhook-event.dto';

@ApiTags('OpenVidu Webhooks')
@Controller('openvidu')
export class OpenViduController {
  private readonly logger = new Logger(OpenViduController.name);

  constructor(private readonly openViduService: OpenViduService) {}

  @ApiOperation({
    summary: 'Receive LiveKit webhook events',
    description:
      'Endpoint for receiving webhook events from LiveKit/OpenVidu server',
  })
  @ApiHeader({
    name: 'LiveKit-Webhook-Id',
    description: 'Unique identifier for the webhook',
    required: true,
  })
  @ApiHeader({
    name: 'LiveKit-Webhook-Timestamp',
    description: 'Timestamp when the webhook was sent',
    required: true,
  })
  @ApiHeader({
    name: 'LiveKit-Webhook-Signature',
    description: 'HMAC signature for webhook verification',
    required: true,
  })
  @ApiBody({
    description: 'Raw webhook event payload',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed successfully',
    type: WebhookResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid webhook signature or malformed payload',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error while processing webhook',
  })
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers() headers: Record<string, string>,
    @Body() rawBody: string,
  ): Promise<WebhookResponseDto> {
    this.logger.log('Received webhook request');

    if (!rawBody) {
      this.logger.error('Webhook request body is empty');
      throw new Error('Webhook request body is required');
    }

    try {
      const result = await this.openViduService.processWebhook(
        rawBody,
        headers,
      );

      this.logger.log('Webhook processed successfully');
      return result;
    } catch (error) {
      this.logger.error('Failed to process webhook:', error);
      throw error;
    }
  }
}
