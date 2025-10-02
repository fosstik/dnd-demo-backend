const express = require('express');
const router = express.Router();
const { getGameState, setGameState } = require('../utils/dataManager');
const { isRoomCompleted } = require('../utils/gameLogic');

// Получение текущей комнаты
router.get('/current', (req, res) => {
  const gameState = getGameState();
  const currentRoomId = gameState.game.currentRoom;
  
  if (!currentRoomId) {
    return res.status(404).json({ error: 'No current room' });
  }
  
  const currentRoom = gameState.rooms[currentRoomId];
  if (!currentRoom) {
    return res.status(404).json({ error: 'Current room not found' });
  }
  
  res.json({ 
    room: currentRoom,
    gameState: {
      status: gameState.game.status,
      currentTurn: gameState.game.currentTurn,
      turnOrder: gameState.game.turnOrder
    }
  });
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

// Получение всех комнат (для ГМ)
router.get('/', (req, res) => {
  const gameState = getGameState();
  res.json({ rooms: gameState.rooms });
});

// Переход к следующей комнате (только для ГМ)
router.post('/gm/next-room', (req, res) => {
  const gameState = getGameState();
  const currentRoomId = gameState.game.currentRoom;
  
  if (!currentRoomId) {
    return res.status(400).json({ error: 'No current room' });
  }
  
  // Получаем все ID комнат и находим следующую
  const roomIds = Object.keys(gameState.rooms);
  const currentIndex = roomIds.indexOf(currentRoomId);
  
  if (currentIndex === -1) {
    return res.status(400).json({ error: 'Current room not found in rooms list' });
  }
  
  const nextIndex = currentIndex + 1;
  
  if (nextIndex >= roomIds.length) {
    // Игра завершена
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
  const nextRoom = gameState.rooms[nextRoomId];
  
  // Сбрасываем прогресс команд для новой комнаты
  Object.values(gameState.teams).forEach(team => {
    team.progress = {};
  });
  
  // Сбрасываем доступность действий в следующей комнате
  if (nextRoom.actions) {
    nextRoom.actions.forEach(action => {
      action.available = true;
    });
  }
  
  setGameState({
    game: {
      ...gameState.game,
      currentRoom: nextRoomId,
      currentTurn: 0
    },
    teams: gameState.teams,
    rooms: gameState.rooms
  });
  
  res.json({ 
    success: true, 
    nextRoom,
    gameState: getGameState() 
  });
});

// Возврат к предыдущей комнате (только для ГМ)
router.post('/gm/previous-room', (req, res) => {
  const gameState = getGameState();
  const currentRoomId = gameState.game.currentRoom;
  
  if (!currentRoomId) {
    return res.status(400).json({ error: 'No current room' });
  }
  
  const roomIds = Object.keys(gameState.rooms);
  const currentIndex = roomIds.indexOf(currentRoomId);
  
  if (currentIndex <= 0) {
    return res.status(400).json({ error: 'No previous room available' });
  }
  
  const previousRoomId = roomIds[currentIndex - 1];
  const previousRoom = gameState.rooms[previousRoomId];
  
  setGameState({
    game: {
      ...gameState.game,
      currentRoom: previousRoomId,
      currentTurn: 0
    }
  });
  
  res.json({ 
    success: true, 
    previousRoom,
    gameState: getGameState() 
  });
});

// Проверка завершения текущей комнаты
router.get('/current/completion', (req, res) => {
  const gameState = getGameState();
  const currentRoomId = gameState.game.currentRoom;
  
  if (!currentRoomId) {
    return res.status(404).json({ error: 'No current room' });
  }
  
  const currentRoom = gameState.rooms[currentRoomId];
  const completionStatus = {};
  
  // Проверяем завершение для каждой команды
  Object.values(gameState.teams).forEach(team => {
    completionStatus[team.id] = {
      completed: isRoomCompleted(currentRoom, team.progress || {}),
      progress: team.progress || {}
    };
  });
  
  // Проверяем общее завершение комнаты (для общих комнат)
  let roomFullyCompleted = false;
  if (currentRoom.type === 'common') {
    const allSuccessfulActions = Object.values(gameState.teams)
      .flatMap(team => Object.values(team.progress || {}))
      .filter(progress => progress.result !== 'failure');
    
    roomFullyCompleted = allSuccessfulActions.length >= currentRoom.required_successes;
  } else {
    // Для уникальных комнат - все команды должны завершить
    roomFullyCompleted = Object.values(completionStatus).every(status => status.completed);
  }
  
  res.json({
    roomId: currentRoomId,
    completionStatus,
    roomFullyCompleted,
    requiredSuccesses: currentRoom.required_successes
  });
});

// Получение техники левел-дизайна для текущей комнаты (для ГМ)
router.get('/current/technique', (req, res) => {
  const gameState = getGameState();
  const currentRoomId = gameState.game.currentRoom;
  
  if (!currentRoomId) {
    return res.status(404).json({ error: 'No current room' });
  }
  
  const currentRoom = gameState.rooms[currentRoomId];
  
  res.json({
    technique: currentRoom.technique,
    description: currentRoom.description,
    roomName: currentRoom.name
  });
});

// Сброс прогресса текущей комнаты (только для ГМ)
router.post('/gm/reset-current-room', (req, res) => {
  const gameState = getGameState();
  const currentRoomId = gameState.game.currentRoom;
  
  if (!currentRoomId) {
    return res.status(400).json({ error: 'No current room' });
  }
  
  const currentRoom = gameState.rooms[currentRoomId];
  
  // Сбрасываем прогресс всех команд
  Object.values(gameState.teams).forEach(team => {
    team.progress = {};
  });
  
  // Восстанавливаем доступность всех действий
  if (currentRoom.actions) {
    currentRoom.actions.forEach(action => {
      action.available = true;
    });
  }
  
  // Сбрасываем очередь ходов
  setGameState({
    game: {
      ...gameState.game,
      currentTurn: 0
    },
    teams: gameState.teams,
    rooms: gameState.rooms
  });
  
  res.json({ 
    success: true, 
    message: 'Room progress reset',
    gameState: getGameState() 
  });
});

// Получение статистики по текущей комнате
router.get('/current/stats', (req, res) => {
  const gameState = getGameState();
  const currentRoomId = gameState.game.currentRoom;
  
  if (!currentRoomId) {
    return res.status(404).json({ error: 'No current room' });
  }
  
  const stats = {
    roomId: currentRoomId,
    teamProgress: {}
  };
  
  // Собираем статистику по командам
  Object.values(gameState.teams).forEach(team => {
    const progress = team.progress || {};
    const successfulActions = Object.values(progress).filter(p => p.result !== 'failure').length;
    const failedActions = Object.values(progress).filter(p => p.result === 'failure').length;
    
    stats.teamProgress[team.id] = {
      teamName: team.name,
      successfulActions,
      failedActions,
      totalActions: Object.keys(progress).length,
      completionPercentage: team.progress ? (successfulActions / Object.keys(progress).length) * 100 : 0
    };
  });
  
  res.json(stats);
});

module.exports = router;