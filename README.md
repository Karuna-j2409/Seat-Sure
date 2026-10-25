# SeatSure – Online Course Enrollment API

Module 3 · Practical 2 — a production-style backend for course registration, student enrollment and seat availability, built with **Node.js, Express.js 5 and Microsoft SQL Server**.

## Features
- Three related tables, **Students**, **Courses** and **Enrollments**, with foreign keys and constraints
- Live seat availability using **SQL JOINs** (`LEFT JOIN` + `GROUP BY`)
- Enrollment inside a **transaction** with a **row lock**: no overbooking, even under concurrent requests
- Duplicate enrollment and full-course prevention (`409 Conflict`)
- **JWT auth with roles**: `admin` manages everything; a `student` can only manage their **own** enrollments
- bcrypt password hashing, Zod validation, helmet, CORS, rate limiting
- Pagination, central error handling, consistent JSON responses
- Health check, request logging, graceful shutdown
- 35 automated integration tests (incl. a race-condition test) + a 31-request Postman collection

## Tech stack
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js ≥ 18 |
| Framework | Express.js 5 |
| Database | Microsoft SQL Server 2022 (`mssql` driver, connection pool) |
| Auth | `jsonwebtoken`, `bcryptjs` |
| Validation | `zod` |
| Security | `helmet`, `cors`, `express-rate-limit` |
| Logging | `morgan` |
| Testing | `jest`, `supertest`, Postman / Newman |

## Project structure
```
practical2-course-enrollment/
├── src/
│   ├── app.js                     # Express app: middleware, routes, error handling
│   ├── server.js                  # Entry point: DB check, listen, graceful shutdown
│   ├── config/
│   │   ├── env.js                 # Loads + validates environment variables
│   │   └── db.js                  # SQL Server connection pool (getPool / closePool)
│   ├── routes/                    # auth, course, student routes
│   ├── controllers/               # HTTP layer
│   ├── services/                  # Business logic + SQL
│   │   └── enrollment.service.js  # ← transaction + locking logic
│   ├── validators/schemas.js      # Zod schemas
│   ├── middlewares/               # authenticate, authorize, selfOrAdmin, validate, errors
│   └── utils/                     # ApiError, pagination, SQL error codes
├── database/
│   ├── schema.sql                 # Tables, keys, constraints, indexes
│   └── seed.sql                   # Sample admin, students, courses, enrollments
├── scripts/setup-db.js            # Creates DB and loads schema + seed
├── tests/enrollment.test.js       # 35 integration tests
├── postman/SeatSure.postman_collection.json
├── .env.example
└── package.json
```

## Getting started

### 1. Run SQL Server
**Windows:** install SQL Server Developer/Express + SSMS. Enable *SQL Server authentication* and TCP port 1433.

**Mac (Apple Silicon)**, one-time setup:
```bash
softwareupdate --install-rosetta --agree-to-license
brew install colima docker
colima start --vm-type vz --vz-rosetta --cpu 2 --memory 4
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStrong@Passw0rd" \
  -p 1433:1433 --name sqlserver --platform linux/amd64 \
  -d mcr.microsoft.com/mssql/server:2022-latest
```
Next time: `colima start && docker start sqlserver`

### 2. Install, configure, set up, run
```bash
npm install
cp .env.example .env        # set DB_PASSWORD and JWT_SECRET
npm run db:setup            # creates "seatsure" DB + tables + sample data
npm run dev                 # or: npm start
```
Server: `http://localhost:3000`  ·  Health: `http://localhost:3000/health`

### Sample logins (development seed only)
| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@seatsure.edu` | `Admin@123` |
| Student 1 | `karuna.sharma@college.edu` | `Student@123` |
| Student 2 | `aarav.mehta@college.edu` | `Student@123` |
| Student 3 | `diya.iyer@college.edu` | `Student@123` |
| Student 4 | `rohan.verma@college.edu` | `Student@123` |

## Available scripts
| Command | What it does |
|---------|--------------|
| `npm start` | Start the server |
| `npm run dev` | Start with auto-reload |
| `npm run db:setup` | (Re)create tables and load sample data |
| `npm test` | Run the Jest suite against the `seatsure_test` database |

## API reference
Base URL: `http://localhost:3000/api/v1`

| Method | Endpoint | Access | Description | Success |
|--------|----------|--------|-------------|---------|
| POST | `/auth/login` | Public | Login (admin or student), returns JWT | 200 |
| GET | `/courses` | Public | All courses with `enrolled` and `seats_left` | 200 |
| GET | `/courses?available=true` | Public | Only courses with free seats | 200 |
| GET | `/courses/:id` | Public | One course with seat info | 200 |
| POST | `/courses` | Admin | Create a course `{course_name, capacity}` | 201 |
| GET | `/students?page=1&limit=10` | Admin | List students (paginated) | 200 |
| POST | `/students` | Admin | Create a student `{name, email, password}` | 201 |
| GET | `/students/:id` | Admin / self | Student profile | 200 |
| GET | `/students/:id/enrollments` | Admin / self | All courses of a student | 200 |
| POST | `/students/:id/enrollments` | Admin / self | Enroll `{course_id}` | 201 |
| DELETE | `/students/:id/enrollments/:courseId` | Admin / self | Cancel enrollment | 200 |
| GET | `/health` *(no prefix)* | Public | Service + database status | 200 / 503 |

### Response format
```json
{ "success": true, "message": "Enrolled in Full Stack Web Development",
  "data": { "enrollment_id": 4, "student_id": 3, "course_id": 1, "seats_left": 28, ... } }

{ "success": false, "message": "Cloud Computing Lab is full (2/2 seats taken)" }
```

### Status codes
| Code | When |
|------|------|
| 200 / 201 | Success / created |
| 400 | Validation failed, invalid id, malformed JSON |
| 401 | Missing / invalid / expired token, wrong login |
| 403 | Logged in but not allowed (e.g. student acting on another student) |
| 404 | Student, course, enrollment or route not found |
| 409 | Already enrolled, course full, duplicate email or course name |
| 413 / 429 | Body too large / rate limit exceeded |
| 500 / 503 | Server error (details hidden) / database down |

## Testing
**Automated:** `npm test` runs 35 integration tests on a separate `seatsure_test` database, including a test that fires 4 simultaneous enrollments at the last seat and checks that exactly one succeeds.

**Postman:** run `npm run db:setup`, start the server, import `postman/SeatSure.postman_collection.json`, then *Run collection*. Tokens are captured automatically, and all 31 requests have test assertions.

## Security notes
- `.env` is git-ignored; only `.env.example` is committed.
- Passwords are bcrypt-hashed and never returned by the API.
- All SQL uses typed, parameterized inputs (`@param`).
- Role-based access control: `authorize('admin')` and `selfOrAdmin` middleware.
- Error responses never leak SQL errors or stack traces outside development.
- `npm audit` reports 0 vulnerabilities. `package.json` uses an `overrides` entry to force the patched `@azure/msal-node` (7.1.1+) because `mssql → tedious → @azure/identity` still pins a vulnerable 6.x version upstream. Remove the override once `@azure/identity` ships the fix.
