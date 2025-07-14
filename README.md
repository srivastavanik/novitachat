# Nova - AI-Powered Chat Application

Nova is a full-stack chat application that integrates with Novita AI to provide intelligent conversational experiences. Built with Node.js/Express backend and Next.js frontend.

## Features

- 🔐 JWT-based authentication with refresh tokens
- 💬 Real-time chat with WebSocket support
- 🤖 AI-powered responses using Novita AI
- 📱 Responsive web interface
- 🗄️ PostgreSQL database with full schema
- 🚀 Redis caching for performance
- 🔄 Streaming AI responses

## Tech Stack

### Backend
- Node.js with TypeScript
- Express.js
- PostgreSQL (database)
- Redis (caching)
- Socket.io (WebSockets)
- JWT authentication
- Novita AI API integration

### Frontend
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Socket.io client
- Axios for API calls

## Project Structure

```
nova/
├── backend/                 # Backend server
│   ├── src/
│   │   ├── app.ts          # Express app setup
│   │   ├── index.ts        # Server entry point
│   │   ├── config/         # Configuration
│   │   ├── controllers/    # Request handlers
│   │   ├── database/       # Database connection & schema
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # Data models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   ├── scripts/            # Setup scripts
│   └── docker-compose.yml  # Docker services
│
├── frontend/               # Next.js frontend
│   ├── app/               # App router pages
│   ├── lib/               # Utilities and contexts
│   └── public/            # Static assets
│
└── docs/                  # Documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd nova/backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- Database credentials
- JWT secrets
- Redis connection
- Novita AI API key

4. Start PostgreSQL and Redis:
```bash
docker-compose up -d
```

5. Set up the database:
```bash
chmod +x scripts/setup-db.sh
./scripts/setup-db.sh
```

6. Start the backend server:
```bash
npm run dev
```

The backend will run on http://localhost:5000

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd nova/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on http://localhost:3000

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/profile` - Get current user profile

### Chat
- `GET /api/chat/conversations` - List user conversations
- `POST /api/chat/conversations` - Create new conversation
- `GET /api/chat/conversations/:id` - Get conversation details
- `PUT /api/chat/conversations/:id` - Update conversation
- `DELETE /api/chat/conversations/:id` - Delete conversation
- `GET /api/chat/conversations/:id/messages` - Get conversation messages
- `POST /api/chat/conversations/:id/messages` - Send message

### WebSocket Events
- `chat:stream` - Start streaming chat response
- `stream_start` - Streaming started
- `stream_chunk` - Receive stream chunk
- `stream_complete` - Streaming completed
- `stream_error` - Streaming error

## Development

### Running Tests
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

### Building for Production

Backend:
```bash
cd backend && npm run build
```

Frontend:
```bash
cd frontend && npm run build
```

## Deployment

### Using Docker

1. Build the images:
```bash
docker-compose build
```

2. Run the services:
```bash
docker-compose up
```

### Manual Deployment

1. Set up PostgreSQL and Redis on your server
2. Configure environment variables
3. Build and run the backend
4. Build and deploy the frontend to a static hosting service

## Environment Variables

### Backend (.env)
```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/nova

# JWT
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Redis
REDIS_URL=redis://localhost:6379

# Novita AI
NOVITA_API_KEY=your-novita-api-key
NOVITA_API_URL=https://api.novita.ai/v3

# Server
PORT=5000
NODE_ENV=development
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Novita AI for providing the AI capabilities
- The open-source community for the amazing tools and libraries
