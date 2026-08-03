# Sports Wearable Web Platform

Web platform (Backend + Dashboard) for processing and visualizing GPS+IMU wearable device training sessions.

## Architecture

- **Backend**: Node.js 20 LTS, Express.js (HTTP -> Service -> Repository layer architecture)
- **Database**: PostgreSQL 16 + TimescaleDB (for high-frequency time-series sensor data)
- **Frontend**: Vite + React (SPA Dashboard)
- **Infrastructure**: Docker Compose (for both local dev and production deployment on VPS)

See [/docs/SYSTEM_CONTEXT.md](/docs/SYSTEM_CONTEXT.md) for detailed architectural constraints.

## Local Development Quickstart

1. Clone the repository
2. Start the database: `docker compose -f docker/docker-compose.yml up -d postgres`
3. Install dependencies:
   - `cd backend && npm install`
   - `cd frontend && npm install`
4. Setup environment variables (copy `.env.example` to `.env` in backend/frontend)
5. Run migrations & seed data: `cd backend && npm run migrate && npm run seed`
6. Start dev servers:
   - Backend: `cd backend && npm run dev`
   - Frontend: `cd frontend && npm run dev`

See [DEVELOPMENT_SETUP.md](/DEVELOPMENT_SETUP.md) for full instructions and common pitfalls.

## Documentation

All project documentation is located in the root or `docs/` directory:
- [SYSTEM_CONTEXT.md](/SYSTEM_CONTEXT.md)
- [API_CONTRACT.md](/API_CONTRACT.md)
- [DEVELOPMENT_SETUP.md](/DEVELOPMENT_SETUP.md)
- [BACKLOG.md](/BACKLOG.md)

## License
MIT License
