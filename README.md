# E-Wange

Smart home monitoring and control platform split into two independent apps:

| Folder      | Stack                                  | Port |
| ----------- | -------------------------------------- | ---- |
| `frontend/` | React 18 + Vite + TypeScript + Tailwind | 8080 |
| `backend/`  | Node.js + Express + MongoDB (Mongoose)  | 5000 |

The application code (pages, components, hooks, shadcn/ui) has been carried over
from the original project. Supabase has been removed: authentication, admin
overview, system configuration, user management and history logging all go
through the Express/MongoDB API. Live device and sensor values still come from
the existing Firebase Realtime Database integration, so the dashboard keeps its
realtime behaviour.

## Requirements

- Node.js 18+
- MongoDB running locally, or a MongoDB Atlas connection string

## Install

```bash
npm run install:all
```

This installs dependencies for both apps. You can also install them
individually:

```bash
cd frontend && npm install
cd backend  && npm install
```

## Environment

Copy the example files and adjust as needed.

```bash
cp backend/.env.example  backend/.env
cp frontend/.env.example frontend/.env
```

`backend/.env`

| Variable         | Default                                 | Description                        |
| ---------------- | --------------------------------------- | ---------------------------------- |
| `PORT`           | `5000`                                  | API port                           |
| `MONGO_URI`      | `mongodb://127.0.0.1:27017/e-wange`     | MongoDB connection string          |
| `JWT_SECRET`     | `change-me-in-production`               | Token signing secret               |
| `JWT_EXPIRES_IN` | `7d`                                    | Token lifetime                     |
| `CLIENT_ORIGIN`  | `http://localhost:8080`                 | Allowed CORS origin(s), comma separated |
| `AI_API_KEY`     | *(empty)*                               | Optional key for open-ended LLM replies |
| `AI_API_BASE`    | `https://api.openai.com/v1`             | OpenAI-compatible provider base     |
| `AI_MODEL`       | `gpt-4o-mini`                           | Model used by the chat assistant    |

`frontend/.env`

| Variable       | Default                     | Description       |
| -------------- | --------------------------- | ----------------- |
| `VITE_API_URL` | `http://localhost:5000/api` | Express API base  |

## Database

```bash
npm run db:seed    # creates an admin user + the default device list
npm run db:seeds   # creates/refreshes the primary admin account + config defaults
npm run db:reset   # drops the database (scratch databases only)
```

`npm run db:seeds` (which runs `backend/seeds.js`) is idempotent and sets up:

- the admin account `mukeshimanakevin20@gmail.com` / `Blandine@250`
- the nine default rows used by the admin **System Configuration** screen
  (climate, safety, parking and alert settings)

Existing configuration values edited in the UI are preserved when the seed is
re-run.

## Authentication

`POST /api/auth/login` accepts either an email address or a user name in the
`email` field, so the "Username or Email" login form works unchanged. The API
returns a JWT that the frontend stores in `localStorage` under
`e-wange.token`; `/api/auth/me` restores the session on reload. Roles are
`admin`, `user` and `guest`, mapped to the UI's admin/viewer views.

## Run

Both apps in one terminal:

```bash
npm run dev
```

Or separately:

```bash
npm run dev:frontend   # http://localhost:8080
npm run dev:backend    # http://localhost:5000
```

During development Vite proxies `/api/*` to `http://localhost:5000`, so the
frontend can also call relative `/api/...` URLs.

## Build

```bash
npm run build          # builds frontend into frontend/dist
npm start              # starts the backend in production mode
```

## API

All routes are prefixed with `/api`.

| Method   | Route                     | Auth   | Purpose                             |
| -------- | ------------------------- | ------ | ----------------------------------- |
| `GET`    | `/api`                    | –      | API banner / uptime                 |
| `GET`    | `/api/health`             | –      | Health + database status            |
| `POST`   | `/api/auth/register`      | –      | Create an account                   |
| `POST`   | `/api/auth/login`         | –      | Sign in (email or name), returns JWT |
| `GET`    | `/api/auth/me`            | Bearer | Current user                        |
| `GET`    | `/api/devices`            | Bearer | List devices                        |
| `POST`   | `/api/devices`            | Admin  | Create device                       |
| `PATCH`  | `/api/devices/:id`        | Admin  | Update device                       |
| `DELETE` | `/api/devices/:id`        | Admin  | Delete device                       |
| `POST`   | `/api/devices/:id/toggle` | Bearer | Flip a device on/off                |
| `GET`    | `/api/sensors`            | Bearer | Paginated readings                  |
| `GET`    | `/api/sensors/latest`     | Bearer | Latest reading                      |
| `POST`   | `/api/sensors`            | –      | Ingest a reading (device-side)      |
| `GET`    | `/api/logs`               | Bearer | Activity log                        |
| `GET`    | `/api/users`              | Admin  | List users                          |
| `POST`   | `/api/users`              | Admin  | Create a system user                |
| `PATCH`  | `/api/users/:id`          | Admin  | Update user / enable or disable     |
| `DELETE` | `/api/users/:id`          | Admin  | Delete user                         |
| `GET`    | `/api/config`             | Bearer | System configuration rows           |
| `PUT`    | `/api/config/:key`        | Admin  | Save one configuration value        |
| `POST`   | `/api/ai/chat`            | Bearer | Streaming chat assistant proxy      |
| `GET`    | `/api/admin/overview`     | Admin  | Dashboard counters                  |
| `GET`    | `/api/admin/timeseries`   | Admin  | Chart data (`?days=7`)              |

The chat assistant is fully functional without an API key:

- **Built-in intent engine** — switches the lamp, fan, curtains, water pump,
  gate and buzzer on/off, supports “toggle”, scenes like “everything off”, and
  answers questions about temperature, humidity, gas, door, parking and device
  state. It also handles greetings, help and time/date.
- **Optional LLM** — set `AI_API_KEY` (and `AI_API_BASE` / `AI_MODEL` for
  OpenAI-compatible providers such as Groq, OpenRouter or Gemini) to answer
  open-ended questions. If the provider is missing, rate limited or offline the
  assistant degrades gracefully instead of showing an error.
  Example for OpenRouter:
  ```env
  AI_API_KEY=sk-or-v1-...
  AI_API_BASE=https://openrouter.ai/api/v1
  AI_MODEL=openai/gpt-4o-mini
  ```
- Responses stream as Server-Sent Events, and device actions are validated
  against an allow-list on the client before touching Firebase.

## Structure

```
E-wange/
├── backend/
│   ├── scripts/              # seed + reset helpers
│   ├── seeds.js              # primary admin + system config defaults
│   ├── src/
│   │   ├── config/           # env + database connection
│   │   ├── controllers/      # request handlers
│   │   ├── middleware/       # auth, validation, errors, rate limits
│   │   ├── models/           # Mongoose schemas
│   │   ├── routes/           # Express routers
│   │   ├── utils/            # ApiError, asyncHandler, jwt
│   │   ├── app.js            # Express app wiring
│   │   └── server.js         # entry point
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/       # app + shadcn/ui components
│   │   ├── hooks/            # auth, firebase data, history logger
│   │   ├── lib/              # firebase, utils, api client
│   │   ├── pages/
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
└── package.json              # root scripts to run both apps
```
