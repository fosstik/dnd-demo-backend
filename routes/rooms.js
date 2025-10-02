import express from 'express';
import { getGameState, setGameState } from '../utils/dataManager.js';
import { isRoomCompleted } from '../utils/gameLogic.js';

const router = express.Router();

// Получение текущей комнаты
router.get('/current', (req, res) => {
  const gameState = getGameState();
  const currentRoomId = gameState.game.currentRoom;
  
  if (!currentRoomId) {
    return res.status(404).json({ error: 'No active room' });
  }
  
  const currentRoom = gameState.rooms[currentRoomId];
  if (!currentRoom) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  res.json({ room: currentRoom });
});

// Получение всех комнат (для ГМ)
router.get('/', (req, res) => {
  const gameState = getGameState();
  res.json({ rooms: gameState.rooms });
});

// Получение конкретной комнаты по ID
router.get('/:roomId', (req, res) => {
  const { roomId } = req.params;
  const gameState = getGameState();
  
  const room = gameState.rooms[roomId];
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  res.json({ room });
});

// Переход к следующей комнате (для ГМ)
router.post('/next', (req, res) => {
  const gameState = getGameState();
  const currentRoomId = gameState.game.currentRoom;
  
  if (!currentRoomId) {
    return res.status(400).json({ error: 'No active room' });
  }
  
  const roomIds = Object.keys(gameState.rooms);
  const currentIndex = roomIds.indexOf(currentRoomId);
  
  if (currentIndex === -1) {
    return res.status(404).json({ error: 'Current room not found' });
  }
  
  const nextIndex = currentIndex + 1;
  if (nextIndex >= roomIds.length) {
    setGameState({
      game: {
        ...gameState.game,
        status: 'finished',
        currentRoom: null
      }
    });
    
    return res.json({ 
      success: true, 
      gameCompleted: true,
      gameState: getGameState() 
    });
  }
  
  const nextRoomId = roomIds[nextIndex];
  setGameState({
    game: {
      ...gameState.game,
      currentRoom: nextRoomId,
      currentTurn: 0
    }
  });
  
  Object.values(gameState.teams).forEach(team => {
    team.progress = {};
  });
  
  res.json({ 
    success: true, 
    nextRoom: gameState.rooms[nextRoomId],
    gameState: getGameState() 
  });
});

// Проверка завершения текущей комнаты
router.get('/current/completed', (req, res) => {
  const gameState = getGameState();
  const currentRoomId = gameState.game.currentRoom;
  
  if (!currentRoomId) {
    return res.status(400).json({ error: 'No active room' });
  }
  
  const currentRoom = gameState.rooms[currentRoomId];
  const completedTeams = {};
  
  Object.values(gameState.teams).forEach(team => {
    completedTeams[team.id] = isRoomCompleted(currentRoom, team.progress || {});
  });
  
  let roomCompleted = false;
  if (currentRoom.type === 'common') {
    const totalSuccesses = Object.values(gameState.teams).reduce((total, team) => {
      const successfulActions = Object.values(team.progress || {})
        .filter(progress => progress.result !== 'failure').length;
      return total + successfulActions;
    }, 0);
    
    roomCompleted = totalSuccesses >= currentRoom.required_successes;
  } else {
    roomCompleted = Object.values(completedTeams).every(completed => completed);
  }
  
  res.json({ 
    roomCompleted,
    completedTeams,
    requiredSuccesses: currentRoom.required_successes,
    currentSuccesses: calculateCurrentSuccesses(gameState)
  });
});

// Получение прогресса по комнате
router.get('/:roomId/progress', (req, res) => {
  const { roomId } = req.params;
  const gameState = getGameState();
  
  const room = gameState.rooms[roomId];
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  const teamProgress = {};
  Object.values(gameState.teams).forEach(team => {
    teamProgress[team.id] = {
      progress: team.progress || {},
      completed: isRoomCompleted(room, team.progress || {})
    };
  });
  
  res.json({ 
    room,
    teamProgress,
    overallProgress: calculateOverallProgress(room, gameState.teams)
  });
});

// Сброс комнаты (для ГМ)
router.post('/:roomId/reset', (req, res) => {
  const { roomId } = req.params;
  const gameState = getGameState();
  
  const room = gameState.rooms[roomId];
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  room.actions.forEach(action => {
    action.available = true;
  });
  
  Object.values(gameState.teams).forEach(team => {
    team.progress = {};
  });
  
  res.json({ 
    success: true, 
    room,
    gameState: getGameState() 
  });
});

// Вспомогательные функции
function calculateCurrentSuccesses(gameState) {
  return Object.values(gameState.teams).reduce((total, team) => {
    const successfulActions = Object.values(team.progress || {})
      .filter(progress => progress.result !== 'failure').length;
    return total + successfulActions;
  }, 0);
}

function calculateOverallProgress(room, teams) {
  if (room.type === 'common') {
    const totalSuccesses = Object.values(teams).reduce((total, team) => {
      const successfulActions = Object.values(team.progress || {})
        .filter(progress => progress.result !== 'failure').length;
      return total + successfulActions;
    }, 0);
    
    return {
      type: 'common',
      current: totalSuccesses,
      required: room.required_successes,
      percentage: Math.min(100, (totalSuccesses / room.required_successes) * 100)
    };
  } else {
    const completedTeams = Object.values(teams).filter(team => 
      isRoomCompleted(room, team.progress || {})
    ).length;
    
    const totalTeams = Object.values(teams).length;
    
    return {
      type: 'unique',
      completed: completedTeams,
      total: totalTeams,
      percentage: (completedTeams / totalTeams) * 100
    };
  }
}

export default router;