import {
  Controller,
  Get,
  Post,
  Param,
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { RecordingsService } from './recordings.service';
import { RecordingResponse } from './dto/recording-response.dto';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { UseResponse } from '../../decorators/use-response.decorator';
import { User } from '../../entities/user.entity';
import { Recording } from '../../entities/recording.entity';

@ApiTags('Recordings')
@Controller('recordings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RecordingsController {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(private readonly recordingsService: RecordingsService) {}

  @ApiOperation({
    summary: 'Start recording for a meeting (Admin or creator only)',
  })
  @ApiCreatedResponse({ type: RecordingResponse })
  @ApiNotFoundResponse({ description: 'Meeting not found' })
  @ApiForbiddenResponse({ description: 'Admin or creator access required' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @UseResponse(RecordingResponse)
  @Post(':meetingId/start')
  async startRecording(
    @Param('meetingId') meetingId: string,
    @AuthUser() user: User,
  ): Promise<Recording> {
    return this.recordingsService.startRecording(meetingId, user);
  }

  @ApiOperation({
    summary: 'Stop recording for a meeting (Admin or creator only)',
  })
  @ApiOkResponse({ type: RecordingResponse })
  @ApiNotFoundResponse({ description: 'Recording not found' })
  @ApiForbiddenResponse({ description: 'Admin or creator access required' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @UseResponse(RecordingResponse)
  @Post(':meetingId/stop')
  async stopRecording(
    @Param('meetingId') meetingId: string,
    @AuthUser() user: User,
  ): Promise<Recording> {
    return this.recordingsService.stopRecording(meetingId, user);
  }

  @ApiOperation({
    summary: 'Get all recordings (Admin sees all, users see their own)',
  })
  @ApiOkResponse({ type: [RecordingResponse] })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @UseResponse(RecordingResponse)
  @Get()
  async findAll(@AuthUser() user: User): Promise<Recording[]> {
    return this.recordingsService.findAll(user);
  }

  @ApiOperation({ summary: 'Get recording by ID' })
  @ApiOkResponse({ type: RecordingResponse })
  @ApiNotFoundResponse({ description: 'Recording not found' })
  @ApiForbiddenResponse({ description: 'Access denied' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @UseResponse(RecordingResponse)
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @AuthUser() user: User,
  ): Promise<Recording> {
    return this.recordingsService.findOne(id, user);
  }
}
