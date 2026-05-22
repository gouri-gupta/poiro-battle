# ⚔️ Poiro Battle Room

A real-time AI-powered creative battle platform where participants compete
in creative challenges judged by a host.

---

## Demo

> Screen recording / screenshots showing the complete battle flow.
> https://drive.google.com/file/d/1NUjMXpfqjb4OwgD7-KhfdZo_HtWFN6Yx/view?usp=sharing

---

## Local Setup

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (free tier works)

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/poiro-battle.git
cd poiro-battle
```

### 2. Setup the server
```bash
cd server
npm install
```

### Create a `.env` file inside `server/`:
```bash
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=any_random_secret_string
```

### 3. Setup the client
```bash
cd ../client
npm install
```

### 4. Run both servers

- Terminal 1 — Backend:
```bash
cd server
npm run dev
```

- Terminal 2 — Frontend:
```bash
cd client
npm run dev
```

- Open `http://localhost:5173`

---

## Architecture Overview
```bash
poiro-battle/
├── server/                  # Node.js + Express backend
│   └── src/
│       ├── config/db.js     # MongoDB connection
│       ├── models/          # Mongoose schemas
│       ├── routes/          # REST API endpoints
│       ├── middleware/       # JWT auth guard
│       ├── services/        # AI provider + job worker
│       └── socket/          # Socket.IO event handlers
└── client/                  # React frontend
└── src/
├── api/             # Axios instance + interceptors
├── pages/           # LoginPage, LobbyPage, RoomPage
├── store/           # Zustand global state
└── hooks/           # useSocket custom hook
```

### Why this separation?

- REST handles stateful CRUD operations (create room, submit, score).
- Socket.IO handles real-time push events (round started, job updates, scores).
- Keeping them separate makes each layer independently testable and clear.

---

## Database Schema

### User
```bash
{
username: String,
email: String (unique),
password: String (bcrypt hashed),
timestamps: true
}
```

### Room
```bash
{
code: String (6-char unique),
hostId: ObjectId → User,
hostUsername: String,
challenge: String,
status: waiting | active | finished,
participants: [{ userId, username, score, eliminated }],
round: {
status: idle | active | scoring | complete,
startedAt: Date,
submissions: [{
participantId, username, prompt,
jobId → Job, output, score, submittedAt
}]
}
}
```

### Job
```bash
{
roomId: ObjectId → Room,
participantId: ObjectId → User,
prompt: String,
status: queued | running | completed | failed | timed_out,
output: String,
error: String,
timestamps: true
}
```

### Why embed round and submissions inside Room?

- For a single room with one round, embedding avoids extra DB queries.
- A single `Room.findOne()` gives you everything needed to render the UI.
- Tradeoff: this doesn't scale to multiple rounds or large submission sets.
- Production fix: separate Round and Submission collections with references.

---

## Real-time Event Model

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_room` | `{ roomCode, token }` | Subscribe to room updates |
| `start_round` | `{ roomCode, token }` | Host starts the round |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `room_updated` | `{ room }` | Full room state pushed to all users |
| `job_update` | `{ jobId, status, output }` | AI job progress update |
| `error` | `{ message }` | Error notification |

### Why send full room state on `room_updated`?

- For a single room with simple data, resending the full object is simpler than diffing and sending deltas. 
- Tradeoff: slightly more data per event.
- Production fix: send only the changed fields using operational transforms or a diff library.

---

## Generation Job Lifecycle

### POST /api/rooms/:code/submit
- → Create Job { status: queued }
- → Add submission to Room
- → Broadcast room_updated (everyone sees queued state)
- → Return 202 immediately ← non-blocking

### Background (processJob runs independently):
- → Job status: running → broadcast job_update
- → aiProvider.generate(prompt) ← 3-6 second mock delay
- → On success: status: completed, save output to Job + Room
- → broadcast room_updated (output visible to all)
- → On failure: status: failed, save error
- → broadcast job_update with error

- The key design: `processJob()` is called without `await` after the HTTP
response is sent. This is lightweight in-process async — sufficient for
one room. Production would use a proper queue like Bull or BullMQ with
Redis, enabling retries, concurrency limits, and worker scaling.

---

## Battle Mechanism — Scoring

### How it works
After the round ends, the host scores each submission from 1 to 10.
The score is saved to the submission and added to the participant's
running total. A leaderboard ranks participants by score.

### Why this mechanism?
Simple, fast to implement, and puts creative judgment in human hands.
The host reads the AI-generated output and decides quality based on
creativity, relevance to the challenge, and originality.

### Weaknesses
- Subjective — host bias can influence scores unfairly
- No peer voting — only one person judges
- No criteria weighting — all aspects worth the same
- Host could score strategically rather than fairly

### Production improvements
- Add peer voting so all participants score each other's entries
- Use an AI judge to give an objective baseline score
- Define weighted criteria (creativity 40%, relevance 40%, originality 20%)
- Average host score + peer votes + AI score for a balanced result

---

## What is Persisted

| Data | Persisted |
|------|-----------|
| Users and passwords | ✅ MongoDB |
| Room state and status | ✅ MongoDB |
| Round status | ✅ MongoDB |
| Submissions and prompts | ✅ MongoDB |
| AI job states | ✅ MongoDB |
| AI generated output | ✅ MongoDB |
| Scores | ✅ MongoDB |
| Socket connections | ❌ In-memory only |
| Auth token | ✅ localStorage |

Page refresh restores all state from MongoDB via `GET /api/rooms/:code`.

---

## Failure Handling

| Failure | How handled |
|---------|-------------|
| AI provider error | Job marked `failed`, error broadcast via socket |
| Invalid prompt | 400 response before job is created |
| Unauthorized request | JWT middleware returns 401 |
| Wrong role action | Backend returns 403 (host trying to submit, etc.) |
| Room not found | 404 response |
| Socket disconnect | Client logs disconnect, room state preserved in DB |
| Page refresh | Full room state fetched from DB on mount |

---

## Role Enforcement

All role checks happen on the **backend**, not just the UI.

- Host cannot submit as a participant → enforced in `/submit` route
- Participant cannot start round → enforced in `start_round` socket handler
- Participant cannot score → enforced in `/score` route
- Non-members cannot view room → enforced in `GET /rooms/:code`

Frontend hides buttons based on role for UX only.
Backend rejects invalid actions regardless of what the frontend sends.

---

## Known Limitations

- Only one room and one round supported at a time per the assignment scope
- In-process job worker — not suitable for multiple concurrent rooms at scale
- No WebSocket reconnection recovery on network drop
- No retry logic for failed AI jobs (manual resubmit required)
- Mock AI provider — not connected to a real LLM
- No spectator mode
- Basic mobile responsiveness only

---

## What I Would Improve With More Time

- **Real AI integration** — swap mock provider for Google Gemini (free tier)
  by changing only `aiProvider.js`
- **Bull queue** — replace in-process worker with Redis-backed job queue
  for reliability, retries, and concurrency control
- **Peer voting** — let participants score each other's outputs
- **WebSocket reconnection** — auto-rejoin room on network drop
- **Multiple rounds** — support tournament-style elimination brackets
- **Spectator mode** — read-only view with live reaction system
- **Automated tests** — Jest tests for auth, room creation, job lifecycle

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, JavaScript, Tailwind CSS, Zustand |
| Backend | Node.js, Express |
| Realtime | Socket.IO |
| Database | MongoDB Atlas (Mongoose) |
| Auth | JWT + bcryptjs |
| AI Provider | Mock (clean interface, swappable) |