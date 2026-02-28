# Coding Patterns & Conventions

## Metadata

**Purpose:** Detailed coding patterns, conventions, and implementation examples for Video Meet codebase

**When to Use:**
- Implementing new features or modules
- Understanding service/repository patterns
- Learning validation and error handling approaches
- Working with distributed systems (locking, scheduling)
- Integrating external services (LiveKit, storage providers)
- Following project-specific conventions

**Key Topics:**
- Module organization structure
- Service layer pattern with examples
- Repository pattern with cursor pagination
- DTO validation patterns
- Exception handling conventions
- Distributed locking for critical sections
- Scheduled tasks implementation
- Multi-cloud storage abstraction
- Development workflows (step-by-step)
- Common implementation tasks
- Testing patterns (future)

**Related Documentation:**
- `architecture.md` - High-level design patterns
- `components.md` - Component implementations
- `workflows.md` - Process flows
- `interfaces.md` - API contracts

---

## Table of Contents

1. [Module Organization](#module-organization)
2. [Service Layer Pattern](#service-layer-pattern)
3. [Repository Pattern](#repository-pattern)
4. [DTO Validation](#dto-validation)
5. [Exception Handling](#exception-handling)
6. [Distributed Locking Pattern](#distributed-locking-pattern)
7. [Scheduled Tasks Pattern](#scheduled-tasks-pattern)
8. [Multi-Cloud Storage Pattern](#multi-cloud-storage-pattern)
9. [Development Workflows](#development-workflows)
10. [Common Tasks](#common-tasks)
11. [Testing Patterns](#testing-patterns)

---

## Module Organization

### Standard NestJS Module Structure

Each feature module follows this consistent structure:

```
module-name/
├── module-name.module.ts       # Module definition with providers/imports
├── module-name.controller.ts   # REST endpoints (HTTP layer)
├── module-name.service.ts      # Business logic (service layer)
├── dto/                        # Data Transfer Objects
│   ├── create-*.dto.ts        # Creation DTOs
│   ├── update-*.dto.ts        # Update DTOs
│   └── query-*.dto.ts         # Query/filter DTOs
├── entities/                   # Database entities (if module-specific)
│   └── *.entity.ts
└── repositories/               # Data access layer (if needed)
    └── *.repository.ts
```

### Module Definition Example

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingController } from './meeting.controller';
import { MeetingService } from './meeting.service';
import { Meeting } from './entities/meeting.entity';
import { MeetingRepository } from './repositories/meeting.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Meeting]),
  ],
  controllers: [MeetingController],
  providers: [
    MeetingService,
    MeetingRepository,
  ],
  exports: [MeetingService], // Export if used by other modules
})
export class MeetingModule {}
```

### Key Principles

- **Single Responsibility:** Each module handles one feature domain
- **Dependency Injection:** Use constructor injection for all dependencies
- **Loose Coupling:** Modules communicate through well-defined interfaces
- **Encapsulation:** Keep implementation details private, expose only necessary APIs

---

## Service Layer Pattern

### Purpose

Services contain business logic and coordinate between repositories, external services, and other components.

### Responsibilities

- **Business Logic:** Implement domain rules and workflows
- **Coordination:** Orchestrate multiple repositories and services
- **Transaction Management:** Handle database transactions
- **Error Handling:** Catch and transform errors appropriately
- **Validation:** Perform business-level validation (beyond DTO validation)

### Implementation Example

```typescript
import { Injectable } from '@nestjs/common';
import { RecordingRepository } from './repositories/recording.repository';
import { LiveKitService } from '../livekit/livekit.service';
import { MutexService } from '../mutex/mutex.service';
import { DataNotFoundException } from '../../exceptions/data-not-found.exception';
import { StartRecordingDto } from './dto/start-recording.dto';
import { Recording } from './entities/recording.entity';

@Injectable()
export class RecordingService {
  constructor(
    private readonly recordingRepository: RecordingRepository,
    private readonly livekitService: LiveKitService,
    private readonly mutexService: MutexService,
  ) {}

  async startRecording(dto: StartRecordingDto): Promise<Recording> {
    // 1. Acquire distributed lock to prevent concurrent recordings
    const lock = await this.mutexService.acquire(
      `recording:${dto.roomId}`,
      30000 // 30 second TTL
    );
    
    try {
      // 2. Check if recording already exists
      const existing = await this.recordingRepository.findActiveByRoomId(dto.roomId);
      if (existing) {
        throw new DataConflictException('Recording already in progress');
      }

      // 3. Create database record
      const recording = await this.recordingRepository.create({
        roomId: dto.roomId,
        status: 'starting',
        startedAt: new Date(),
      });
      
      // 4. Start LiveKit egress
      const egressInfo = await this.livekitService.startRoomComposite(
        dto.roomId,
        {
          fileType: 'mp4',
          layout: 'grid',
        }
      );

      // 5. Update recording with egress ID
      recording.egressId = egressInfo.egressId;
      recording.status = 'active';
      await this.recordingRepository.save(recording);
      
      return recording;
    } finally {
      // 6. Always release lock
      await this.mutexService.release(lock);
    }
  }

  async stopRecording(recordingId: string): Promise<Recording> {
    const recording = await this.recordingRepository.findById(recordingId);
    if (!recording) {
      throw new DataNotFoundException(`Recording ${recordingId} not found`);
    }

    if (recording.status !== 'active') {
      throw new DataConflictException('Recording is not active');
    }

    // Stop LiveKit egress
    await this.livekitService.stopEgress(recording.egressId);

    // Update status
    recording.status = 'stopping';
    recording.stoppedAt = new Date();
    return this.recordingRepository.save(recording);
  }

  async getRecording(recordingId: string): Promise<Recording> {
    const recording = await this.recordingRepository.findById(recordingId);
    if (!recording) {
      throw new DataNotFoundException(`Recording ${recordingId} not found`);
    }
    return recording;
  }
}
```

### Best Practices

- **Constructor Injection:** Inject all dependencies via constructor
- **Error Handling:** Use custom exceptions for domain errors
- **Async/Await:** Use async/await for all asynchronous operations
- **Lock Critical Sections:** Use distributed locks for race-prone operations
- **Keep Methods Focused:** Each method should do one thing well
- **Return Domain Models:** Return entities/models, not raw database objects

---

## Repository Pattern

### Purpose

Repositories abstract data access logic and provide a consistent interface for CRUD operations.

### Responsibilities

- **Data Access:** Execute database queries
- **Query Building:** Construct complex queries
- **Pagination:** Implement cursor-based pagination
- **Domain Transformation:** Convert database documents to domain models
- **Caching:** Implement repository-level caching if needed

### Base Repository Pattern

```typescript
import { Injectable } from '@nestjs/common';
import { Model, Document } from 'mongoose';

@Injectable()
export abstract class BaseRepository<T> {
  constructor(protected readonly model: Model<T & Document>) {}

  async findById(id: string): Promise<T | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async create(data: Partial<T>): Promise<T> {
    const doc = new this.model(data);
    await doc.save();
    return this.toDomain(doc);
  }

  async save(entity: T): Promise<T> {
    const doc = await this.model.findByIdAndUpdate(
      (entity as any)._id,
      entity,
      { new: true }
    ).exec();
    return this.toDomain(doc);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return !!result;
  }

  protected abstract toDomain(doc: any): T;
}
```

### Concrete Repository Example

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/base.repository';
import { Room } from '../entities/room.entity';

@Injectable()
export class RoomRepository extends BaseRepository<Room> {
  constructor(@InjectModel(Room.name) private roomModel: Model<Room>) {
    super(roomModel);
  }

  async findByRoomId(roomId: string): Promise<Room | null> {
    const doc = await this.roomModel.findOne({ roomId }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findActiveRooms(): Promise<Room[]> {
    const docs = await this.roomModel
      .find({ status: 'active' })
      .sort({ createdAt: -1 })
      .exec();
    return docs.map(doc => this.toDomain(doc));
  }

  async findWithPagination(
    limit: number,
    cursor?: string
  ): Promise<{ items: Room[]; nextCursor: string | null; hasMore: boolean }> {
    const query = cursor
      ? this.roomModel.find({ _id: { $lt: cursor } })
      : this.roomModel.find();

    const docs = await query
      .sort({ _id: -1 })
      .limit(limit + 1)
      .exec();

    const hasMore = docs.length > limit;
    const items = docs.slice(0, limit).map(doc => this.toDomain(doc));
    const nextCursor = hasMore ? docs[limit - 1]._id.toString() : null;

    return { items, nextCursor, hasMore };
  }

  protected toDomain(doc: any): Room {
    return new Room({
      id: doc._id.toString(),
      roomId: doc.roomId,
      name: doc.name,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
```

### Cursor-Based Pagination

Always use cursor-based pagination for list endpoints:

```typescript
interface PaginationResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

async findWithCursor(
  limit: number,
  cursor?: string,
  filters?: any
): Promise<PaginationResult<T>> {
  const query = { ...filters };
  
  if (cursor) {
    // Decode cursor and add to query
    const decodedCursor = this.decodeCursor(cursor);
    query._id = { $lt: decodedCursor };
  }

  const docs = await this.model
    .find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .exec();

  const hasMore = docs.length > limit;
  const items = docs.slice(0, limit).map(doc => this.toDomain(doc));
  const nextCursor = hasMore ? this.encodeCursor(docs[limit - 1]._id) : null;

  return { items, nextCursor, hasMore };
}

private encodeCursor(id: string): string {
  return Buffer.from(id).toString('base64');
}

private decodeCursor(cursor: string): string {
  return Buffer.from(cursor, 'base64').toString('utf-8');
}
```

### Best Practices

- **Extend Base Repository:** Use inheritance for common operations
- **Domain Transformation:** Always convert DB documents to domain models
- **Cursor Pagination:** Use for all list operations
- **Query Optimization:** Add indexes for frequently queried fields
- **Error Handling:** Let exceptions bubble up to service layer

---
## DTO Validation

### Purpose

DTOs (Data Transfer Objects) define the shape of data for API requests and responses, with built-in validation.

### Pattern

Use `class-validator` decorators for all validation:

```typescript
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, Min, Max, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMeetingDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Meeting name', example: 'Team Standup' })
  name: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Meeting description', required: false })
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  @ApiProperty({ 
    description: 'Maximum participants', 
    required: false,
    minimum: 1,
    maximum: 100,
    default: 10
  })
  maxParticipants?: number;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ description: 'Enable recording', required: false, default: false })
  recordingEnabled?: boolean;

  @IsEnum(['grid', 'speaker', 'gallery'])
  @IsOptional()
  @ApiProperty({ 
    description: 'Default layout', 
    enum: ['grid', 'speaker', 'gallery'],
    required: false 
  })
  layout?: string;
}
```

### Common Validation Decorators

```typescript
// String validation
@IsString()
@IsNotEmpty()
@MinLength(3)
@MaxLength(100)
@Matches(/^[a-zA-Z0-9-]+$/)
name: string;

// Number validation
@IsNumber()
@Min(0)
@Max(1000)
@IsPositive()
count: number;

// Boolean validation
@IsBoolean()
enabled: boolean;

// Enum validation
@IsEnum(Status)
status: Status;

// Array validation
@IsArray()
@ArrayMinSize(1)
@ArrayMaxSize(10)
@IsString({ each: true })
tags: string[];

// Nested object validation
@ValidateNested()
@Type(() => AddressDto)
address: AddressDto;

// Email validation
@IsEmail()
email: string;

// URL validation
@IsUrl()
website: string;

// UUID validation
@IsUUID()
id: string;

// Date validation
@IsDate()
@Type(() => Date)
scheduledAt: Date;

// Optional fields
@IsOptional()
@IsString()
optionalField?: string;
```

### Custom Validation

```typescript
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsRoomIdValid(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isRoomIdValid',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return typeof value === 'string' && /^room-[a-z0-9]{8}$/.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return 'Room ID must match format: room-xxxxxxxx';
        },
      },
    });
  };
}

// Usage
export class JoinRoomDto {
  @IsRoomIdValid()
  roomId: string;
}
```

### Best Practices

- **Always validate:** Use decorators on all DTO properties
- **Document with Swagger:** Add `@ApiProperty()` for API documentation
- **Optional fields:** Use `@IsOptional()` for non-required fields
- **Meaningful messages:** Provide clear validation error messages
- **Type transformation:** Use `@Type()` for nested objects and dates

---

## Exception Handling

### Custom Exception Classes

Location: `src/exceptions/`

```typescript
import { HttpException, HttpStatus } from '@nestjs/common';

// Data-related exceptions
export class DataNotFoundException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.NOT_FOUND);
  }
}

export class DataConflictException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.CONFLICT);
  }
}

export class DataValidationException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

// Access-related exceptions
export class AccessUnauthorizedException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

export class AccessForbiddenException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.FORBIDDEN);
  }
}

// External service exceptions
export class ExternalServiceException extends HttpException {
  constructor(service: string, message: string) {
    super(`${service} error: ${message}`, HttpStatus.BAD_GATEWAY);
  }
}
```

### Usage in Services

```typescript
@Injectable()
export class MeetingService {
  async getMeeting(id: string): Promise<Meeting> {
    const meeting = await this.meetingRepository.findById(id);
    if (!meeting) {
      throw new DataNotFoundException(`Meeting ${id} not found`);
    }
    return meeting;
  }

  async createMeeting(userId: string, dto: CreateMeetingDto): Promise<Meeting> {
    // Check if user has permission
    const user = await this.userRepository.findById(userId);
    if (!user.canCreateMeetings) {
      throw new AccessForbiddenException('User cannot create meetings');
    }

    // Check for conflicts
    const existing = await this.meetingRepository.findByName(dto.name);
    if (existing) {
      throw new DataConflictException(`Meeting with name "${dto.name}" already exists`);
    }

    try {
      // Create LiveKit room
      await this.livekitService.createRoom(dto.name);
    } catch (error) {
      throw new ExternalServiceException('LiveKit', error.message);
    }

    return this.meetingRepository.create(dto);
  }
}
```

### Global Exception Filter

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.message
      : 'Internal server error';

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

### Best Practices

- **Use custom exceptions:** Don't throw generic `HttpException`
- **Meaningful messages:** Include context (IDs, names) in error messages
- **Consistent format:** Use exception filters for uniform error responses
- **Log errors:** Log exceptions with appropriate severity
- **Don't expose internals:** Sanitize error messages for external APIs

---

## Distributed Locking Pattern

### Purpose

Prevent race conditions in critical sections using Redis-based distributed locks.

### When to Use

- Recording start/stop operations
- Participant name reservation
- Resource allocation
- Any operation requiring mutual exclusion across multiple instances

### Implementation

```typescript
import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export interface Lock {
  key: string;
  value: string;
  ttl: number;
}

@Injectable()
export class MutexService {
  constructor(private readonly redisService: RedisService) {}

  async acquire(key: string, ttl: number = 30000): Promise<Lock> {
    const lockKey = `lock:${key}`;
    const lockValue = this.generateLockValue();
    const maxRetries = 10;
    const retryDelay = 100;

    for (let i = 0; i < maxRetries; i++) {
      const acquired = await this.redisService.set(
        lockKey,
        lockValue,
        'PX', // milliseconds
        ttl,
        'NX' // only if not exists
      );

      if (acquired === 'OK') {
        return { key: lockKey, value: lockValue, ttl };
      }

      // Wait before retry
      await this.sleep(retryDelay);
    }

    throw new Error(`Failed to acquire lock for ${key}`);
  }

  async release(lock: Lock): Promise<void> {
    // Use Lua script to ensure atomic check-and-delete
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    await this.redisService.eval(script, 1, lock.key, lock.value);
  }

  async extend(lock: Lock, additionalTtl: number): Promise<void> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("pexpire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;

    await this.redisService.eval(script, 1, lock.key, lock.value, additionalTtl);
  }

  private generateLockValue(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Usage Pattern

```typescript
async performCriticalOperation(resourceId: string): Promise<void> {
  const lock = await this.mutexService.acquire(
    `operation:${resourceId}`,
    30000 // 30 second TTL
  );

  try {
    // Critical section - only one instance can execute this at a time
    await this.doWork(resourceId);
    
    // If operation takes longer, extend the lock
    if (needMoreTime) {
      await this.mutexService.extend(lock, 30000);
    }
  } finally {
    // Always release lock, even if operation fails
    await this.mutexService.release(lock);
  }
}
```

### Best Practices

- **Always use try-finally:** Ensure locks are released even on errors
- **Appropriate TTL:** Set TTL longer than expected operation time
- **Unique lock keys:** Use descriptive, unique keys for different resources
- **Extend if needed:** Extend lock TTL for long-running operations
- **Handle acquisition failure:** Decide whether to retry or fail fast

---

## Scheduled Tasks Pattern

### Purpose

Execute background jobs on a schedule (cleanup, sync, notifications, etc.).

### Implementation

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { TaskSchedulerService } from '../task-scheduler/task-scheduler.service';
import { RoomService } from './room.service';

@Injectable()
export class RoomScheduledTasksService implements OnModuleInit {
  constructor(
    private readonly taskScheduler: TaskSchedulerService,
    private readonly roomService: RoomService,
  ) {}

  onModuleInit() {
    this.registerScheduledTasks();
  }

  private registerScheduledTasks() {
    // Cleanup expired rooms every 10 minutes
    this.taskScheduler.registerTask(
      'room-cleanup',
      '*/10 * * * *', // Cron: every 10 minutes
      () => this.deleteExpiredRooms()
    );

    // Sync room status every 5 minutes
    this.taskScheduler.registerTask(
      'room-status-sync',
      '*/5 * * * *', // Cron: every 5 minutes
      () => this.syncRoomStatus()
    );

    // Daily report at 2 AM
    this.taskScheduler.registerTask(
      'daily-report',
      '0 2 * * *', // Cron: 2:00 AM daily
      () => this.generateDailyReport()
    );
  }

  private async deleteExpiredRooms(): Promise<void> {
    const expiredRooms = await this.roomService.findExpiredRooms();
    
    for (const room of expiredRooms) {
      try {
        await this.roomService.deleteRoom(room.id);
      } catch (error) {
        console.error(`Failed to delete room ${room.id}:`, error);
      }
    }
  }

  private async syncRoomStatus(): Promise<void> {
    // Sync logic
  }

  private async generateDailyReport(): Promise<void> {
    // Report generation logic
  }
}
```

### Cron Expression Examples

```typescript
// Every minute
'* * * * *'

// Every 5 minutes
'*/5 * * * *'

// Every hour at minute 0
'0 * * * *'

// Every day at 2:30 AM
'30 2 * * *'

// Every Monday at 9:00 AM
'0 9 * * 1'

// First day of month at midnight
'0 0 1 * *'

// Every weekday at 6:00 PM
'0 18 * * 1-5'
```

### Best Practices

- **Implement OnModuleInit:** Register tasks when module initializes
- **Error handling:** Wrap task logic in try-catch
- **Idempotent tasks:** Ensure tasks can run multiple times safely
- **Logging:** Log task execution and failures
- **Distributed locks:** Use locks if task shouldn't run concurrently across instances

---

## Multi-Cloud Storage Pattern

### Purpose

Abstract storage operations to support multiple cloud providers (AWS S3, Azure Blob, GCS).

### Interface Definition

```typescript
export interface IStorageProvider {
  getObject(key: string): Promise<Buffer>;
  putObject(key: string, data: Buffer, contentType?: string): Promise<void>;
  deleteObject(key: string): Promise<void>;
  listObjects(prefix: string): Promise<string[]>;
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
}
```

### AWS S3 Implementation

```typescript
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IStorageProvider } from './storage-provider.interface';

export class S3StorageProvider implements IStorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor(region: string, bucket: string) {
    this.client = new S3Client({ region });
    this.bucket = bucket;
  }

  async getObject(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const response = await this.client.send(command);
    return Buffer.from(await response.Body.transformToByteArray());
  }

  async putObject(key: string, data: Buffer, contentType?: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: data,
      ContentType: contentType,
    });
    await this.client.send(command);
  }

  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.client.send(command);
  }

  async getSignedUrl(key: string, expiresIn: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }
}
```

### Service Using Provider Abstraction

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IStorageProvider } from './providers/storage-provider.interface';
import { S3StorageProvider } from './providers/s3-storage.provider';
import { AzureBlobStorageProvider } from './providers/azure-blob-storage.provider';
import { GCSStorageProvider } from './providers/gcs-storage.provider';

@Injectable()
export class BlobStorageService {
  private provider: IStorageProvider;

  constructor(private configService: ConfigService) {
    this.provider = this.createProvider();
  }

  private createProvider(): IStorageProvider {
    const providerType = this.configService.get('STORAGE_PROVIDER');

    switch (providerType) {
      case 'aws':
        return new S3StorageProvider(
          this.configService.get('AWS_REGION'),
          this.configService.get('AWS_S3_BUCKET')
        );
      case 'azure':
        return new AzureBlobStorageProvider(
          this.configService.get('AZURE_STORAGE_CONNECTION_STRING'),
          this.configService.get('AZURE_CONTAINER_NAME')
        );
      case 'gcs':
        return new GCSStorageProvider(
          this.configService.get('GCS_PROJECT_ID'),
          this.configService.get('GCS_BUCKET_NAME')
        );
      default:
        throw new Error(`Unsupported storage provider: ${providerType}`);
    }
  }

  async saveRecording(recordingId: string, data: Buffer): Promise<void> {
    const key = `recordings/${recordingId}.mp4`;
    await this.provider.putObject(key, data, 'video/mp4');
  }

  async getRecording(recordingId: string): Promise<Buffer> {
    const key = `recordings/${recordingId}.mp4`;
    return this.provider.getObject(key);
  }

  async deleteRecording(recordingId: string): Promise<void> {
    const key = `recordings/${recordingId}.mp4`;
    await this.provider.deleteObject(key);
  }

  async getRecordingUrl(recordingId: string, expiresIn: number = 3600): Promise<string> {
    const key = `recordings/${recordingId}.mp4`;
    return this.provider.getSignedUrl(key, expiresIn);
  }
}
```

### Best Practices

- **Interface-based design:** Define common interface for all providers
- **Factory pattern:** Create provider based on configuration
- **Consistent error handling:** Normalize errors across providers
- **Configuration validation:** Validate provider-specific config on startup
- **Testing:** Mock the interface for unit tests

---
## Development Workflows

### Workflow 1: Adding a New Feature

#### Step 1: Create Module Structure

```bash
cd video-meet-api/src/modules
nest g module features/my-feature
nest g controller features/my-feature
nest g service features/my-feature
```

#### Step 2: Define DTOs with Validation

```typescript
// dto/create-my-feature.dto.ts
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMyFeatureDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Feature name' })
  name: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Feature description', required: false })
  description?: string;
}
```

#### Step 3: Create Entity (if needed)

```typescript
// entities/my-feature.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('my_features')
export class MyFeature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

#### Step 4: Create Repository

```typescript
// repositories/my-feature.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MyFeature } from '../entities/my-feature.entity';

@Injectable()
export class MyFeatureRepository {
  constructor(
    @InjectRepository(MyFeature)
    private repository: Repository<MyFeature>,
  ) {}

  async findById(id: string): Promise<MyFeature | null> {
    return this.repository.findOne({ where: { id } });
  }

  async create(data: Partial<MyFeature>): Promise<MyFeature> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }
}
```

#### Step 5: Implement Service Logic

```typescript
// my-feature.service.ts
import { Injectable } from '@nestjs/common';
import { MyFeatureRepository } from './repositories/my-feature.repository';
import { CreateMyFeatureDto } from './dto/create-my-feature.dto';
import { MyFeature } from './entities/my-feature.entity';
import { DataNotFoundException } from '../../exceptions/data-not-found.exception';

@Injectable()
export class MyFeatureService {
  constructor(
    private readonly repository: MyFeatureRepository,
  ) {}

  async create(dto: CreateMyFeatureDto): Promise<MyFeature> {
    return this.repository.create(dto);
  }

  async findById(id: string): Promise<MyFeature> {
    const feature = await this.repository.findById(id);
    if (!feature) {
      throw new DataNotFoundException(`Feature ${id} not found`);
    }
    return feature;
  }
}
```

#### Step 6: Add Controller Endpoints

```typescript
// my-feature.controller.ts
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MyFeatureService } from './my-feature.service';
import { CreateMyFeatureDto } from './dto/create-my-feature.dto';

@ApiTags('my-feature')
@Controller('my-feature')
export class MyFeatureController {
  constructor(private readonly service: MyFeatureService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new feature' })
  @ApiResponse({ status: 201, description: 'Feature created successfully' })
  async create(@Body() dto: CreateMyFeatureDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get feature by ID' })
  @ApiResponse({ status: 200, description: 'Feature found' })
  @ApiResponse({ status: 404, description: 'Feature not found' })
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }
}
```

#### Step 7: Update Module

```typescript
// my-feature.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MyFeatureController } from './my-feature.controller';
import { MyFeatureService } from './my-feature.service';
import { MyFeature } from './entities/my-feature.entity';
import { MyFeatureRepository } from './repositories/my-feature.repository';

@Module({
  imports: [TypeOrmModule.forFeature([MyFeature])],
  controllers: [MyFeatureController],
  providers: [MyFeatureService, MyFeatureRepository],
  exports: [MyFeatureService],
})
export class MyFeatureModule {}
```

---

### Workflow 2: Working with LiveKit/OpenVidu

#### Installation

```bash
npm install livekit-server-sdk livekit-client
```

#### Server-Side Integration

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RoomServiceClient, AccessToken, EgressClient } from 'livekit-server-sdk';

@Injectable()
export class LiveKitService {
  private roomService: RoomServiceClient;
  private egressClient: EgressClient;
  private apiKey: string;
  private apiSecret: string;

  constructor(private configService: ConfigService) {
    const host = configService.get('LIVEKIT_URL');
    this.apiKey = configService.get('LIVEKIT_API_KEY');
    this.apiSecret = configService.get('LIVEKIT_API_SECRET');

    this.roomService = new RoomServiceClient(host, this.apiKey, this.apiSecret);
    this.egressClient = new EgressClient(host, this.apiKey, this.apiSecret);
  }

  async createRoom(name: string, options?: any): Promise<void> {
    await this.roomService.createRoom({
      name,
      emptyTimeout: options?.emptyTimeout || 300,
      maxParticipants: options?.maxParticipants || 100,
    });
  }

  async deleteRoom(name: string): Promise<void> {
    await this.roomService.deleteRoom(name);
  }

  async listRooms(): Promise<any[]> {
    const rooms = await this.roomService.listRooms();
    return rooms;
  }

  generateToken(roomName: string, participantName: string, metadata?: string): string {
    const token = new AccessToken(this.apiKey, this.apiSecret, {
      identity: participantName,
      metadata,
    });
    
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    return token.toJwt();
  }

  async startRoomComposite(roomName: string, options: any): Promise<any> {
    const egressInfo = await this.egressClient.startRoomCompositeEgress(roomName, {
      fileType: options.fileType || 'mp4',
      layout: options.layout || 'grid',
      audioOnly: options.audioOnly || false,
    });
    return egressInfo;
  }

  async stopEgress(egressId: string): Promise<void> {
    await this.egressClient.stopEgress(egressId);
  }
}
```

#### Client-Side Integration (React)

```typescript
import { useEffect, useState } from 'react';
import { Room, RoomEvent, RemoteParticipant } from 'livekit-client';

export function useVideoRoom(url: string, token: string) {
  const [room] = useState(() => new Room());
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const connectRoom = async () => {
      try {
        await room.connect(url, token);
        setIsConnected(true);
        setParticipants(Array.from(room.remoteParticipants.values()));
      } catch (error) {
        console.error('Failed to connect:', error);
      }
    };

    // Event handlers
    room.on(RoomEvent.ParticipantConnected, (participant) => {
      setParticipants(prev => [...prev, participant]);
    });

    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      setParticipants(prev => prev.filter(p => p.sid !== participant.sid));
    });

    room.on(RoomEvent.Disconnected, () => {
      setIsConnected(false);
    });

    connectRoom();

    return () => {
      room.disconnect();
    };
  }, [url, token]);

  return { room, participants, isConnected };
}
```

---

### Workflow 3: Database Operations with TypeORM

#### Define Entity

```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('rooms')
@Index(['status', 'createdAt'])
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  roomId: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ['active', 'ended'], default: 'active' })
  status: string;

  @Column({ type: 'int', default: 10 })
  maxParticipants: number;

  @Column({ type: 'boolean', default: false })
  recordingEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

#### Use in Service

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './entities/room.entity';
import { CreateRoomDto } from './dto/create-room.dto';

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
  ) {}

  async create(dto: CreateRoomDto): Promise<Room> {
    const room = this.roomRepository.create(dto);
    return this.roomRepository.save(room);
  }

  async findById(id: string): Promise<Room | null> {
    return this.roomRepository.findOne({ where: { id } });
  }

  async findActiveRooms(): Promise<Room[]> {
    return this.roomRepository.find({
      where: { status: 'active' },
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(id: string, status: string): Promise<Room> {
    await this.roomRepository.update(id, { status });
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.roomRepository.delete(id);
  }
}
```

---

### Workflow 4: Redis Operations

#### Caching

```typescript
import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class CacheService {
  constructor(private redisService: RedisService) {}

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await this.redisService.set(
      key,
      JSON.stringify(value),
      'EX',
      ttl
    );
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redisService.get(key);
    return data ? JSON.parse(data) : null;
  }

  async delete(key: string): Promise<void> {
    await this.redisService.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redisService.exists(key);
    return result === 1;
  }
}
```

#### Pub/Sub

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class EventService implements OnModuleInit {
  constructor(private redisService: RedisService) {}

  async onModuleInit() {
    await this.subscribe('room-events', (message) => {
      this.handleRoomEvent(JSON.parse(message));
    });
  }

  async publish(channel: string, data: any): Promise<void> {
    await this.redisService.publish(channel, JSON.stringify(data));
  }

  async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    await this.redisService.subscribe(channel, handler);
  }

  private handleRoomEvent(event: any): void {
    // Handle event
  }
}
```

---

## Common Tasks

### Task 1: Add a New API Endpoint

1. **Define DTO** in `dto/` directory with validation decorators
2. **Add method to service** with business logic
3. **Add controller endpoint** with proper decorators
4. **Add Swagger documentation** with `@ApiOperation()` and `@ApiResponse()`
5. **Test with HTTP client** (Postman, curl, etc.)

### Task 2: Integrate with External Service

1. **Create service** in appropriate module
2. **Add configuration** to `.env` and validate in `ConfigModule`
3. **Implement service methods** with error handling
4. **Add retry logic** for transient failures
5. **Document in interfaces.md** with API details

### Task 3: Add Scheduled Task

1. **Create or update scheduled tasks service** implementing `OnModuleInit`
2. **Register task** in `onModuleInit()` with cron expression
3. **Implement task logic** with error handling
4. **Add logging** for task execution
5. **Test task execution** manually or wait for schedule

### Task 4: Add Database Entity

1. **Define TypeORM entity** with decorators
2. **Create repository** (optional, can use TypeORM repository directly)
3. **Add to module providers** in `TypeOrmModule.forFeature([])`
4. **Implement CRUD operations** in service
5. **Document in data_models.md** with schema details

### Task 5: Handle Webhook Event

1. **Add event handler** in webhook service
2. **Update database** based on event data
3. **Publish real-time update** via Redis pub/sub
4. **Send outgoing webhook** if configured
5. **Log event** for debugging

### Task 6: Add Authentication Guard

1. **Create guard** extending `AuthGuard` or implementing `CanActivate`
2. **Extract and validate token** from request headers
3. **Attach user to request** object
4. **Apply guard** to controller or specific routes
5. **Handle unauthorized** access with proper exceptions

### Task 7: Implement Cursor Pagination

1. **Add pagination DTO** with `limit` and `cursor` fields
2. **Implement repository method** with cursor logic
3. **Encode/decode cursors** (base64 of ID)
4. **Return response** with `items`, `nextCursor`, `hasMore`
5. **Document pagination** in API docs

---

## Testing Patterns

### Current Status

- **Testing Framework:** Jest (built-in with NestJS)
- **Current Coverage:** Default NestJS test cases only
- **Future Plans:** Comprehensive tests after POC stage

**Note:** Do NOT add tests during POC phase unless explicitly requested.

### Test Structure (Future Implementation)

```
src/
└── modules/
    └── my-feature/
        ├── my-feature.service.ts
        ├── my-feature.service.spec.ts
        ├── my-feature.controller.ts
        └── my-feature.controller.spec.ts
```

### Unit Test Pattern (Future)

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MyFeatureService } from './my-feature.service';
import { MyFeatureRepository } from './repositories/my-feature.repository';

describe('MyFeatureService', () => {
  let service: MyFeatureService;
  let repository: jest.Mocked<MyFeatureRepository>;

  beforeEach(async () => {
    const mockRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MyFeatureService,
        {
          provide: MyFeatureRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<MyFeatureService>(MyFeatureService);
    repository = module.get(MyFeatureRepository);
  });

  describe('create', () => {
    it('should create a feature', async () => {
      const dto = { name: 'Test Feature' };
      const expected = { id: '1', ...dto };

      repository.create.mockResolvedValue(expected);

      const result = await service.create(dto);

      expect(result).toEqual(expected);
      expect(repository.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findById', () => {
    it('should return a feature', async () => {
      const expected = { id: '1', name: 'Test Feature' };
      repository.findById.mockResolvedValue(expected);

      const result = await service.findById('1');

      expect(result).toEqual(expected);
    });

    it('should throw DataNotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('1')).rejects.toThrow(DataNotFoundException);
    });
  });
});
```

### Integration Test Pattern (Future)

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('MyFeatureController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/my-feature (POST)', () => {
    it('should create a feature', () => {
      return request(app.getHttpServer())
        .post('/my-feature')
        .send({ name: 'Test Feature' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('Test Feature');
        });
    });

    it('should return 400 for invalid data', () => {
      return request(app.getHttpServer())
        .post('/my-feature')
        .send({ name: '' })
        .expect(400);
    });
  });
});
```

---

## Summary

This document provides comprehensive coding patterns and conventions for the Video Meet codebase. Key takeaways:

- **Follow established patterns** for consistency
- **Use TypeScript features** (types, interfaces, decorators)
- **Validate all inputs** with class-validator
- **Handle errors properly** with custom exceptions
- **Use distributed locks** for critical sections
- **Abstract external services** with interfaces
- **Document as you go** in relevant summary files

For architectural context, see `architecture.md`. For specific component details, see `components.md`.

---

**Last Updated:** 2026-02-27  
**Version:** 1.0
