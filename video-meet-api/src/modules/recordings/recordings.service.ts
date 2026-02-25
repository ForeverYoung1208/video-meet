import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { Recording } from '../../entities/recording.entity';
import { Meeting } from '../../entities/meeting.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class RecordingsService {
  private readonly logger = new Logger(RecordingsService.name);

  constructor(
    @InjectRepository(Recording)
    private readonly recordingRepository: Repository<Recording>,
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    private readonly configService: ConfigService,
  ) {}

  @Transactional()
  async startRecording(meetingId: string, user: User): Promise<Recording> {
    this.logger.log(
      `Starting recording for meeting: ${meetingId} by user: ${user.email}`,
    );

    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
      relations: ['createdBy'],
    });

    if (!meeting) {
      throw new NotFoundException(`Meeting with ID ${meetingId} not found`);
    }

    // Check if user is admin or meeting creator
    if (user.role !== 'admin' && meeting.createdById !== user.id) {
      throw new ForbiddenException(
        'Only admin or meeting creator can start recording',
      );
    }

    if (meeting.status !== 'active') {
      throw new ForbiddenException(
        `Cannot start recording for meeting with status: ${meeting.status}`,
      );
    }

    // Check if recording is already in progress
    const existingRecording = await this.recordingRepository.findOne({
      where: { meetingId, status: 'processing' },
    });

    if (existingRecording) {
      throw new ForbiddenException(
        'Recording is already in progress for this meeting',
      );
    }

    // Create recording record
    const recording = this.recordingRepository.create({
      meetingId,
      status: 'processing',
      s3Url: '', // Will be updated when recording is ready
    });

    const savedRecording = await this.recordingRepository.save(recording);

    // Update meeting status to recording
    meeting.status = 'recording';
    await this.meetingRepository.save(meeting);

    // TODO: Implement actual OpenVidu recording start
    // This would use OpenVidu's recording API
    this.logger.log(`Recording started: ${savedRecording.id}`);
    return savedRecording;
  }

  @Transactional()
  async stopRecording(meetingId: string, user: User): Promise<Recording> {
    this.logger.log(
      `Stopping recording for meeting: ${meetingId} by user: ${user.email}`,
    );

    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
      relations: ['createdBy'],
    });

    if (!meeting) {
      throw new NotFoundException(`Meeting with ID ${meetingId} not found`);
    }

    // Check if user is admin or meeting creator
    if (user.role !== 'admin' && meeting.createdById !== user.id) {
      throw new ForbiddenException(
        'Only admin or meeting creator can stop recording',
      );
    }

    const recording = await this.recordingRepository.findOne({
      where: { meetingId, status: 'processing' },
    });

    if (!recording) {
      throw new NotFoundException('No active recording found for this meeting');
    }

    // TODO: Implement actual OpenVidu recording stop
    // This would get the S3 URL from OpenVidu and update the recording
    const s3Bucket = this.configService.get<string>('aws.s3.bucket');
    const s3Region = this.configService.get<string>('aws.s3.region');
    const s3Url = `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/recordings/${meetingId}-${Date.now()}.mp4`;
    const duration = Math.floor(
      (Date.now() - recording.createdAt.getTime()) / 1000,
    );

    // Update recording with final details
    recording.status = 'ready';
    recording.s3Url = s3Url;
    recording.duration = duration;
    const updatedRecording = await this.recordingRepository.save(recording);

    // Update meeting status back to active
    meeting.status = 'active';
    await this.meetingRepository.save(meeting);

    this.logger.log(`Recording stopped: ${updatedRecording.id}`);
    return updatedRecording;
  }

  async findAll(user: User): Promise<Recording[]> {
    this.logger.log(`Finding all recordings for user: ${user.email}`);

    // Admin can see all recordings, users can only see recordings of meetings they created
    const whereCondition =
      user.role === 'admin' ? {} : { meeting: { createdById: user.id } };

    const recordings = await this.recordingRepository.find({
      where: whereCondition,
      relations: ['meeting'],
    });

    this.logger.log(`Found ${recordings.length} recordings`);
    return recordings;
  }

  async findOne(id: string, user: User): Promise<Recording> {
    this.logger.log(`Finding recording: ${id} for user: ${user.email}`);

    const recording = await this.recordingRepository.findOne({
      where: { id },
      relations: ['meeting', 'meeting.createdBy'],
    });

    if (!recording) {
      throw new NotFoundException(`Recording with ID ${id} not found`);
    }

    // Check if user is admin or meeting creator
    if (user.role !== 'admin' && recording.meeting.createdById !== user.id) {
      throw new ForbiddenException('Access denied to this recording');
    }

    this.logger.log(`Recording found: ${recording.id}`);
    return recording;
  }
}
