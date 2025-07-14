# Nova Backend

A real-time chat application backend powered by Novita AI.

## Features

- 🔐 JWT-based authentication with refresh tokens
- 💬 Real-time chat with WebSocket support (Socket.io)
- 🤖 AI-powered responses using Novita AI
- 📝 Conversation and message management
- 🚀 Built with TypeScript, Express, PostgreSQL, and Redis
- 🔄 Streaming AI responses for better UX

## Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- npm or yarn

## Quick Start

1. **Clone and install dependencies:**
   ```bash
   cd nova/backend
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start PostgreSQL and Redis:**
   ```bash
   ./scripts/setup-db.sh
   ```
   
   Or manually with Docker Compose:
   ```bash
   docker-compose up -d
   ```

4. **Build the TypeScript code:**
   ```bash
   npm run build
   ```

5. **Start the server:**
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### Conversations
- `GET /api/chat/conversations` - Get all conversations
- `POST /api/chat/conversations` - Create new conversation
- `GET /api/chat/conversations/:id` - Get conversation details
- `PUT /api/chat/conversations/:id` - Update conversation
- `DELETE /api/chat/conversations/:id` - Delete conversation
- `POST /api/chat/conversations/:id/archive` - Archive conversation
- `POST /api/chat/conversations/:id/unarchive` - Unarchive conversation
- `GET /api/chat/conversations/search?q=query` - Search conversations

### Messages
- `GET /api/chat/conversations/:id/messages` - Get messages in conversation
- `POST /api/chat/conversations/:id/messages` - Send message and get AI response

## WebSocket Events

### Client to Server
- `chat:stream` - Send message for streaming AI response
- `conversation:join` - Join conversation room
- `conversation:leave` - Leave conversation room

### Server to Client
- `user_message_saved` - User message saved confirmation
- `stream_start` - Streaming response started
- `stream_chunk` - Streaming response chunk
- `stream_complete` - Streaming response completed
- `stream_error` - Streaming error occurred
- `error` - General error

## Database Schema

The application uses PostgreSQL with the following main tables:
- `users` - User accounts and profiles
- `conversations` - Chat conversations with settings
- `messages` - Chat messages with metadata
- `refresh_tokens` - JWT refresh tokens

## Development

### Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests (when implemented)
- `npm run lint` - Lint code

### Docker Services
- PostgreSQL on port 5432
- Redis on port 6379
- Adminer (DB UI) on port 8080

### Project Structure
```
src/
├── config/          # Configuration files
├── controllers/     # Request handlers
├── database/        # Database connection and schema
├── middleware/      # Express middleware
├── models/          # Data models
├── routes/          # API routes
├── services/        # Business logic services
├── types/           # TypeScript type definitions
└── utils/           # Utility functions
```

## Environment Variables

See `.env.example` for all required environment variables.

## Troubleshooting

### Database Connection Failed
- Ensure Docker is running
- Run `docker-compose ps` to check service status
- Check PostgreSQL logs: `docker-compose logs postgres`

### Redis Connection Failed
- Check Redis is running: `docker-compose ps redis`
- Verify Redis password in `.env` matches docker-compose.yml

### Build Errors
- Delete `dist/` folder and run `npm run build` again
- Check TypeScript version: `npm ls typescript`

## License

MIT
