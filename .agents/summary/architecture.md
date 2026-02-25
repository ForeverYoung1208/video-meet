# System Architecture

## Overview

Video Meet is a full-stack video conferencing application built with a microservices-inspired architecture, featuring a NestJS backend, React frontend, and integration with LiveKit/OpenVidu for real-time video communication.

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        UI[React Frontend<br/>video-meet-ui]
    end
    
    subgraph "API Layer"
        API[NestJS Backend<br/>video-meet-api]
    end
    
    subgraph "Video Infrastructure"
        LK[LiveKit Server]
        OV[OpenVidu Server]
    end
    
    subgraph "Data Layer"
        MONGO[(MongoDB)]
        REDIS[(Redis)]
    end
    
    subgraph "Storage Layer"
        S3[AWS S3]
        ABS[Azure Blob]
        GCS[Google Cloud Storage]
    end
    
    subgraph "Cloud Infrastructure"
        LAMBDA[AWS Lambda]
        CF[CloudFront]
        S3STATIC[S3 Static Hosting]
    end
    
    UI -->|REST API| API
    UI -->|WebRTC| LK
    UI -->|WebRTC| OV
    API -->|SDK| LK
    API -->|SDK| OV
    API -->|Data| MONGO
    API -->|Cache/PubSub| REDIS
    API -->|Recordings| S3
    API -->|Recordings| ABS
    API -->|Recordings| GCS
    LK -->|Webhooks| API
    OV -->|Webhooks| API
    API -.->|Deployed as| LAMBDA
    UI -.->|Deployed to| S3STATIC
    CF -.->|CDN| S3STATIC
```

## Backend Architecture

### Modular Design

The backend follows NestJS modular architecture with clear separation of concerns:

```mermaid
graph LR
    subgraph "Core Modules"
        AUTH[Auth Module]
        MEET[Meetings Module]
        REC[Recordings Module]
        OV[OpenVidu Module]
        USER[Users Module]
    end
    
    subgraph "Infrastructure"
        DB[Database Config]
        REDIS_MOD[Redis Service]
        STORAGE[Storage Providers]
    end
    
    subgraph "Cross-Cutting"
        FILTERS[Exception Filters]
        INTER[Interceptors]
        GUARDS[Guards]
        DECORATORS[Decorators]
    end
    
    AUTH --> DB
    MEET --> DB
    MEET --> REDIS_MOD
    REC --> DB
    REC --> STORAGE
    OV --> MEET
    FILTERS -.-> AUTH
    FILTERS -.-> MEET
    FILTERS -.-> REC
    GUARDS -.-> AUTH
```

### Layered Architecture

```mermaid
graph TD
    subgraph "Presentation Layer"
        CTRL[Controllers]
        MW[Middlewares]
    end
    
    subgraph "Business Logic Layer"
        SVC[Services]
        HELPER[Helpers]
    end
    
    subgraph "Data Access Layer"
        REPO[Repositories]
        ENTITY[Entities]
    end
    
    subgraph "External Integration Layer"
        LK_SDK[LiveKit SDK]
        OV_SDK[OpenVidu SDK]
        STORAGE_SDK[Storage SDKs]
    end
    
    CTRL --> MW
    MW --> SVC
    SVC --> HELPER
    SVC --> REPO
    SVC --> LK_SDK
    SVC --> OV_SDK
    SVC --> STORAGE_SDK
    REPO --> ENTITY
```

## Frontend Architecture

### Component Hierarchy

```mermaid
graph TD
    APP[App Component]
    APP --> AUTH_UI[Authentication UI]
    APP --> MEET_UI[Meeting UI]
    APP --> ADMIN[Admin UI]
    
    MEET_UI --> VIDEO[Video Grid]
    MEET_UI --> CONTROLS[Media Controls]
    MEET_UI --> CHAT[Chat Panel]
    MEET_UI --> PARTICIPANTS[Participant List]
    
    ADMIN --> USER_MGMT[User Management]
    ADMIN --> ROOM_MGMT[Room Management]
    ADMIN --> REC_MGMT[Recording Management]
    
    VIDEO --> API_CLIENT[API Client]
    CONTROLS --> API_CLIENT
    USER_MGMT --> API_CLIENT
    
    API_CLIENT --> STORE[State Store]
```

## Data Flow Architecture

### Meeting Creation Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant LiveKit
    participant MongoDB
    participant Redis
    
    Client->>API: POST /meetings
    API->>MongoDB: Create meeting record
    MongoDB-->>API: Meeting ID
    API->>LiveKit: Create room
    LiveKit-->>API: Room created
    API->>Redis: Cache room metadata
    API-->>Client: Meeting details + token
```

### Recording Workflow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant LiveKit
    participant Storage
    participant MongoDB
    participant Redis
    
    Client->>API: POST /recordings/start
    API->>Redis: Acquire recording lock
    API->>MongoDB: Create recording record
    API->>LiveKit: Start egress
    LiveKit-->>API: Egress started
    API-->>Client: Recording started
    
    Note over LiveKit,Storage: Recording in progress
    
    LiveKit->>API: Webhook: Egress ended
    API->>Storage: Upload recording
    Storage-->>API: Upload complete
    API->>MongoDB: Update recording status
    API->>Redis: Release lock
    API->>Client: Webhook notification
```

### Webhook Processing

```mermaid
sequenceDiagram
    participant LiveKit
    participant API
    participant MongoDB
    participant Redis
    participant Frontend
    
    LiveKit->>API: Webhook event
    API->>API: Validate signature
    API->>MongoDB: Query room/recording
    
    alt Participant Event
        API->>MongoDB: Update participant status
        API->>Redis: Publish event
        Redis->>Frontend: Real-time update
    else Recording Event
        API->>MongoDB: Update recording status
        API->>API: Trigger cleanup tasks
    else Room Event
        API->>MongoDB: Update room status
        API->>Redis: Update cache
    end
    
    API-->>LiveKit: 200 OK
```

## Storage Architecture

### Multi-Cloud Storage Strategy

```mermaid
graph TB
    subgraph "Storage Abstraction"
        BLOB[BlobStorageService]
    end
    
    subgraph "Provider Implementations"
        S3P[S3StorageProvider]
        ABSP[ABSStorageProvider]
        GCSP[GCSStorageProvider]
    end
    
    subgraph "Cloud Services"
        S3[AWS S3]
        ABS[Azure Blob Storage]
        GCS[Google Cloud Storage]
    end
    
    BLOB --> S3P
    BLOB --> ABSP
    BLOB --> GCSP
    
    S3P --> S3
    ABSP --> ABS
    GCSP --> GCS
```

### Storage Operations

- **Recording Upload:** Streaming upload with retry logic
- **Recording Download:** Range request support for partial downloads
- **Batch Deletion:** Efficient bulk delete operations
- **Health Checks:** Provider availability monitoring

## Distributed Systems Patterns

### Distributed Locking

```mermaid
graph LR
    subgraph "Concurrent Operations"
        OP1[Operation 1]
        OP2[Operation 2]
        OP3[Operation 3]
    end
    
    subgraph "Mutex Service"
        REDIS[(Redis)]
        LOCK[Redlock Algorithm]
    end
    
    OP1 -->|Acquire| LOCK
    OP2 -->|Acquire| LOCK
    OP3 -->|Acquire| LOCK
    LOCK -->|Store| REDIS
    LOCK -->|Release| REDIS
```

**Use Cases:**
- Recording start/stop operations
- Participant name reservation
- Room status updates

### Pub/Sub Pattern

```mermaid
graph LR
    subgraph "Publishers"
        WEBHOOK[Webhook Handler]
        SCHEDULER[Task Scheduler]
    end
    
    subgraph "Redis Pub/Sub"
        CHANNEL[Event Channels]
    end
    
    subgraph "Subscribers"
        FRONTEND[Frontend Clients]
        WORKER[Background Workers]
    end
    
    WEBHOOK -->|Publish| CHANNEL
    SCHEDULER -->|Publish| CHANNEL
    CHANNEL -->|Subscribe| FRONTEND
    CHANNEL -->|Subscribe| WORKER
```

## Scheduled Tasks Architecture

```mermaid
graph TD
    SCHEDULER[Task Scheduler Service]
    
    SCHEDULER --> ROOM_GC[Room Garbage Collection]
    SCHEDULER --> REC_GC[Recording Cleanup]
    SCHEDULER --> LOCK_GC[Lock Cleanup]
    SCHEDULER --> NAME_GC[Name Pool Cleanup]
    
    ROOM_GC -->|Delete expired| MONGO[(MongoDB)]
    REC_GC -->|Abort stale| LIVEKIT[LiveKit]
    LOCK_GC -->|Release orphaned| REDIS[(Redis)]
    NAME_GC -->|Clean reservations| REDIS
```

**Scheduled Tasks:**
- **Room Validation:** Check and cleanup expired rooms
- **Recording Cleanup:** Abort stale recordings, release locks
- **Participant Name Cleanup:** Release expired name reservations
- **Lock Maintenance:** Remove orphaned distributed locks

## Security Architecture

### Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant AuthService
    participant MongoDB
    
    Client->>API: POST /auth/signin
    API->>AuthService: Validate credentials
    AuthService->>MongoDB: Query user
    MongoDB-->>AuthService: User data
    AuthService->>AuthService: Generate JWT + Refresh Token
    AuthService-->>API: Tokens
    API-->>Client: Access + Refresh tokens
    
    Note over Client,API: Subsequent requests
    
    Client->>API: Request with JWT
    API->>API: Validate JWT
    API->>API: Extract user context
    API-->>Client: Protected resource
```

### Authorization Layers

1. **JWT Guards:** Validate access tokens
2. **Role-Based Access:** Moderator, Speaker, Viewer roles
3. **Recording Permissions:** Separate permissions for recording operations
4. **Room Access Control:** Secret-based room access

## Deployment Architecture

### AWS Infrastructure (CDK)

```mermaid
graph TB
    subgraph "Frontend"
        S3_UI[S3 Bucket<br/>Static Hosting]
        CF[CloudFront<br/>Distribution]
    end
    
    subgraph "Backend"
        LAMBDA[Lambda Function<br/>NestJS API]
        APIGW[API Gateway]
    end
    
    subgraph "Data"
        MONGO_ATLAS[MongoDB Atlas]
        ELASTICACHE[ElastiCache<br/>Redis]
    end
    
    subgraph "Storage"
        S3_REC[S3 Bucket<br/>Recordings]
    end
    
    CF --> S3_UI
    APIGW --> LAMBDA
    LAMBDA --> MONGO_ATLAS
    LAMBDA --> ELASTICACHE
    LAMBDA --> S3_REC
```

### Container Deployment (Alternative)

```mermaid
graph TB
    subgraph "Docker Compose"
        API_CONTAINER[NestJS API Container]
        MONGO_CONTAINER[MongoDB Container]
        REDIS_CONTAINER[Redis Container]
        LIVEKIT_CONTAINER[LiveKit Container]
    end
    
    API_CONTAINER --> MONGO_CONTAINER
    API_CONTAINER --> REDIS_CONTAINER
    API_CONTAINER --> LIVEKIT_CONTAINER
```

## Design Patterns

### Repository Pattern
- Abstracts data access logic
- Provides consistent interface for CRUD operations
- Supports cursor-based pagination

### Service Layer Pattern
- Encapsulates business logic
- Coordinates between repositories and external services
- Handles transaction management

### Provider Pattern
- Pluggable storage implementations
- Consistent interface across cloud providers
- Easy to add new providers

### Observer Pattern
- Webhook event handling
- Real-time updates via Redis pub/sub
- Frontend event subscriptions

### Strategy Pattern
- Different recording strategies (composite, track)
- Multiple authentication strategies
- Configurable deletion policies

## Scalability Considerations

### Horizontal Scaling
- Stateless API design
- Redis for shared state
- Load balancer ready

### Vertical Scaling
- Efficient database queries with indexes
- Connection pooling
- Caching strategies

### Performance Optimizations
- Cursor-based pagination
- Lazy loading
- Background job processing
- CDN for static assets

## Monitoring & Observability

### Health Checks
- Database connectivity
- Redis connectivity
- Storage provider availability
- LiveKit/OpenVidu connectivity

### Logging
- Structured logging with context
- Request/response logging
- Error tracking
- Webhook event logging

## Technology Decisions

### Why NestJS?
- Enterprise-grade architecture
- Built-in dependency injection
- TypeScript support
- Extensive ecosystem

### Why LiveKit/OpenVidu?
- Open-source WebRTC infrastructure
- Recording capabilities
- Scalable architecture
- Webhook support

### Why MongoDB?
- Flexible schema for evolving requirements
- Good performance for read-heavy workloads
- Native JSON support
- Easy replication

### Why Redis?
- Fast in-memory operations
- Pub/sub capabilities
- Distributed locking (Redlock)
- Session management

### Why Multi-Cloud Storage?
- Vendor flexibility
- Cost optimization
- Geographic distribution
- Redundancy options
