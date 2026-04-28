# Empty Classroom & Space Utilisation System (ECS)

A minimal-file full-stack app for classroom availability, booking, timetable occupancy, complaints, admin controls, and analytics.

## Project Structure (kept minimal)

- `server.js` - Node.js + Express + MongoDB backend (all schemas, routes, seed data)
- `public/index.html` - React + Tailwind + Chart.js frontend (single file)
- `data/sampleData.json` - dataset in JSON format
- `data/sampleData.sql` - MySQL-compatible table + INSERT statements
- `.env.example` - environment configuration template
- `package.json` - dependencies and scripts

## Features

- JWT authentication with roles: `admin`, `faculty`, `student`
- Classroom availability by date + time slot
- Base occupancy from timetable + dynamic occupancy from bookings
- Clash-safe booking (faculty only), cancellation support
- Complaint submission (student/faculty) and status updates (admin)
- Admin dashboard for users, classrooms, timetable management
- Analytics dashboard with Chart.js
- Bonus: simple chatbot + room recommendation endpoint

## Setup (Local)

1. Install MongoDB and start it locally.
2. Install dependencies:

```bash
npm install
```

3. Create env file:

```bash
cp .env.example .env
```

4. Start app:

```bash
npm start
```

5. Open:

- `http://localhost:5000`

Seed data auto-loads on first run when DB is empty.

## Demo Users

- Admin: `admin@ecs.edu` / `admin123`
- Faculty: `meera@ecs.edu` / `faculty123`
- Faculty: `arun@ecs.edu` / `faculty123`
- Student: `riya@ecs.edu` / `student123`

## API Routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/classrooms`
- `GET /api/availability`
- `GET /api/timetable`
- `POST /api/bookings` (faculty)
- `GET /api/bookings`
- `PATCH /api/bookings/:id/cancel` (faculty own bookings)
- `POST /api/complaints` (student/faculty)
- `GET /api/complaints`
- `PATCH /api/complaints/:id/status` (admin)
- `GET /api/admin/users` (admin)
- `POST /api/admin/classrooms` (admin)
- `PUT /api/admin/classrooms/:roomId` (admin)
- `POST /api/admin/timetable` (admin)
- `POST /api/admin/timetable/bulk` (admin)
- `GET /api/analytics` (admin)
- `POST /api/recommend-room` (faculty)
- `POST /api/chatbot`

## Database Design

### Users

- `uid`
- `name`
- `email`
- `password`
- `role`

### Classrooms

- `room_id`
- `room_number`
- `capacity`
- `projector`
- `facilities`

### Timetable

- `room_id`
- `day`
- `time_slot`
- `subject`

### Bookings

- `user_id`
- `room_id`
- `date`
- `time_slot`
- `purpose`
- `status`

### Complaints

- `user_id`
- `room_id`
- `issue_type`
- `description`
- `status`

## Dataset (Table Format)

### Classrooms (exactly 5)

| room_id | room_number | capacity | projector |
|---|---|---:|---|
| 1 | A101 | 40 | Yes |
| 2 | A102 | 35 | No |
| 3 | B201 | 50 | Yes |
| 4 | B202 | 45 | Yes |
| 5 | C301 | 60 | No |

### Timetable (Monday-Friday, partial slots)

| room_id | day | time_slot | subject |
|---:|---|---|---|
| 1 | Monday | 08:00-09:00 | DB |
| 2 | Monday | 09:00-10:00 | OS |
| 3 | Monday | 10:00-11:00 | CN |
| 4 | Monday | 11:00-12:00 | AI |
| 1 | Tuesday | 09:00-10:00 | SE |
| 3 | Tuesday | 08:00-09:00 | ML |
| 5 | Tuesday | 10:00-11:00 | DB |
| 2 | Wednesday | 08:00-09:00 | CN |
| 4 | Wednesday | 09:00-10:00 | OS |
| 5 | Wednesday | 11:00-12:00 | AI |
| 1 | Thursday | 10:00-11:00 | ML |
| 3 | Thursday | 11:00-12:00 | SE |
| 4 | Thursday | 08:00-09:00 | DB |
| 2 | Friday | 10:00-11:00 | AI |
| 3 | Friday | 09:00-10:00 | CN |
| 5 | Friday | 08:00-09:00 | OS |

### Users

| id | name | email | password | role |
|---:|---|---|---|---|
| 1 | Admin User | admin@ecs.edu | admin123 | admin |
| 2 | Dr. Meera | meera@ecs.edu | faculty123 | faculty |
| 3 | Prof. Arun | arun@ecs.edu | faculty123 | faculty |
| 4 | Riya Sharma | riya@ecs.edu | student123 | student |
| 5 | Karan Patel | karan@ecs.edu | student123 | student |
| 6 | Nisha Verma | nisha@ecs.edu | student123 | student |

### Bookings (faculty only, no timetable clashes)

| id | user_id | room_id | date | time_slot | purpose |
|---:|---:|---:|---|---|---|
| 1 | 2 | 4 | 2026-04-14 | 10:00-11:00 | Guest lecture |
| 2 | 3 | 2 | 2026-04-16 | 11:00-12:00 | Remedial class |
| 3 | 2 | 5 | 2026-04-17 | 09:00-10:00 | Workshop |

### Complaints

| id | user_id | room_id | issue_type | description | status |
|---:|---:|---:|---|---|---|
| 1 | 4 | 1 | Projector | Projector not turning on in A101. | Pending |
| 2 | 5 | 3 | AC | AC cooling is weak in B201. | Resolved |
| 3 | 6 | 5 | Furniture | Two broken chairs found in C301. | Pending |

## Notes

- Timetable intentionally leaves many slots empty to demonstrate availability.
- Occupied status is computed from timetable + active bookings.
- JSON and SQL datasets are both ready in `data/`.
