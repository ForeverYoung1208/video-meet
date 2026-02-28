# AGENTS.md - AI Assistant Quick Reference

## Purpose

Quick reference guide for AI assistants working with the Video Meet codebase. For detailed patterns and examples, see `.agents/summary/coding_patterns.md`.

---

## ⚠️ Critical Warnings - Read First

### 1. OpenVidu 3.x Uses LiveKit SDK
- **DO NOT** use `openvidu-node-client` (deprecated)
- **USE** `livekit-server-sdk` and `livekit-client`
- Reference: https://docs.livekit.io/

### 2. OpenVidu is Isolated 3rd Party Service
- OpenVidu runs separately with its own MongoDB and Redis
- Main API uses PostgreSQL (not OpenVidu's MongoDB)
- Main API uses Redis on **port 6380** (not OpenVidu's Redis on 6379)
- Only integration point is LiveKit SDK

### 3. Redis Port Configuration
- **Main API Redis:** port 6380
- **OpenVidu Redis:** port 6379
- Ports separated to avoid conflicts

### 4. No Tests During POC
- Do not add tests unless explicitly requested
- Tests will be added after POC stage

### 5. Always Use Distributed Locking
- Recording start/stop operations
- Participant name reservation
- Any critical section requiring mutual exclusion

### 6. Cursor-Based Pagination
- Use for all list endpoints
- Encode/decode cursors in repositories
- Return `nextCursor` and `hasMore` in responses

### 7. Environment Variables
- Never commit `.env` files
- Use `.env.example` as template
- Validate configuration on startup

---

## 📚 Documentation Navigator

### Quick Decision Guide

| I need to... | Check file... |
|-------------|---------------|
| Understand project overview | `.agents/summary/codebase_info.md` |
| Learn system architecture | `.agents/summary/architecture.md` |
| **Implement a feature** | **`.agents/summary/coding_patterns.md`** |
| Find API endpoints | `.agents/summary/interfaces.md` |
| Understand a component | `.agents/summary/components.md` |
| See process flows | `.agents/summary/workflows.md` |
| Check database schemas | `.agents/summary/data_models.md` |
| Review dependencies | `.agents/summary/dependencies.md` |

### Documentation Structure

```
.agents/summary/
├── index.md              # Navigation hub with metadata
├── codebase_info.md      # Project overview (252K LOC, tech stack)
├── architecture.md       # System design and patterns
├── coding_patterns.md    # ⭐ Detailed implementation patterns
├── components.md         # 30+ component descriptions
├── interfaces.md         # API endpoints and integrations
├── data_models.md        # Database schemas
├── workflows.md          # 18 process flow diagrams
└── dependencies.md       # External libraries
```

---

## Project Overview

**Video Meet** - Full-stack video conferencing application  
**Size:** 252,285 LOC across 6,240 files  
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

### Backend
- **Framework:** NestJS 10.x | **Language:** TypeScript 5.x
- **Database:** PostgreSQL 17.5 (TypeORM)
- **Cache/Messaging:** Redis (port 6380)
- **Video:** LiveKit/OpenVidu 3.x (isolated service)
- **Storage:** AWS S3, Azure Blob, GCS
- **Auth:** JWT (Passport + @nestjs/jwt)
- **Validation:** class-validator, class-transformer
- **Infrastructure:** AWS CDK 2.x

### Frontend
- **Framework:** React 18.x | **Build:** Vite 5.x
- **Language:** TypeScript 5.x | **Styling:** Tailwind CSS 3.x
- **Video Client:** livekit-client 2.x
- **HTTP:** Axios 1.x | **State:** Custom store

### Infrastructure
- **Deployment:** AWS Lambda (serverless) or Docker
- **CDN:** CloudFront | **Storage:** S3
- **Video Server:** Self-hosted LiveKit/OpenVidu

---

## Directory Structure

### Backend (video-meet-api/src/)
```
src/
├── modules/              # Feature modules (auth, meetings, recordings, etc.)
├── entities/            # Database entities (TypeORM)
├── exceptions/          # Custom exception classes
├── exception-filters/   # Global exception handlers
├── config/              # Configuration modules
├── decorators/          # Custom decorators
├── helpers/             # Utility functions
├── interceptors/        # Request/response interceptors
├── constants/           # Application constants
└── db/                  # Database configuration
```

### Frontend (video-meet-ui/src/)
```
src/
├── components/          # React components
├── api/                 # API client
├── store/               # State management
├── lib/                 # Utilities
├── assets/              # Static assets
└── App.tsx              # Main component
```

---

## Essential Coding Patterns

> **For detailed examples and step-by-step workflows, see `.agents/summary/coding_patterns.md`**

### 1. Module Organization
Each NestJS module follows:
```
module-name/
├── module-name.module.ts       # Module definition
├── module-name.controller.ts   # REST endpoints
├── module-name.service.ts      # Business logic
├── dto/                        # Data Transfer Objects
└── entities/                   # Database entities (if module-specific)
```

### 2. Service Layer Pattern
- Business logic implementation
- Coordination between repositories and external services
- Transaction management and error handling
- **Always use distributed locks for critical sections**

### 3. Repository Pattern
- Data access abstraction
- Query building with cursor-based pagination
- Domain model transformation
- Extend `BaseRepository` for common operations

### 4. DTO Validation
- Use `class-validator` decorators on all DTOs
- Add `@ApiProperty()` for Swagger documentation
- Use `@IsOptional()` for non-required fields

### 5. Exception Handling
- Use custom exception classes (DataNotFoundException, DataConflictException, etc.)
- Provide meaningful error messages with context
- Location: `src/exceptions/`

### 6. Distributed Locking
```typescript
const lock = await this.mutexService.acquire(`resource:${id}`, 30000);
try {
  // Critical section
} finally {
  await this.mutexService.release(lock);
}
```

### 7. Scheduled Tasks
- Implement `OnModuleInit` interface
- Register tasks with cron expressions
- Use distributed locks if task shouldn't run concurrently

### 8. Multi-Cloud Storage
- Define `IStorageProvider` interface
- Implement provider-specific classes (S3, Azure, GCS)
- Select provider based on configuration

---

## Architecture Patterns

### Modular Architecture
- Each feature is a self-contained NestJS module
- Modules communicate through well-defined interfaces
- Dependency injection for loose coupling

### Layered Architecture
```
Controllers (HTTP) → Services (Business Logic) → Repositories (Data Access) → Database
                  ↓
              External SDKs (LiveKit, Storage)
```

### Event-Driven Architecture
- Webhook handlers process LiveKit events
- Redis pub/sub for real-time updates
- Frontend event service for client notifications

### Distributed Systems Patterns
- **Distributed Locking:** Redlock algorithm via Redis
- **Pub/Sub Messaging:** Redis channels for events
- **Caching:** Redis for frequently accessed data
- **Scheduled Tasks:** Cron-based background jobs

---

## Quick Start Checklist

1. ✅ **Read this file** - Get project context and critical warnings
2. ✅ **Check `.agents/summary/index.md`** - Navigate documentation
3. ✅ **Review `.agents/summary/coding_patterns.md`** - Learn implementation patterns
4. ✅ **Follow coding patterns** - Maintain consistency
5. ✅ **Use distributed locking** - For critical operations
6. ✅ **Validate with DTOs** - All inputs
7. ✅ **Handle errors properly** - Custom exceptions
8. ✅ **Document changes** - Update relevant docs

---

## Common Tasks Quick Reference

> **For detailed step-by-step workflows, see `.agents/summary/coding_patterns.md`**

### Add New API Endpoint
1. Define DTO → 2. Add service method → 3. Add controller endpoint → 4. Test

### Integrate External Service
1. Create service → 2. Add config to `.env` → 3. Implement methods → 4. Add error handling → 5. Document

### Add Scheduled Task
1. Create/update scheduled tasks service → 2. Register in `onModuleInit()` → 3. Implement logic → 4. Test

### Add Database Entity
1. Define TypeORM entity → 2. Create repository → 3. Add to module → 4. Implement CRUD → 5. Document

### Handle Webhook Event
1. Add event handler → 2. Update database → 3. Publish via Redis → 4. Send outgoing webhook → 5. Log

---

## Development Setup

### Running Locally

**Start OpenVidu Server:**
```bash
cd openvidu-local-deployment/community
./configure_lan_private_ip_linux.sh
docker compose up -d
```

**Start API:**
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

## External Resources

- **NestJS:** https://docs.nestjs.com/
- **LiveKit:** https://docs.livekit.io/
- **TypeORM:** https://typeorm.io/
- **PostgreSQL:** https://www.postgresql.org/docs/
- **Redis:** https://redis.io/docs/
- **AWS CDK:** https://docs.aws.amazon.com/cdk/

---

## Version Information

- **Documentation Version:** 1.1
- **Last Updated:** 2026-02-27
- **Codebase Size:** 252,285 LOC
- **Project Status:** Production-ready with POC features

---

**Remember:** This is a quick reference. For detailed patterns, examples, and workflows, always check `.agents/summary/coding_patterns.md`.
