<!-- Copilot instructions for AI assistants working on Video Meet -->
# Copilot guidance — Video Meet (concise)

This file gives immediate, actionable guidance for an AI coding agent (Copilot) to be productive in this repository.

1) Big picture (one-liner)
- Backend: NestJS TypeScript API in `video-meet-api/` (Postgres + TypeORM, Redis, LiveKit/OpenVidu integration).
- Frontend: Vite + React in `video-meet-ui/` (uses `livekit-client`).
- Video infra: OpenVidu 3.x is LiveKit-based; local/dev manifests live under `openvidu-local-deployment/`.

2) Where to look first (high signal files/dirs)
- `video-meet-api/src/` — modules, controllers, services, DTOs, exceptions.
- `video-meet-api/AGENTS.md` and root `AGENTS.md` — project-specific patterns (serialization, locking, Redis port, LiveKit note). Read these before changing architecture.
- `.agents/summary/` — deep docs (architecture, interfaces, components). Use for long context.
- `openvidu-local-deployment/community/` — scripts and compose files to run a local LiveKit/OpenVidu stack.
- `video-meet-ui/src/` — React components & LiveKit client usage examples.

3) Key, non-obvious conventions to follow
- Response serialization: project uses `class-transformer` with `excludeAll` strategy.
  - Controllers use `@UseResponse(SomeResponse)` and `@Expose()` on response DTOs. When nesting responses, always use `@Type(() => ChildResponse)`.
  - See `video-meet-api/AGENTS.md` (Response DTOs section) for examples.
- Migrations: Use the TypeORM CLI scripts in `video-meet-api/package.json` (`npm run migration:create|generate|run`). Do NOT edit generated migration files manually except for seeding.
- Redis port: main API Redis uses port 6380 (OpenVidu uses 6379). Hard-coded assumptions exist; preserve port usage unless changing infra.
- LiveKit: OpenVidu 3.x → LiveKit. Use `livekit-server-sdk` server-side and `livekit-client` client-side. Stop using `openvidu-node-client`.
- Cursor-based pagination: repositories encode/decode cursors and return `{ nextCursor, hasMore }`. Follow existing repository utilities.
- Distributed locking: critical sections (recording start/stop, name reservation) use a mutexService/Redis lock pattern (acquire/release). Keep locks and TTLs intact.

4) Development & run commands (accurate examples)
- Start dev API (fast):
  - cd into backend and run: `npm install` then `npm run start:dev` (uses NestJS watch).
- Start full stack with local docker compose (recommended for integration):
  - Start OpenVidu/LiveKit dev stack: `cd openvidu-local-deployment/community && ./configure_lan_private_ip_linux.sh && docker compose up -d`.
  - Start API containers: `cd video-meet-api && docker compose up -d`.
- DB migrations (TypeORM CLI):
  - Create: `npm run migration:create -- --name <name>`
  - Generate: `npm run migration:generate -- --name <name>`
  - Run: `npm run migration:run`

5) Tests & CI
- Testing framework: Jest. Project is currently in POC — avoid adding unit tests unless requested. Existing scripts are in `video-meet-api/package.json` (`npm test`, etc.).

6) Integration points & external dependencies
- LiveKit/OpenVidu (video server) — separate service; credentials from env vars. See `openvidu-local-deployment/*` for compose and scripts.
- AWS S3 — used for recordings (configured by OpenVidu and environment variables).
- PostgreSQL + TypeORM — DB access and migrations under `video-meet-api/src/db`.
- Redis — used for caching/pubsub/locks (API uses port 6380; OpenVidu uses 6379).

7) Typical PR / change guidance for Copilot edits
- Prefer small, focused changes. Follow existing NestJS module patterns: `module.module.ts`, `controller.ts`, `service.ts`, `dto/`, `entities/`.
- When changing serialization or response DTOs, update the response DTOs under `src/modules/*/responses` and ensure `@Type()` and `@Expose()` usage is correct.
- For migrations, use TypeORM CLI scripts — do not hand-edit migration history.
- Preserve `.env` secrecy: never add or leak secrets. Use `.env.example` as a template.

8) Where to find more context (quick links)
- Root AGENTS: `AGENTS.md` (big picture, port notes, LiveKit note)
- Backend AGENTS: `video-meet-api/AGENTS.md` (response transformation, migrations rules)
- Local video server compose & scripts: `openvidu-local-deployment/community/`
- Frontend examples: `video-meet-ui/src/`

9) If uncertain, ask these focused questions
- Is this change touching a critical path (recording, locking, migration)? If yes, hold and request human review.
- Are you changing storage or Redis configuration? Verify OpenVidu vs API port separation (6379 vs 6380).

10) Closing / feedback
If anything here is unclear or you want more detail on a specific module or workflow, tell me which area (API, migrations, LiveKit integration, or frontend) and I will expand with concrete examples and file pointers.
