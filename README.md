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

## Environment Variables

### Backend (Docker)
The backend services use environment variables defined in `docker-compose.yml`:
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME` - Database connection
- `AI_BASE_URL` - AI microservice URL (default: `http://ai:8000`)
- `JWT_SECRET` - JWT secret key (default: `supersecret`)
- `PORT` - API port (default: `3000`)

### Frontend
Create `apps/web/.env` with:
```
VITE_API_BASE=http://localhost:3000
VITE_AI_BASE=http://localhost:8000
```

## Smoke Test (cURL Commands)

These commands test the core API functionality. Run them after starting the services.

### 1. Sign Up a New Organizer
```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"org@example.com","name":"Organizer One","password":"pass"}'
```

Expected response:
```json
{
  "user": {
    "id": 1,
    "email": "org@example.com",
    "name": "Organizer One",
    "role": "ORGANIZER",
    "createdAt": "2025-01-XX..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Login and Capture JWT Token
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"org@example.com","password":"pass"}' | jq -r .token)

echo "Captured Token: $TOKEN"
```

### 3. Create a Venue
```bash
curl -X POST http://localhost:3000/venues \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Convention Center",
    "address": "123 Main St, Colombo",
    "capacity": 200,
    "contactName": "John Doe",
    "contactPhone": "+94-11-1234567",
    "hourlyRate": "50000.00"
  }'
```

### 4. Create an Event (with AI brief and venue)
```bash
curl -X POST http://localhost:3000/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organizerId": 1,
    "title": "Tech Summit 2025",
    "startDate": "2025-12-01",
    "endDate": "2025-12-01",
    "venueId": 1,
    "brief": "One-day summit for 150 attendees, budget ~ LKR 500k. Two tracks AI and Cloud."
  }'
```

The AI will parse the brief and auto-fill `expectedAudience` and `budget`. If `budgetItems` are not provided, the system will generate heuristic budget items (venue 40%, catering 30%, AV 10%, misc 20%).

### 5. Create an Event with Custom Budget Items
```bash
curl -X POST http://localhost:3000/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organizerId": 1,
    "title": "Workshop Series",
    "startDate": "2025-12-15",
    "endDate": "2025-12-15",
    "expectedAudience": 50,
    "budget": "200000.00",
    "budgetItems": [
      {
        "category": "Venue",
        "description": "Conference hall rental",
        "estimatedAmount": "80000.00",
        "quantity": 1
      },
      {
        "category": "Catering",
        "description": "Lunch and refreshments",
        "estimatedAmount": "60000.00",
        "quantity": 50,
        "unit": "per person"
      }
    ]
  }'
```

### 6. Get Event by ID (with relations)
```bash
curl http://localhost:3000/events/1
```

Returns event with `venue`, `eventBudget`, `eventBudget.items`, and `attendees`.

### 7. Register as Attendee
```bash
curl -X POST http://localhost:3000/events/1/attendees \
  -H "Authorization: Bearer $TOKEN"
```

Returns `CONFIRMED` or `WAITLISTED` status based on venue capacity.

### 8. Get Event Attendees
```bash
curl http://localhost:3000/events/1/attendees
```

### 9. Leave Event
```bash
curl -X DELETE http://localhost:3000/events/1/attendees/me \
  -H "Authorization: Bearer $TOKEN"
```

### 10. List All Events
```bash
curl http://localhost:3000/events
```

### 11. List All Venues
```bash
curl http://localhost:3000/venues
```

## API Endpoints Summary

### Authentication
- `POST /auth/signup` - Register new user
- `POST /auth/login` - Login and get JWT token

### Events
- `GET /events` - List all events
- `GET /events/:id` - Get event with venue, budget, and attendees
- `POST /events` - Create event (requires auth, supports AI brief parsing)

### Venues
- `GET /venues` - List all venues
- `GET /venues/:id` - Get venue by ID
- `POST /venues` - Create venue (requires auth)
- `PUT /venues/:id` - Update venue (requires auth)
- `DELETE /venues/:id` - Delete venue (requires auth)

### Attendees
- `GET /events/:id/attendees` - Get all attendees for an event
- `POST /events/:id/attendees` - Register as attendee (requires auth)
- `DELETE /events/:id/attendees/me` - Leave event (requires auth)

## Features Implemented

✅ **Authentication**: JWT-based signup/login with password hashing  
✅ **Events**: Create events with venue, budget items, and AI brief parsing  
✅ **Venues**: Full CRUD operations for venues  
✅ **Budget Management**: Automatic budget item generation with heuristic split  
✅ **Attendees**: Registration with capacity checking and waitlist support  
✅ **AI Integration**: Automatic parsing of event briefs to extract audience and budget  
✅ **Transactions**: Safe multi-table operations with rollback support  
✅ **Swagger Docs**: API documentation at `/docs`
