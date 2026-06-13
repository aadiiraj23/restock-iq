# Amazon Now AI Shopping Agent + ReStock AI

A full-stack MERN e-commerce application with AI-powered shopping and smart replenishment.

## Features

### 🤖 AI Shopping Agent
- Natural language shopping: "Movie night for 4 people", "Baby has fever"
- Prompt → Product DB + AI → Matched Products → Ready Cart
- Mission templates for quick one-tap shopping sessions
- Smart ranking by delivery speed, relevance, price, and preferences

### 📦 ReStock AI
- Track consumable products with predicted depletion dates
- Visual dashboard with color-coded urgency levels
- Calendar view of upcoming restocks
- Feedback learning (finished early / still have plenty)
- Budget tracking and analytics
- One-click bundle restock for all due items

### 🛒 E-Commerce Core
- Full product catalog with search, filter, and categories
- Product detail pages with substitutions
- Cart management with quantity controls
- Express checkout with address, delivery slots, payment
- Order tracking with real-time status updates
- Order history

### 👤 User Dashboard
- Order statistics and spending overview
- Quick action cards for AI Agent, ReStock, Store
- Recent orders and restock alerts
- Profile & preferences management
- Household settings for AI personalization

### 🔧 Admin Dashboard
- Product management (view, edit, delete)
- Order management with fulfillment status
- Analytics: revenue, category distribution, stock alerts
- Low stock warnings

## Tech Stack

- **Frontend:** React 18, React Router 6, Zustand, Axios, Lucide Icons
- **Backend:** Node.js, Express.js, MongoDB, Mongoose
- **Auth:** JWT with bcrypt
- **AI:** Rule-based NLP (upgradeable to LLM/OpenAI/Bedrock)

## Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Backend
```bash
cd backend
npm install
npm run seed    # Seeds products, users, restock items
npm run dev     # Starts on port 5000
```

### Frontend
```bash
cd frontend
npm install
npm start       # Starts on port 3000
```

### Demo Accounts
- **Admin:** admin@amazon.com / admin123
- **User:** user@test.com / test123

## API Architecture

### AI Flow
```
User Prompt → POST /api/ai/shop
  → Load Product DB (all in-stock products)
  → AI processes prompt + products + user preferences
  → Returns valid product IDs mapped to database
  → Frontend displays matched products
```

### Key Endpoints
| Endpoint | Description |
|----------|-------------|
| POST /api/ai/shop | AI agent: prompt → products |
| POST /api/intent/parse | Parse intent + recommend |
| POST /api/cart/build | Create cart from product IDs |
| POST /api/checkout/prepare | Process checkout |
| GET /api/restock/dashboard | Restock tracker |
| GET /api/restock/calendar | Calendar view |
| POST /api/restock/feedback | Improve predictions |

## Project Structure
```
├── backend/
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express routes
│   ├── services/        # AI & business logic
│   ├── middleware/      # Auth middleware
│   ├── seed.js          # Database seeder
│   └── server.js        # Express app
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── pages/       # Route pages
│       ├── api.js       # API client
│       ├── store.js     # Zustand state
│       └── App.js       # Router setup
```
