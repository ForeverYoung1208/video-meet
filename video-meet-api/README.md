# Tutor platform POC api

see AGENTS.md for agents instructions
see https://docs.livekit.io/reference/client-sdk-js/  for livekit Node.js client documentation


## Development Strategy

**Decision: Start from scratch with NestJS** instead of adopting OpenVidu Meet backend.

### Rationale:

**Technical Reasons:**
- OpenVidu Meet uses simple Node.js/Express architecture, not complex enough to inherit
- Our requirements need significant changes: SQL database, user management, auth, additional business logic
- NestJS provides better structure for complex applications with multiple features
- TypeScript-first approach with better type safety
- Built-in features: guards, interceptors, pipes, dependency injection
- TypeORM support matches our current stack

**Practical Reasons:**
- Team expertise in NestJS enables faster development
- Complete codebase understanding and maintainability
- No constraints from existing architecture
- Easier integration with our patterns and tools

### Implementation Approach:

1. **Use OpenVidu Meet as reference** - Study LiveKit integration patterns
2. **Build NestJS modules:**
   - `auth` - User authentication (✅ Complete)
   - `users` - User management (✅ Complete)
   - `meetings` - Video meeting orchestration using LiveKit SDK
   - `recordings` - Recording management using LiveKit SDK
3. **Leverage LiveKit Node.js SDK** - OpenVidu 3.x is LiveKit-compatible
4. **Response DTO Pattern:**
   - Use `@UseResponse(ResponseClass)` for automatic transformation
   - Global `excludeAll` strategy with `@Expose()` decorators
   - Clean controllers returning raw entities

**Migration Effort Analysis:**
- Adopting OpenVidu Meet: High effort to restructure, add database, modify architecture
- Building from scratch: Medium effort with familiar tools and patterns
