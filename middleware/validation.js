import { getGameState } from '../utils/dataManager.js';

// Валидация данных игрока
const validatePlayer = (req, res, next) => {
  const { playerId } = req.body;
  
  if (!playerId) {
    return res.status(400).json({ error: 'Player ID is required' });
  }
  
  const gameState = getGameState();
  const player = gameState.players[playerId];
  
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }
  
  req.player = player;
  next();
};

// Валидация GM прав
const validateGM = (req, res, next) => {
  const { playerId } = req.body;
  
  if (!playerId) {
    return res.status(400).json({ error: 'Player ID is required' });
  }
  
  const gameState = getGameState();
  const player = gameState.players[playerId];
  
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }
  
  if (player.role !== 'gm') {
    return res.status(403).json({ error: 'GM privileges required' });
  }
  
  req.player = player;
  next();
};

// Валидация команды
const validateTeam = (req, res, next) => {
  const { teamId } = req.body;
  
  if (!teamId) {
    return res.status(400).json({ error: 'Team ID is required' });
  }
  
  const gameState = getGameState();
  const team = gameState.teams[teamId];
  
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }
  
  req.team = team;
  next();
};

// Валидация комнаты
const validateRoom = (req, res, next) => {
  const roomId = req.body.roomId || req.params.roomId;
  
  if (!roomId) {
    return res.status(400).json({ error: 'Room ID is required' });
  }
  
  const gameState = getGameState();
  const room = gameState.rooms[roomId];
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  req.room = room;
  next();
};

// Валидация действия
const validateAction = (req, res, next) => {
  const { actionId } = req.body;
  
  if (!actionId) {
    return res.status(400).json({ error: 'Action ID is required' });
  }
  
  const gameState = getGameState();
  const currentRoomId = gameState.game.currentRoom;
  
  if (!currentRoomId) {
    return res.status(400).json({ error: 'No active room' });
  }
  
  const room = gameState.rooms[currentRoomId];
  const action = room.actions.find(a => a.id === actionId);
  
  if (!action) {
    return res.status(404).json({ error: 'Action not found' });
  }
  
  if (!action.available) {
    return res.status(400).json({ error: 'Action is not available' });
  }
  
  req.action = action;
  req.room = room;
  next();
};

// Проверка состояния игры
const validateGameState = (requiredStatus) => {
  return (req, res, next) => {
    const gameState = getGameState();
    
    if (!gameState.game.status) {
      return res.status(500).json({ error: 'Game not initialized' });
    }
    
    if (requiredStatus && gameState.game.status !== requiredStatus) {
      return res.status(400).json({ 
        error: `Game must be in ${requiredStatus} state. Current state: ${gameState.game.status}` 
      });
    }
    
    req.gameState = gameState;
    next();
  };
};

// Логирование запросов
const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`, {
    body: req.body,
    params: req.params,
    query: req.query
  });
  next();
};

// Обработка ошибок
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

// Rate limiting (базовая реализация)
const createRateLimiter = (windowMs, maxRequests) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Очистка старых записей
    for (const [key, timestamp] of requests.entries()) {
      if (timestamp < windowStart) {
        requests.delete(key);
      }
    }
    
    const clientRequests = Array.from(requests.entries())
      .filter(([key]) => key.startsWith(ip))
      .length;
    
    if (clientRequests >= maxRequests) {
      return res.status(429).json({ 
        error: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    requests.set(`${ip}-${now}`, now);
    next();
  };
};

export {
  validatePlayer,
  validateGM,
  validateTeam,
  validateRoom,
  validateAction,
  validateGameState,
  requestLogger,
  errorHandler,
  createRateLimiter
};