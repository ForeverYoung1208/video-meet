import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from '../../entities/meeting.entity';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { RoomTokenResponseDto } from './responses/token.response';
import { OpenViduService } from '../openvidu/openvidu.service';
import { Roles } from '../../constants/system';
import { JwtUserPayloadDto } from '../auth/dto/jwt-user-payload.dto';
import { User } from '../../entities/user.entity';

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);

  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly openViduService: OpenViduService,
  ) {}

  async create(
    createMeetingDto: CreateMeetingDto,
    userJwtDto: JwtUserPayloadDto,
  ): Promise<Meeting> {
    this.logger.log(
      `Creating meeting: ${createMeetingDto.title} by user id: ${userJwtDto.id}`,
    );

    // Create OpenVidu session
    const sessionId = await this.openViduService.createRoom(
      createMeetingDto.title,
    );

    // Create meeting record
    const meeting = this.meetingRepository.create({
      title: createMeetingDto.title,
      sessionId,
      createdById: userJwtDto.id,
      status: 'active',
    });

    const savedMeeting = await this.meetingRepository.save(meeting);
    this.logger.log(`Meeting created successfully: ${savedMeeting.id}`);
    return savedMeeting;
  }

  async findAll(): Promise<Meeting[]> {
    this.logger.log('Finding all meetings');
    const meetings = await this.meetingRepository.find({
      relations: ['createdBy'],
    });
    this.logger.log(`Found ${meetings.length} meetings`);
    return meetings;
  }

  async findOne(id: string): Promise<Meeting> {
    this.logger.log(`Finding meeting: ${id}`);
    const meeting = await this.meetingRepository.findOne({
      where: { id },
      relations: ['createdBy', 'recordings'],
    });

    if (!meeting) {
      throw new NotFoundException(`Meeting with ID ${id} not found`);
    }

    this.logger.log(`Meeting found: ${meeting.id}`);
    return meeting;
  }

  async generateTokensForParticipants(
    meetingId: string,
    userJwtDto: JwtUserPayloadDto,
  ): Promise<RoomTokenResponseDto> {
    this.logger.log(
      `Generating token for meeting: ${meetingId}, user id: ${userJwtDto.id}`,
    );

    const meeting = await this.findOne(meetingId);

    if (meeting.status !== 'active') {
      throw new ForbiddenException(
        `Cannot join meeting with status: ${meeting.status}`,
      );
    }

    const user = await this.userRepository.findOne({
      where: { id: userJwtDto.id },
    });

    const token = await this.openViduService.generateToken(
      meeting.sessionId,
      user.email,
      user.id,
    );

    this.logger.log(`Generated token for meeting: ${meetingId}`);
    return {
      identity: userJwtDto.id,
      token,
    };
  }

  async endMeeting(
    id: string,
    userJwtDto: JwtUserPayloadDto,
  ): Promise<Meeting> {
    this.logger.log(`Ending meeting: ${id} by user id: ${userJwtDto.id}`);

    const meeting = await this.findOne(id);
    const user = await this.userRepository.findOne({
      where: { id: userJwtDto.id },
    });

    // Check if user is admin or meeting creator
    if (user.role !== Roles.ADMIN && meeting.createdById !== user.id) {
      throw new ForbiddenException(
        'Only admin or meeting creator can end meeting',
      );
    }

    // Delete OpenVidu session
    await this.openViduService.deleteRoom(meeting.sessionId);

    // Update meeting status
    meeting.status = 'ended';
    const updatedMeeting = await this.meetingRepository.save(meeting);

    this.logger.log(`Meeting ended: ${updatedMeeting.id}`);
    return updatedMeeting;
  }

  // TODO: add check if meeting still active and update database (now our DB is possible inconsistent with openvidu)
}
