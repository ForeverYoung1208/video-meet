# Interfaces and APIs

## Overview

This document describes the APIs, interfaces, and integration points in the Video Meet application.

## REST API Endpoints

### Authentication Module

#### POST /auth/signin
**Purpose:** User authentication  
**Request Body:**
```typescript
{
  email: string;
  password: string;
}
```
**Response:**
```typescript
{
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
  }
}
```

#### POST /auth/refresh
**Purpose:** Refresh access token  
**Request Body:**
```typescript
{
  refreshToken: string;
}
```
**Response:**
```typescript
{
  accessToken: string;
  refreshToken: string;
}
```

---

### Meetings Module

#### POST /meetings
**Purpose:** Create new meeting room  
**Request Body:**
```typescript
{
  name: string;
  maxParticipants?: number;
  recordingEnabled?: boolean;
  expiresAt?: Date;
}
```
**Response:**
```typescript
{
  id: string;
  name: string;
  roomId: string;
  token: string;
  createdAt: Date;
}
```

#### GET /meetings
**Purpose:** List all meetings  
**Query Parameters:**
- `cursor?: string` - Pagination cursor
- `limit?: number` - Results per page (default: 20)
- `status?: 'active' | 'ended' | 'expired'`

**Response:**
```typescript
{
  data: Meeting[];
  nextCursor?: string;
  hasMore: boolean;
}
```

#### GET /meetings/:id
**Purpose:** Get meeting details  
**Response:**
```typescript
{
  id: string;
  name: string;
  roomId: string;
  status: string;
  participants: number;
  createdAt: Date;
  expiresAt?: Date;
}
```

#### POST /meetings/:id/tokens
**Purpose:** Generate participant tokens  
**Request Body:**
```typescript
{
  participantName: string;
  role: 'moderator' | 'speaker' | 'viewer';
  secret?: string;
}
```
**Response:**
```typescript
{
  token: string;
  participantId: string;
}
```

#### DELETE /meetings/:id
**Purpose:** End meeting and cleanup resources  
**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

---

### Recordings Module

#### POST /recordings/start
**Purpose:** Start recording a meeting  
**Request Body:**
```typescript
{
  roomId: string;
  layout?: 'grid' | 'speaker' | 'custom';
  encoding?: 'h264' | 'vp8' | 'vp9';
  fileOutput?: {
    filepath: string;
    disableManifest?: boolean;
  };
}
```
**Response:**
```typescript
{
  recordingId: string;
  status: 'starting' | 'active';
  startedAt: Date;
}
```

#### POST /recordings/:id/stop
**Purpose:** Stop active recording  
**Response:**
```typescript
{
  recordingId: string;
  status: 'stopping' | 'complete';
  stoppedAt: Date;
  duration: number;
}
```

#### GET /recordings
**Purpose:** List recordings  
**Query Parameters:**
- `cursor?: string`
- `limit?: number`
- `roomId?: string`
- `status?: 'active' | 'complete' | 'failed'`

**Response:**
```typescript
{
  data: Recording[];
  nextCursor?: string;
  hasMore: boolean;
}
```

#### GET /recordings/:id
**Purpose:** Get recording details  
**Response:**
```typescript
{
  id: string;
  roomId: string;
  status: string;
  duration: number;
  size: number;
  startedAt: Date;
  endedAt?: Date;
  downloadUrl: string;
}
```

#### GET /recordings/:id/media
**Purpose:** Download recording media  
**Headers:**
- `Range: bytes=0-1023` (optional, for partial content)

**Response:**
- Content-Type: video/mp4 or application/json
- Status: 200 (full) or 206 (partial)
- Body: Video stream or recording data

#### DELETE /recordings/:id
**Purpose:** Delete recording and media files  
**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

---

### OpenVidu Module

#### POST /openvidu/webhook
**Purpose:** Receive LiveKit/OpenVidu webhooks  
**Headers:**
- `Authorization: Bearer <webhook-secret>`

**Request Body:**
```typescript
{
  event: string;
  room?: {
    sid: string;
    name: string;
  };
  participant?: {
    sid: string;
    identity: string;
  };
  egressInfo?: {
    egressId: string;
    status: string;
  };
}
```

**Response:**
```typescript
{
  success: boolean;
}
```

---

## Internal Service Interfaces

### IStorageProvider
**Purpose:** Abstract storage provider interface

```typescript
interface IStorageProvider {
  getObject(key: string): Promise<Buffer>;
  putObject(key: string, data: Buffer): Promise<void>;
  deleteObject(key: string): Promise<void>;
  deleteObjects(keys: string[]): Promise<void>;
  exists(key: string): Promise<boolean>;
  listObjects(prefix: string): Promise<string[]>;
  getObjectHeaders(key: string): Promise<Record<string, string>>;
  getObjectAsStream(key: string, range?: string): Promise<Readable>;
  checkHealth(): Promise<boolean>;
}
```

**Implementations:**
- `S3StorageProvider`
- `ABSStorageProvider`
- `GCSStorageProvider`

---

### IRepository<T>
**Purpose:** Generic repository interface

```typescript
interface IRepository<T> {
  findOne(filter: any): Promise<T | null>;
  findAll(): Promise<T[]>;
  findMany(filter: any, options?: FindOptions): Promise<T[]>;
  createDocument(data: Partial<T>): Promise<T>;
  updateOne(filter: any, update: any): Promise<T | null>;
  deleteOne(filter: any): Promise<boolean>;
  deleteMany(filter: any): Promise<number>;
  count(filter: any): Promise<number>;
}
```

---

### IMutexService
**Purpose:** Distributed locking interface

```typescript
interface IMutexService {
  acquire(key: string, ttl: number): Promise<Lock>;
  release(lock: Lock): Promise<void>;
  lockExists(key: string): Promise<boolean>;
  getLocksByPrefix(prefix: string): Promise<string[]>;
  getLockCreatedAt(key: string): Promise<Date | null>;
  getLockData(key: string): Promise<any>;
}
```

---

## External SDK Integrations

### LiveKit Server SDK

#### Room Management
```typescript
import { RoomServiceClient } from 'livekit-server-sdk';

const roomService = new RoomServiceClient(host, apiKey, apiSecret);

// Create room
await roomService.createRoom({
  name: 'room-name',
  emptyTimeout: 300,
  maxParticipants: 50,
});

// List rooms
const rooms = await roomService.listRooms();

// Delete room
await roomService.deleteRoom('room-name');
```

#### Token Generation
```typescript
import { AccessToken } from 'livekit-server-sdk';

const token = new AccessToken(apiKey, apiSecret, {
  identity: 'user-id',
  name: 'User Name',
});

token.addGrant({
  roomJoin: true,
  room: 'room-name',
  canPublish: true,
  canSubscribe: true,
});

const jwt = token.toJwt();
```

#### Egress (Recording)
```typescript
import { EgressClient } from 'livekit-server-sdk';

const egressClient = new EgressClient(host, apiKey, apiSecret);

// Start room composite recording
await egressClient.startRoomCompositeEgress('room-name', {
  file: {
    filepath: '/recordings/room-name.mp4',
  },
  layout: 'grid',
  videoOnly: false,
});

// Stop egress
await egressClient.stopEgress('egress-id');
```

---

### MongoDB Integration

#### Connection
```typescript
import { MongoClient } from 'mongodb';

const client = new MongoClient(connectionString);
await client.connect();
const db = client.db('video-meet');
```

#### Collections
- `rooms` - Meeting room data
- `recordings` - Recording metadata
- `users` - User accounts
- `migrations` - Schema version tracking
- `global_config` - Application configuration

---

### Redis Integration

#### Basic Operations
```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

// Set/Get
await redis.set('key', 'value', 'EX', 3600);
const value = await redis.get('key');

// Pub/Sub
await redis.publish('channel', JSON.stringify(data));
await redis.subscribe('channel');
redis.on('message', (channel, message) => {
  // Handle message
});
```

#### Distributed Locking (Redlock)
```typescript
import Redlock from 'redlock';

const redlock = new Redlock([redis], {
  retryCount: 3,
  retryDelay: 200,
});

const lock = await redlock.acquire(['resource-key'], 5000);
try {
  // Critical section
} finally {
  await lock.release();
}
```

---

### AWS SDK Integration

#### S3 Operations
```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'us-east-1' });

// Upload
await s3.send(new PutObjectCommand({
  Bucket: 'recordings-bucket',
  Key: 'recording.mp4',
  Body: buffer,
}));

// Download
const response = await s3.send(new GetObjectCommand({
  Bucket: 'recordings-bucket',
  Key: 'recording.mp4',
}));
```

---

### Azure Blob Storage Integration

```typescript
import { BlobServiceClient } from '@azure/storage-blob';

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient('recordings');

// Upload
const blockBlobClient = containerClient.getBlockBlobClient('recording.mp4');
await blockBlobClient.upload(buffer, buffer.length);

// Download
const downloadResponse = await blockBlobClient.download();
```

---

### Google Cloud Storage Integration

```typescript
import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const bucket = storage.bucket('recordings-bucket');

// Upload
await bucket.file('recording.mp4').save(buffer);

// Download
const [contents] = await bucket.file('recording.mp4').download();
```

---

## Webhook Interfaces

### Incoming Webhooks (from LiveKit)

#### Egress Started
```typescript
{
  event: 'egress_started',
  egressInfo: {
    egressId: string;
    roomId: string;
    roomName: string;
    status: 'EGRESS_STARTING';
    startedAt: number;
  }
}
```

#### Egress Ended
```typescript
{
  event: 'egress_ended',
  egressInfo: {
    egressId: string;
    roomId: string;
    roomName: string;
    status: 'EGRESS_COMPLETE' | 'EGRESS_FAILED';
    startedAt: number;
    endedAt: number;
    fileResults: [{
      filename: string;
      size: number;
      duration: number;
    }];
  }
}
```

#### Participant Joined
```typescript
{
  event: 'participant_joined',
  room: {
    sid: string;
    name: string;
  };
  participant: {
    sid: string;
    identity: string;
    name: string;
    metadata: string;
  };
  createdAt: number;
}
```

#### Participant Left
```typescript
{
  event: 'participant_left',
  room: {
    sid: string;
    name: string;
  };
  participant: {
    sid: string;
    identity: string;
  };
  createdAt: number;
}
```

#### Room Started
```typescript
{
  event: 'room_started',
  room: {
    sid: string;
    name: string;
    creationTime: number;
  };
  createdAt: number;
}
```

#### Room Finished
```typescript
{
  event: 'room_finished',
  room: {
    sid: string;
    name: string;
    creationTime: number;
  };
  createdAt: number;
}
```

---

### Outgoing Webhooks (to external services)

#### Meeting Started
```typescript
{
  event: 'meeting.started',
  timestamp: string;
  data: {
    roomId: string;
    roomName: string;
    startedAt: string;
  }
}
```

#### Meeting Ended
```typescript
{
  event: 'meeting.ended',
  timestamp: string;
  data: {
    roomId: string;
    roomName: string;
    startedAt: string;
    endedAt: string;
    duration: number;
    participantCount: number;
  }
}
```

#### Recording Started
```typescript
{
  event: 'recording.started',
  timestamp: string;
  data: {
    recordingId: string;
    roomId: string;
    startedAt: string;
  }
}
```

#### Recording Ended
```typescript
{
  event: 'recording.ended',
  timestamp: string;
  data: {
    recordingId: string;
    roomId: string;
    startedAt: string;
    endedAt: string;
    duration: number;
    size: number;
    downloadUrl: string;
  }
}
```

**Webhook Security:**
- HMAC-SHA256 signature in `X-Webhook-Signature` header
- Signature verification required
- Configurable secret key

---

## Data Models (Zod Schemas)

### Room Schema
**Location:** `video-meet-api/example-openvidu/backend/src/models/zod-schemas/room.schema.ts`  
**Lines of Code:** 451

**Key Fields:**
```typescript
{
  roomId: string;
  name: string;
  status: 'active' | 'ended' | 'expired';
  maxParticipants: number;
  createdAt: Date;
  expiresAt?: Date;
  recordingEnabled: boolean;
  metadata?: Record<string, any>;
}
```

---

### Recording Schema
**Location:** `video-meet-api/example-openvidu/backend/src/models/zod-schemas/recording.schema.ts`  
**Lines of Code:** 144

**Key Fields:**
```typescript
{
  recordingId: string;
  roomId: string;
  status: 'starting' | 'active' | 'stopping' | 'complete' | 'failed';
  startedAt: Date;
  endedAt?: Date;
  duration?: number;
  size?: number;
  layout: string;
  encoding: string;
  filepath: string;
}
```

---

## Frontend API Client

### API Client Interface
**Location:** `video-meet-ui/src/api/`

```typescript
class ApiClient {
  // Authentication
  signin(email: string, password: string): Promise<AuthResponse>;
  refresh(refreshToken: string): Promise<AuthResponse>;
  
  // Meetings
  createMeeting(data: CreateMeetingDto): Promise<Meeting>;
  getMeetings(params?: ListParams): Promise<PaginatedResponse<Meeting>>;
  getMeeting(id: string): Promise<Meeting>;
  deleteMeeting(id: string): Promise<void>;
  generateToken(meetingId: string, data: TokenRequest): Promise<TokenResponse>;
  
  // Recordings
  startRecording(data: StartRecordingDto): Promise<Recording>;
  stopRecording(id: string): Promise<Recording>;
  getRecordings(params?: ListParams): Promise<PaginatedResponse<Recording>>;
  getRecording(id: string): Promise<Recording>;
  deleteRecording(id: string): Promise<void>;
}
```

---

## WebSocket/Real-time Communication

### LiveKit Client Integration
```typescript
import { Room, RoomEvent } from 'livekit-client';

const room = new Room();

// Connect to room
await room.connect(livekitUrl, token);

// Event listeners
room.on(RoomEvent.ParticipantConnected, (participant) => {
  console.log('Participant joined:', participant.identity);
});

room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
  // Attach track to DOM
});

room.on(RoomEvent.DataReceived, (payload, participant) => {
  // Handle data messages
});

// Publish tracks
await room.localParticipant.publishTrack(audioTrack);
await room.localParticipant.publishTrack(videoTrack);
```

---

## Error Responses

### Standard Error Format
```typescript
{
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}
```

### Common Error Codes
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

---

## Rate Limiting

**Default Limits:**
- Authentication endpoints: 5 requests/minute
- Meeting creation: 10 requests/minute
- Recording operations: 5 requests/minute
- General API: 100 requests/minute

---

## API Versioning

**Current Version:** v1  
**Base Path:** `/api/v1`

Future versions will be introduced with new base paths (e.g., `/api/v2`) while maintaining backward compatibility.
