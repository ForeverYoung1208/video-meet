# AGENTS.md - AI Assistant Guide for Video Meet Codebase

## Purpose

This document provides comprehensive guidance for AI coding assistants working with the Video Meet codebase. It consolidates project-specific patterns, architecture decisions, and development guidelines that are not typically found in README.md or CONTRIBUTING.md files.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Directory Structure](#directory-structure)
4. [Coding Patterns & Conventions](#coding-patterns--conventions)
5. [Architecture Patterns](#architecture-patterns)
6. [Development Workflow](#development-workflow)
7. [Testing Guidelines](#testing-guidelines)
8. [Documentation Structure](#documentation-structure)
9. [Common Tasks](#common-tasks)
10. [Important Notes](#important-notes)

---

## Project Overview

**Project Name:** Video Meet  
**Type:** Full-stack video conferencing application  
**Size:** XXL (252,285 lines of code across 6,240 files)  
**Status:** Production-ready with POC features

### Core Features
- User authentication and authorization
- Meeting/room management (create, join, delete)
- Video calls using LiveKit/OpenVidu infrastructure
- Recording management (start, stop, download)
- Multi-cloud storage support (AWS S3, Azure Blob, GCS)
- Real-time participant management
- Webhook integration for events

### Project Structure
```
video-meet/
├── video-meet-api/          # Backend NestJS application
│   ├── src/                 # Source code
│   ├── infra/               # AWS CDK infrastructure
│   └── docker/              # Docker configurations
├── video-meet-ui/           # Frontend React application
└── .agents/                 # AI assistant documentation
    └── summary/             # Comprehensive documentation files
```

---

## Technology Stack

### Backend (video-meet-api)
- **Framework:** NestJS 10.x
- **Language:** TypeScript 5.x
- **Database:** PostgreSQL 17.5 (with TypeORM)
- **Caching/Messaging:** Redis (default port 6380 to avoid OpenVidu conflict)
- **Video Infrastructure:** LiveKit/OpenVidu 3.x (isolated 3rd party service)
- **Cloud Storage:** AWS S3 (for recordings)
- **Authentication:** JWT (Passport + @nestjs/jwt)
- **Validation:** class-validator, class-transformer
- **Infrastructure:** AWS CDK 2.x

### Frontend (video-meet-ui)
- **Framework:** React 18.x
- **Build Tool:** Vite 5.x
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS 3.x
- **Video Client:** livekit-client 2.x
- **HTTP Client:** Axios 1.x
- **State Management:** Custom store implementation

### Infrastructure
- **Deployment:** AWS Lambda (serverless) or Docker containers
- **CDN:** CloudFront
- **Storage:** S3 for static assets and recordings
- **Video Server:** Self-hosted LiveKit/OpenVidu

---

## Directory Structure

### Backend Structure (video-meet-api/src/)

```
src/
├── modules/              # Feature modules
│   ├── auth/            # Authentication & JWT
│   ├── meetings/        # Meeting/room management
│   ├── recordings/      # Recording operations
│   ├── openvidu/        # OpenVidu/LiveKit integration
│   └── users/           # User management
├── entities/            # Database entities (if using TypeORM)
├── exceptions/          # Custom exception classes
├── exception-filters/   # Global exception handlers
├── config/              # Configuration modules
├── decorators/          # Custom decorators
├── helpers/             # Utility functions
├── interceptors/        # Request/response interceptors
├── constants/           # Application constants
└── db/                  # Database configuration
```

### Frontend Structure (video-meet-ui/src/)

```
src/
├── components/          # React components
│   ├── MediaControls.tsx
│   ├── UserManagement.tsx
│   └── ...
├── api/                 # API client
├── store/               # State management
├── lib/                 # Utilities
├── assets/              # Static assets
└── App.tsx              # Main component
```

## Coding Patterns & Conventions

### 1. Module Organization

Each NestJS module follows this structure:
```
module-name/
├── module-name.module.ts       # Module definition
├── module-name.controller.ts   # REST endpoints
├── module-name.service.ts      # Business logic
├── dto/                        # Data Transfer Objects
│   ├── create-*.dto.ts
│   └── update-*.dto.ts
└── entities/                   # Database entities (if module-specific)
```

### 2. Service Layer Pattern

**Location:** `*.service.ts` files

**Responsibilities:**
- Business logic implementation
- Coordination between repositories and external services
- Transaction management
- Error handling

**Example:**
```typescript
@Injectable()
export class RecordingService {
  constructor(
    private readonly recordingRepository: RecordingRepository,
    private readonly livekitService: LiveKitService,
    private readonly mutexService: MutexService,
  ) {}

  async startRecording(dto: StartRecordingDto): Promise<Recording> {
    // 1. Acquire distributed lock
    const lock = await this.mutexService.acquire(`recording:${dto.roomId}`, 30000);
    
    try {
      // 2. Create database record
      const recording = await this.recordingRepository.create(dto);
      
      // 3. Start LiveKit egress
      await this.livekitService.startRoomComposite(dto.roomId, options);
      
      return recording;
    } finally {
      // 4. Release lock
      await this.mutexService.release(lock);
    }
  }
}
```

### 3. Repository Pattern

**Location:** `repositories/*.repository.ts`

**Responsibilities:**
- Data access abstraction
- Query building
- Cursor-based pagination
- Domain model transformation

**Example:**
```typescript
@Injectable()
export class RoomRepository extends BaseRepository<Room> {
  constructor(@InjectModel(Room.name) private roomModel: Model<Room>) {
    super(roomModel);
  }

  async findByRoomId(roomId: string): Promise<Room | null> {
    const doc = await this.roomModel.findOne({ roomId }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  private toDomain(doc: any): Room {
    // Transform MongoDB document to domain model
    return new Room(doc);
  }
}
```

### 4. DTO Validation

**Location:** `dto/*.dto.ts`

**Pattern:** Use class-validator decorators

```typescript
export class CreateMeetingDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Meeting name' })
  name: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  @ApiProperty({ description: 'Maximum participants', required: false })
  maxParticipants?: number;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ description: 'Enable recording', required: false })
  recordingEnabled?: boolean;
}
```

### 5. Exception Handling

**Location:** `src/exceptions/`

**Custom Exceptions:**
```typescript
// Data exceptions
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

// Access exceptions
export class AccessUnauthorizedException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}
```

**Usage in Services:**
```typescript
async getMeeting(id: string): Promise<Meeting> {
  const meeting = await this.meetingRepository.findById(id);
  if (!meeting) {
    throw new DataNotFoundException(`Meeting ${id} not found`);
  }
  return meeting;
}
```

### 6. Distributed Locking Pattern

**When to Use:**
- Recording start/stop operations
- Participant name reservation
- Any critical section requiring mutual exclusion

**Pattern:**
```typescript
async performCriticalOperation(resourceId: string): Promise<void> {
  const lock = await this.mutexService.acquire(
    `operation:${resourceId}`,
    30000 // TTL in ms
  );

  try {
    // Critical section
    await this.doWork();
  } finally {
    await this.mutexService.release(lock);
  }
}
```

### 7. Scheduled Tasks Pattern

**Location:** Services with scheduled tasks

**Pattern:**
```typescript
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
    // Register cleanup task every 10 minutes
    this.taskScheduler.registerTask(
      'room-cleanup',
      '*/10 * * * *', // Cron expression
      () => this.deleteExpiredRooms()
    );
  }

  private async deleteExpiredRooms(): Promise<void> {
    // Cleanup logic
  }
}
```

### 8. Multi-Cloud Storage Pattern

**Pattern:** Provider abstraction with pluggable implementations

```typescript
// Abstract interface
interface IStorageProvider {
  getObject(key: string): Promise<Buffer>;
  putObject(key: string, data: Buffer): Promise<void>;
  deleteObject(key: string): Promise<void>;
}

// Service uses abstraction
@Injectable()
export class BlobStorageService {
  private provider: IStorageProvider;

  constructor(configService: ConfigService) {
    // Select provider based on configuration
    const providerType = configService.get('STORAGE_PROVIDER');
    this.provider = this.createProvider(providerType);
  }

  async saveRecording(key: string, data: Buffer): Promise<void> {
    return this.provider.putObject(key, data);
  }
}
```

---

## Architecture Patterns

### 1. Modular Architecture
- Each feature is a self-contained NestJS module
- Modules communicate through well-defined interfaces
- Dependency injection for loose coupling

### 2. Layered Architecture
```
Controllers (HTTP) → Services (Business Logic) → Repositories (Data Access) → Database
                  ↓
              External SDKs (LiveKit, Storage)
```

### 3. Event-Driven Architecture
- Webhook handlers process LiveKit events
- Redis pub/sub for real-time updates
- Frontend event service for client notifications

### 4. Distributed Systems Patterns
- **Distributed Locking:** Redlock algorithm via Redis
- **Pub/Sub Messaging:** Redis channels for events
- **Caching:** Redis for frequently accessed data
- **Scheduled Tasks:** Cron-based background jobs

---

## Development Workflow

### 1. Adding a New Feature

**Step 1:** Create module structure
```bash
nest g module features/my-feature
nest g controller features/my-feature
nest g service features/my-feature
```

**Step 2:** Define DTOs with validation
```typescript
// dto/create-my-feature.dto.ts
export class CreateMyFeatureDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
```

**Step 3:** Implement service logic
```typescript
// my-feature.service.ts
@Injectable()
export class MyFeatureService {
  async create(dto: CreateMyFeatureDto): Promise<MyFeature> {
    // Implementation
  }
}
```

**Step 4:** Add controller endpoints
```typescript
// my-feature.controller.ts
@Controller('my-feature')
export class MyFeatureController {
  constructor(private readonly service: MyFeatureService) {}

  @Post()
  async create(@Body() dto: CreateMyFeatureDto) {
    return this.service.create(dto);
  }
}
```

### 2. Working with LiveKit/OpenVidu

**CRITICAL:** OpenVidu 3.x uses LiveKit SDK

**Installation:**
```bash
npm install livekit-server-sdk livekit-client
```

**Server-side Integration:**
```typescript
import { RoomServiceClient, AccessToken, EgressClient } from 'livekit-server-sdk';

@Injectable()
export class LiveKitService {
  private roomService: RoomServiceClient;
  private egressClient: EgressClient;

  constructor(configService: ConfigService) {
    const host = configService.get('LIVEKIT_URL');
    const apiKey = configService.get('LIVEKIT_API_KEY');
    const apiSecret = configService.get('LIVEKIT_API_SECRET');

    this.roomService = new RoomServiceClient(host, apiKey, apiSecret);
    this.egressClient = new EgressClient(host, apiKey, apiSecret);
  }

  async createRoom(name: string): Promise<void> {
    await this.roomService.createRoom({ name });
  }

  generateToken(roomName: string, participantName: string): string {
    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
    });
    token.addGrant({ roomJoin: true, room: roomName });
    return token.toJwt();
  }
}
```

**Client-side Integration:**
```typescript
import { Room } from 'livekit-client';

const room = new Room();
await room.connect(livekitUrl, token);

// Handle events
room.on('participantConnected', (participant) => {
  console.log('Participant joined:', participant.identity);
});
```

### 3. Database Operations

**Using TypeORM with PostgreSQL:**
```typescript
// Define entity
@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ['active', 'ended'] })
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}

// Use in service
@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
  ) {}

  async create(data: CreateRoomDto): Promise<Room> {
    const room = this.roomRepository.create(data);
    return this.roomRepository.save(room);
  }
}
```

### 4. Redis Operations

**Caching:**
```typescript
// Set with expiration
await this.redisService.set('room:123', JSON.stringify(roomData), 'EX', 3600);

// Get
const data = await this.redisService.get('room:123');
```

**Note:** Redis runs on port 6380 to avoid conflict with OpenVidu's Redis (port 6379)

---

## Testing Guidelines

### Current Status
- **Testing Framework:** Jest
- **Current Coverage:** Default NestJS test cases only
- **Future Plans:** Comprehensive tests after POC stage

### Test Structure (When Implemented)
```
src/
└── modules/
    └── my-feature/
        ├── my-feature.service.ts
        ├── my-feature.service.spec.ts
        ├── my-feature.controller.ts
        └── my-feature.controller.spec.ts
```

### Test Pattern (Future)
```typescript
describe('MyFeatureService', () => {
  let service: MyFeatureService;
  let repository: MockType<MyFeatureRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MyFeatureService,
        { provide: MyFeatureRepository, useFactory: mockRepository },
      ],
    }).compile();

    service = module.get(MyFeatureService);
    repository = module.get(MyFeatureRepository);
  });

  it('should create a feature', async () => {
    // Test implementation
  });
});
```

**Note:** Do NOT add tests during POC phase unless explicitly requested.

---

## Documentation Structure

### Comprehensive Documentation Location
All detailed documentation is in `.agents/summary/`:

- **index.md** - Navigation hub with metadata
- **codebase_info.md** - Project overview
- **architecture.md** - System design and patterns
- **components.md** - Component descriptions (30+ components)
- **interfaces.md** - API endpoints and integrations
- **data_models.md** - Database schemas
- **workflows.md** - Process flows (18 diagrams)
- **dependencies.md** - External libraries
- **review_notes.md** - Documentation quality assessment

### How to Use Documentation

**For Quick Reference:**
1. Start with this AGENTS.md file
2. Check `.agents/summary/index.md` for navigation
3. Use metadata tags to find relevant files

**For Deep Dives:**
1. Read `architecture.md` for system design
2. Check `components.md` for specific components
3. Review `workflows.md` for process understanding
4. Reference `interfaces.md` for API details

---

## Common Tasks

### Task 1: Add a New API Endpoint

1. Define DTO in `dto/` directory
2. Add method to service
3. Add controller endpoint
4. Test with HTTP client

### Task 2: Integrate with External Service

1. Create service in appropriate module
2. Add configuration to `.env`
3. Implement service methods
4. Add error handling
5. Document in interfaces.md

### Task 3: Add Scheduled Task

1. Create or update scheduled tasks service
2. Register task in `onModuleInit()`
3. Implement task logic
4. Test task execution

### Task 4: Add Database Entity

1. Define TypeORM entity
2. Create repository
3. Add to module providers
4. Implement CRUD operations
5. Document in data_models.md

### Task 5: Handle Webhook Event

1. Add event handler in webhook service
2. Update database based on event
3. Publish real-time update via Redis
4. Send outgoing webhook if configured

---

## Important Notes

### ⚠️ Critical Information

1. **OpenVidu 3.x Uses LiveKit SDK**
   - DO NOT use `openvidu-node-client` (deprecated)
   - USE `livekit-server-sdk` and `livekit-client`
   - Reference: https://docs.livekit.io/

2. **Reference Project**
    - deleted, 

3. **No Tests During POC**
   - Do not add tests unless explicitly requested
   - Tests will be added after POC stage

4. **OpenVidu is Isolated 3rd Party Service**
   - OpenVidu runs separately with its own MongoDB and Redis
   - Main API uses PostgreSQL (not OpenVidu's MongoDB)
   - Main API uses Redis on port 6380 (not OpenVidu's Redis on 6379)
   - Only integration point is LiveKit SDK

5. **Redis Port Configuration**
   - Main API Redis: port 6380
   - OpenVidu Redis: port 6379
   - Ports separated to avoid conflicts

6. **Cursor-Based Pagination**
   - Use for all list endpoints
   - Encode/decode cursors in repositories
   - Return `nextCursor` and `hasMore` in responses

7. **Error Handling**
   - Use custom exception classes
   - Provide meaningful error messages
   - Include context in exceptions

8. **Environment Variables**
   - Never commit `.env` files
   - Use `.env.example` as template
   - Validate configuration on startup

### 🔍 Where to Find Information

| Need | Location |
|------|----------|
| API Endpoints | `.agents/summary/interfaces.md` |
| Component Details | `.agents/summary/components.md` |
| Process Flows | `.agents/summary/workflows.md` |
| Database Schemas | `.agents/summary/data_models.md` |
| System Architecture | `.agents/summary/architecture.md` |
| Dependencies | `.agents/summary/dependencies.md` |

### 📚 External Resources

- **NestJS Docs:** https://docs.nestjs.com/
- **LiveKit Docs:** https://docs.livekit.io/
- **TypeORM Docs:** https://typeorm.io/
- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **Redis Docs:** https://redis.io/docs/
- **AWS CDK Docs:** https://docs.aws.amazon.com/cdk/

---

## Development Setup

### Running Locally

1. **Start OpenVidu Server:**
```bash
cd openvidu-local-deployment/community
./configure_lan_private_ip_linux.sh
docker compose up -d
```

2. **Start API:**
```bash
cd video-meet-api
docker compose up -d
```

### Environment Configuration

**Main API (.env):**
- Database: PostgreSQL on port 5432
- Redis: Port 6380 (to avoid OpenVidu conflict)
- LiveKit: wss://192.168.0.17:7443 (local OpenVidu)

**OpenVidu:**
- Runs on port 7443 (HTTPS)
- Has its own MongoDB (port 27017) and Redis (port 6379)
- Completely isolated from main API

---

## Quick Start for AI Assistants

1. **Read this file first** - Get project context
2. **Check `.agents/summary/index.md`** - Navigate documentation
3. **Follow coding patterns** - Maintain consistency
4. **Use distributed locking** - For critical operations
5. **Validate with DTOs** - All inputs
6. **Handle errors properly** - Custom exceptions
7. **Document changes** - Update relevant docs

---

## Version Information

- **Documentation Version:** 1.0
- **Last Updated:** 2026-02-25
- **Codebase Size:** 252,285 LOC
- **Project Status:** Production-ready with POC features

---

## Contact & Support

For questions or clarifications:
1. Check comprehensive documentation in `.agents/summary/`
2. Consult external documentation links above

---

**Remember:** This is a living document. Update it as the codebase evolves and new patterns emerge.
