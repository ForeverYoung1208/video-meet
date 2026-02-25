import {
  Controller,
  Get,
  Post,
  Param,
  Logger,
  UseGuards,
  Body,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { RoomTokenResponseDto } from './responses/token.response';
import { MeetingResponse } from './responses/meeting.response';
import { AuthUser } from '../../decorators/auth-user.decorator';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { UseResponse } from '../../decorators/use-response.decorator';
import { Meeting } from '../../entities/meeting.entity';
import { WithAuth } from '../../decorators/with-auth.decorator';
import { Roles } from '../../constants/system';
import { JwtUserPayloadDto } from '../auth/dto/jwt-user-payload.dto';

@ApiTags('Meetings')
@Controller('meetings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MeetingsController {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(private readonly meetingsService: MeetingsService) {}

  @ApiOperation({ summary: 'Create a new meeting (Admin only)' })
  @ApiBody({ type: CreateMeetingDto })
  @ApiCreatedResponse({ type: MeetingResponse })
  @ApiForbiddenResponse({ description: 'Admin access required' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @WithAuth([Roles.ADMIN])
  @UseResponse(MeetingResponse)
  @Post()
  async create(
    @Body() createMeetingDto: CreateMeetingDto,
    @AuthUser() user: JwtUserPayloadDto,
  ): Promise<Meeting> {
    return this.meetingsService.create(createMeetingDto, user);
  }

  @ApiOperation({ summary: 'Get all meetings - ' })
  @ApiOkResponse({ type: [MeetingResponse] })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @UseResponse(MeetingResponse)
  @WithAuth()
  @Get()
  async findAll(): Promise<Meeting[]> {
    return this.meetingsService.findAll();
  }

  @ApiOperation({ summary: 'Get meeting by ID' })
  @ApiOkResponse({ type: MeetingResponse })
  @ApiNotFoundResponse({ description: 'Meeting not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @UseResponse(MeetingResponse)
  @WithAuth()
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Meeting> {
    return this.meetingsService.findOne(id);
  }

  @ApiOperation({ summary: 'End a meeting (Admin or creator only)' })
  @ApiOkResponse({ type: MeetingResponse })
  @ApiNotFoundResponse({ description: 'Meeting not found' })
  @ApiForbiddenResponse({ description: 'Admin or creator access required' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @WithAuth()
  @UseResponse(MeetingResponse)
  @Post(':id/end')
  async endMeeting(
    @Param('id') id: string,
    @AuthUser() user: JwtUserPayloadDto,
  ): Promise<Meeting> {
    return this.meetingsService.endMeeting(id, user);
  }

  @ApiOperation({
    summary: 'Generate tokens for participants to join a meeting',
  })
  @ApiOkResponse({ type: RoomTokenResponseDto })
  @ApiNotFoundResponse({ description: 'Meeting not found' })
  @ApiForbiddenResponse({ description: 'Cannot join this meeting' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @WithAuth()
  @UseResponse(RoomTokenResponseDto)
  @Get(':id/room-token')
  async generateTokensForParticipants(
    @Param('id') id: string,
    @AuthUser() user: JwtUserPayloadDto,
  ): Promise<RoomTokenResponseDto> {
    return this.meetingsService.generateTokensForParticipants(id, user);
  }
}
