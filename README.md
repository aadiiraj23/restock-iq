# Amazon Now

Amazon Now is a full-stack shopping demo that combines a normal e-commerce storefront with two local AI-style workflows:

- an AI shopping assistant that turns prompts into product recommendations and a cart
- a restock dashboard that predicts when household items will run out

The codebase is designed to be understandable from scratch. Backend logic is split into small Express routes and services, while the frontend uses React, Vite, Zustand, and Axios.

## What This Project Does

- Browse products, categories, search results, cart, checkout, and order history
- Chat with the AI shopping flow using natural language prompts
- Generate recommendation results from the product catalog and user context
- Track consumable items, depletion urgency, and replenishment timelines
- Send feedback like “finished early” or “still have plenty” to improve predictions
- Seed demo data so the app can be used locally without manual setup

## Tech Stack

- Frontend: React 18, React Router 6, Zustand, Axios, Vite, Tailwind CSS
- Backend: Node.js, Express, Mongoose, MongoDB
- Auth: JWT with bcryptjs fallback support
- AI/ML: local JavaScript scoring, TF-IDF, simple Bayesian classification, depletion prediction, and feedback learning

## Repository Layout

```text
backend/
  server.js              Express entrypoint
  seed.js                Seeds demo users/products/restock data
  middleware/            Auth helpers
  models/                Mongoose schemas
  routes/                API endpoints
  services/              Local AI, restock, and scoring logic

frontend/
  src/
    api/                 Canonical API wrapper
    api.js               Compatibility shim for older imports
    components/          Shared UI components
    pages/               Screens and route views
    store/               Zustand state
    App.jsx              Client routing
    main.jsx             Frontend entrypoint
```

## Prerequisites

- Node.js 18 or newer
- MongoDB running locally or in Atlas
- npm

## Setup

### 1. Install backend dependencies

```bash
cd backend
npm install
```

### 2. Configure backend environment

Create a `.env` file in `backend/` with at least:

```bash
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/amazon_now
JWT_SECRET=replace-this-with-a-long-random-string
```

If MongoDB is unavailable, the server still starts in a limited mode, but most data-driven features will not work correctly.

### 3. Seed demo data

```bash
cd backend
npm run seed
```

### 4. Start the backend

```bash
cd backend
npm run dev
```

The backend listens on `http://localhost:5000` by default.

### 5. Install frontend dependencies

```bash
cd frontend
npm install
```

### 6. Start the frontend

```bash
cd frontend
npm run dev
```

The frontend uses Vite and usually starts on `http://localhost:3000`. If that port is busy, Vite will move to the next free port.

## Demo Accounts

- Admin: `admin@amazon.com` / `admin123`
- User: `user@test.com` / `test123`

## Main User Flows

### Shopping flow

1. A user enters a natural-language request in the AI dashboard.
2. The frontend sends the prompt to `POST /api/ai/shop`.
3. The backend loads the catalog, user profile, and intent context.
4. The local scoring layer ranks products and returns a shopping list.
5. The frontend can turn those results into a cart and continue to checkout.

### Restock flow

1. The restock dashboard loads tracked items and their predicted depletion.
2. The backend calculates urgency, days remaining, and bundle suggestions.
3. The user can mark items as “Finished Early” or “Still Have Plenty.”
4. Feedback is sent to the server so future predictions improve.

## API Overview

### Health and model status

- `GET /api/health`
- `GET /api/ml/status`
- `POST /api/ml/retrain`

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/preferences`
- `PUT /api/auth/household`
- `PUT /api/auth/budget`

### Shopping and catalog

- `GET /api/catalog`
- `GET /api/catalog/categories`
- `GET /api/catalog/:id`
- `POST /api/intent/parse`
- `POST /api/recommendations/generate`
- `POST /api/ai/shop`
- `POST /api/ai/suggest`
- `POST /api/ai/substitute`
- `POST /api/ai/feedback`

### Cart and checkout

- `POST /api/cart/build`
- `GET /api/cart/:id`
- `PUT /api/cart/:id`
- `POST /api/checkout/prepare`
- `GET /api/orders`
- `GET /api/orders/:id`

### Restock

- `GET /api/restock/dashboard`
- `GET /api/restock/calendar`
- `GET /api/restock/analytics`
- `GET /api/restock/notifications`
- `GET /api/restock/history`
- `GET /api/restock/schedule`
- `POST /api/restock/feedback`
- `POST /api/restock/bundle`
- `POST /api/restock/predict`

## Important Files

- `backend/services/mlCore.js`: TF-IDF ranking and Bayesian text classification
- `backend/services/restockPredictor.js`: depletion calculation and urgency scoring
- `backend/services/restockService.js`: dashboard data assembly
- `backend/services/aiService.js`: AI shopping orchestration
- `frontend/src/store/index.js`: Zustand stores for auth, cart, and intent state
- `frontend/src/api/index.js`: canonical frontend API client
- `frontend/src/api.js`: compatibility wrapper for older imports
- `frontend/src/pages/AIDashboard.jsx`: AI shopping screen
- `frontend/src/pages/RestockDashboard.jsx`: replenishment screen

## Development Notes

- The frontend contains several `.js` files that intentionally use JSX. Vite is configured to handle that.
- Keep `frontend/src/api/index.js` as the source of truth for API helpers.
- `frontend/src/api.js` exists only so older imports keep working.
- The cart store exposes both `cartTotal` and a legacy `total` alias so older screens keep working.
- The app’s checkout route is `/checkout`.
- `POST /api/feedback` is used by the restock dashboard for simple learning signals.

## Troubleshooting

- If the frontend fails to start, make sure you are running `npm run dev` from the `frontend/` folder, not the repository root.
- If the backend cannot connect to MongoDB, verify `MONGODB_URI` and that MongoDB is running.
- If seeded data looks missing, rerun `npm run seed` inside `backend/`.
- If Vite chooses a different port, use the URL printed in the terminal.

## Suggested Starting Points For New Contributors

If someone is reading this project for the first time, start with these files in order:

1. `README.md`
2. `backend/server.js`
3. `backend/routes/auth.js`
4. `backend/routes/ai.js`
5. `backend/routes/restock.js`
6. `frontend/src/store/index.js`
7. `frontend/src/App.jsx`
8. `frontend/src/pages/AIDashboard.jsx`
9. `frontend/src/pages/RestockDashboard.jsx`

That path explains the app from the server entrypoint to the main user-facing screens.
