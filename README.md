# E-Wange

Smart home monitoring and control platform split into two independent apps:

| Folder      | Stack                                  | Port |
| ----------- | -------------------------------------- | ---- |
| `frontend/` | React 18 + Vite + TypeScript + Tailwind | 8080 |
| `backend/`  | Node.js + Express + MongoDB (Mongoose)  | 5000 |

The existing application code (pages, components, hooks, shadcn/ui) has been
carried over unchanged. Only the project scaffolding was reorganised.

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

`frontend/.env`

| Variable       | Default                     | Description       |
| -------------- | --------------------------- | ----------------- |
| `VITE_API_URL` | `http://localhost:5000/api` | Express API base  |

## Database

```bash
npm run db:seed    # creates an admin user + the default device list
npm run db:reset   # drops the database (scratch databases only)
```

Default seeded admin: `admin@e-wange.local` / `admin123`.

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

| Method   | Route                     | Auth   | Purpose                          |
| -------- | ------------------------- | ------ | -------------------------------- |
| `GET`    | `/api`                    | –      | API banner / uptime              |
| `GET`    | `/api/health`             | –      | Health + database status         |
| `POST`   | `/api/auth/register`      | –      | Create an account                |
| `POST`   | `/api/auth/login`         | –      | Sign in, returns JWT             |
| `GET`    | `/api/auth/me`            | Bearer | Current user                     |
| `GET`    | `/api/devices`            | Bearer | List devices                     |
| `POST`   | `/api/devices`            | Admin  | Create device                    |
| `PATCH`  | `/api/devices/:id`        | Admin  | Update device                    |
| `DELETE` | `/api/devices/:id`        | Admin  | Delete device                    |
| `POST`   | `/api/devices/:id/toggle` | Bearer | Flip a device on/off             |
| `GET`    | `/api/sensors`            | Bearer | Paginated readings               |
| `GET`    | `/api/sensors/latest`     | Bearer | Latest reading                   |
| `POST`   | `/api/sensors`            | –      | Ingest a reading (device-side)   |
| `GET`    | `/api/logs`               | Bearer | Activity log                     |
| `GET`    | `/api/users`              | Admin  | List users                       |
| `PATCH`  | `/api/users/:id`          | Admin  | Update user                      |
| `DELETE` | `/api/users/:id`          | Admin  | Delete user                      |
| `GET`    | `/api/admin/overview`     | Admin  | Dashboard counters               |
| `GET`    | `/api/admin/timeseries`   | Admin  | Chart data (`?days=7`)           |

## Structure

```
E-wange/
├── backend/
│   ├── scripts/              # seed + reset helpers
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
│   │   ├── hooks/
│   │   ├── lib/              # firebase, utils, api client
│   │   ├── pages/
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
└── package.json              # root scripts to run both apps
```
