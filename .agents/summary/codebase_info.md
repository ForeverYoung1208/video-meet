# Codebase Information

## Project Overview

**Project Name:** Video Meet  
**Type:** Full-stack video conferencing application  
**Size Category:** XXL (252,285 lines of code across 6,240 files)

## Repository Structure

The codebase is organized into two main applications with supporting infrastructure:

```
video-meet/
├── video-meet-api/          # Backend NestJS application
├── video-meet-ui/           # Frontend React application
└── openvidu-local-deployment/ # OpenVidu deployment configurations
```

## Technology Stack

### Backend (video-meet-api)
- **Framework:** NestJS (Node.js/TypeScript)
- **Video Infrastructure:** OpenVidu/LiveKit
- **Database:** MongoDB
- **Caching/Messaging:** Redis
- **Cloud Storage:** AWS S3, Azure Blob Storage, Google Cloud Storage
- **Infrastructure as Code:** AWS CDK
- **Authentication:** JWT-based authentication
- **API Documentation:** REST API with HTTP test files

### Frontend (video-meet-ui)
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **State Management:** Custom store implementation
- **UI Components:** Custom component library

### Infrastructure
- **Deployment:** AWS (Lambda, S3, CloudFront via CDK)
- **Containerization:** Docker & Docker Compose
- **Video Server:** OpenVidu (Community & Pro editions)

## Programming Languages

Based on the codebase analysis:

1. **TypeScript** - Primary language (Backend & Frontend)
2. **JavaScript** - Build configurations and CDK outputs
3. **Python** - AWS Lambda functions
4. **Shell** - Deployment and setup scripts

## Architecture Patterns

### Backend Architecture
- **Modular Architecture:** NestJS modules for separation of concerns
- **Repository Pattern:** Data access abstraction
- **Service Layer:** Business logic encapsulation
- **Exception Handling:** Custom exception filters and handlers
- **Dependency Injection:** NestJS DI container

### Key Modules (Backend)
- `auth` - Authentication and authorization
- `meetings` - Meeting/room management
- `recordings` - Recording management
- `openvidu` - OpenVidu integration
- `users` - User management

### Frontend Architecture
- **Component-Based:** React functional components
- **API Layer:** Centralized API client
- **State Management:** Custom store with hooks
- **Routing:** React Router (implied)

## Major Components

### Backend Services (252,285 LOC)

**Core Services:**
- `RecordingService` (759 LOC) - Recording lifecycle management
- `RoomService` (620 LOC) - Meeting room operations
- `LiveKitService` (411 LOC) - LiveKit integration
- `RoomMemberService` (388 LOC) - Participant management
- `RedisService` (386 LOC) - Caching and pub/sub
- `ParticipantNameService` (353 LOC) - Unique name generation
- `RecordingScheduledTasksService` (332 LOC) - Recording cleanup
- `OpenViduWebhookService` (330 LOC) - Webhook handling
- `LivekitWebhookService` (369 LOC) - LiveKit webhook processing
- `MigrationService` (270 LOC) - Database migrations
- `GlobalConfigService` (231 LOC) - Configuration management

**Storage Providers:**
- `S3Service` (336 LOC) - AWS S3 integration
- `GCSService` (359 LOC) - Google Cloud Storage
- `ABSService` (309 LOC) - Azure Blob Storage
- `BlobStorageService` (219 LOC) - Unified storage interface
- `MongoDBService` (141 LOC) - Database connection management

**Repositories:**
- `RoomRepository` (268 LOC) - Room data persistence
- `RecordingRepository` (232 LOC) - Recording data persistence
- `BaseRepository` (374 LOC) - Common repository operations

**Helpers & Utilities:**
- `RecordingHelper` (264 LOC) - Recording data transformation
- `TaskSchedulerService` (163 LOC) - Cron job management
- `MutexService` (156 LOC) - Distributed locking

### Frontend Components

**Main Components:**
- `UserManagement` (313 LOC) - User administration
- `MediaControls` (147 LOC) - Audio/video controls
- `App` - Main application component

### Infrastructure

**AWS CDK Stack:**
- `InfraStack` (647 LOC TypeScript, 454 LOC JavaScript) - Complete AWS infrastructure definition
- Lambda functions for custom resources
- S3 deployment automation
- CloudFront distribution setup

## Dependencies

### Backend Key Dependencies
- `@nestjs/core`, `@nestjs/common` - NestJS framework
- `livekit-server-sdk` - LiveKit integration
- `mongodb`, `mongoose` - Database
- `redis`, `ioredis` - Caching
- `@aws-sdk/*` - AWS services
- `@azure/storage-blob` - Azure storage
- `@google-cloud/storage` - GCS
- `passport`, `passport-jwt` - Authentication
- `class-validator`, `class-transformer` - Validation
- `rxjs` - Reactive programming

### Frontend Key Dependencies
- `react`, `react-dom` - UI framework
- `livekit-client` - Video client SDK
- `axios` - HTTP client
- `zustand` (implied) - State management
- `tailwindcss` - Styling

### Infrastructure Dependencies
- `aws-cdk-lib` - AWS CDK framework
- `constructs` - CDK constructs

## File Organization

### Backend Structure
```
video-meet-api/
├── src/
│   ├── modules/          # Feature modules
│   │   ├── auth/
│   │   ├── meetings/
│   │   ├── recordings/
│   │   ├── openvidu/
│   │   └── users/
│   ├── entities/         # Database entities
│   ├── exceptions/       # Custom exceptions
│   ├── exception-filters/ # Exception handlers
│   ├── config/           # Configuration
│   ├── decorators/       # Custom decorators
│   ├── helpers/          # Utility functions
│   ├── interceptors/     # Request/response interceptors
│   ├── constants/        # Application constants
│   └── db/               # Database configuration
├── infra/                # AWS CDK infrastructure
├── example/              # Example NestJS application
├── example-openvidu/     # OpenVidu backend example
├── docker/               # Docker configurations
└── http/                 # API test files

### Frontend Structure
```
video-meet-ui/
├── src/
│   ├── components/       # React components
│   ├── api/              # API client
│   ├── store/            # State management
│   ├── lib/              # Utilities
│   └── assets/           # Static assets
└── public/               # Public assets
```

## Design Principles

1. **Separation of Concerns:** Clear module boundaries
2. **Dependency Injection:** Loose coupling via NestJS DI
3. **Repository Pattern:** Data access abstraction
4. **Multi-Cloud Support:** Pluggable storage providers
5. **Webhook-Driven:** Event-driven architecture with LiveKit/OpenVidu
6. **Scheduled Tasks:** Background job processing
7. **Distributed Systems:** Redis-based locking and pub/sub
8. **Type Safety:** Full TypeScript coverage

## Notable Features

- **Multi-Cloud Storage:** Support for AWS S3, Azure Blob, and GCS
- **Recording Management:** Complete recording lifecycle with scheduled cleanup
- **Participant Management:** Unique name generation and role-based permissions
- **Webhook Integration:** LiveKit and OpenVidu webhook processing
- **Distributed Locking:** Redis-based mutex for concurrent operations
- **Database Migrations:** Automated schema migration system
- **Infrastructure as Code:** Complete AWS deployment via CDK
- **Authentication:** JWT-based auth with refresh tokens
- **Real-time Communication:** WebRTC via LiveKit/OpenVidu

## Development Setup

- **Node Version:** Specified in `.nvmrc` (version 8)
- **Package Manager:** npm
- **Docker Support:** Docker Compose for local development
- **Code Quality:** ESLint, Prettier
- **Testing:** Jest configuration present

## Deployment

- **Backend:** AWS Lambda (serverless) or containerized
- **Frontend:** Static hosting (S3 + CloudFront)
- **Video Server:** Self-hosted OpenVidu or LiveKit
- **Database:** MongoDB (Atlas or self-hosted)
- **Cache:** Redis (ElastiCache or self-hosted)
