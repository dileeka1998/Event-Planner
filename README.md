# Event Planner — v3 (NestJS + TypeORM + MySQL + FastAPI + spaCy + React/Vite)

This project is an AI-driven Smart Event Planner.

## Services (Local Development)
- **Frontend**: React + Vite Dev Server (http://localhost:5173)
- **Backend API**: NestJS + TypeORM (http://localhost:3000)
- **AI Service**: FastAPI + spaCy (http://localhost:8000)
- **Database**: MySQL 8 (exposed at localhost:3307)
- **DB Admin**: Adminer (http://localhost:8081)

## Local Development Instructions

### 1. Backend & AI Services (Docker)
The backend API, AI microservice, and database are managed via Docker Compose.

```bash
# Build and start all services
docker compose up --build
```
- API will be running at `http://localhost:3000`.
- Swagger docs will be available at `http://localhost:3000/docs`.
- AI service will be running at `http://localhost:8000`.

### 2. Frontend (Vite)
The frontend is a React application powered by Vite.

```bash
# Navigate to the web app directory
cd apps/web

# Create a local environment file from the example
cp .env.example .env
```

Ensure your new `apps/web/.env` file contains the following to point to the local backend services:
```
VITE_API_BASE=http://localhost:3000
VITE_AI_BASE=http://localhost:8000
```

Then, install dependencies and start the dev server:
```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```
- The frontend will be accessible at `http://localhost:5173`.

## Smoke Test (cURL Commands)

These commands test the core API functionality.

### 1. Sign Up a New Organizer
```bash
curl -s -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"org@example.com","name":"Organizer One","password":"pass"}' | jq
```

### 2. Login and Capture JWT Token
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"org@example.com","password":"pass"}' | jq -r .token)

echo "Captured Token: $TOKEN"
```

### 3. Create an Event (with AI brief)
*Note: This command assumes the user created via the signup command has an ID of 1. Adjust `organizerId` if necessary.*
```bash
curl -s -X POST http://localhost:3000/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organizerId": 1,
    "title": "Tech Summit 2025",
    "startDate": "2025-12-01",
    "endDate": "2025-12-01",
    "expectedAudience": 150,
    "budget": "500000.00",
    "brief": "One-day summit for 150 attendees, budget ~ LKR 500k. Two tracks AI and Cloud."
  }' | jq
```

### 4. List All Events
```bash
curl -s http://localhost:3000/events | jq
```
