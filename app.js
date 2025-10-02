import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Импорты роутов
import authRoutes from './routes/auth.js';
import gameRoutes from './routes/game.js';
import teamsRoutes from './routes/teams.js';
import roomsRoutes from './routes/rooms.js';

// Импорты утилит
import { setupSocketHandlers } from './utils/socketHandlers.js';
import { initGameData } from './utils/dataManager.js';

// Импорты middleware
import { requestLogger, errorHandler, createRateLimiter } from './middleware/validation.js';

const app = express();
const server = http.createServer(app);

// Простые CORS настройки вместо проблемных
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Basic CORS middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],
  credentials: true
}));

app.use(express.json());
app.use(requestLogger);

// Rate limiting для API
app.use('/api/', createRateLimiter(15 * 60 * 1000, 100));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/rooms', roomsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use(errorHandler);

// Socket.io setup
setupSocketHandlers(io);

// Инициализация данных игры
initGameData();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});