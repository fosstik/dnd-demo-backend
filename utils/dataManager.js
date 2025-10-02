import { v4 as uuidv4 } from 'uuid';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Хранение данных в памяти
let gameState = {
  players: {},
  teams: {},
  rooms: {},
  game: {
    status: 'lobby',
    currentRoom: null,
    turnOrder: [],
    currentTurn: 0
  }
};

// Инициализация данных
const initGameData = async () => {
  try {
    // Загрузка комнат из файла
    const roomsPath = join(__dirname, '../data/rooms.json');
    const roomsData = await readFile(roomsPath, 'utf8');
    gameState.rooms = JSON.parse(roomsData);

    // Создание начальных команд
    gameState.teams = {
      'team1': { id: 'team1', name: 'Команда А', players: [], progress: {} },
      'team2': { id: 'team2', name: 'Команда Б', players: [], progress: {} },
      'team3': { id: 'team3', name: 'Команда В', players: [], progress: {} }
    };
    
    console.log('Game data initialized successfully');
  } catch (error) {
    console.error('Error initializing game data:', error);
    // Создаем базовые данные в случае ошибки
    gameState.rooms = {
      'room1': {
        id: 'room1',
        type: 'unique',
        name: 'Тестовая комната',
        description: 'Базовая комната для тестирования',
        actions: []
      }
    };
    gameState.teams = {
      'team1': { id: 'team1', name: 'Команда А', players: [], progress: {} }
    };
  }
};

const getGameState = () => gameState;

const setGameState = (newState) => {
  gameState = { ...gameState, ...newState };
};

const addPlayer = (playerData) => {
  const playerId = uuidv4();
  const player = {
    id: playerId,
    ...playerData,
    ready: false
  };
  gameState.players[playerId] = player;
  return player;
};

const updatePlayer = (playerId, updates) => {
  if (gameState.players[playerId]) {
    gameState.players[playerId] = { ...gameState.players[playerId], ...updates };
    return gameState.players[playerId];
  }
  return null;
};

const addPlayerToTeam = (playerId, teamId) => {
  if (gameState.teams[teamId] && gameState.players[playerId]) {
    // Удаляем игрока из других команд
    Object.values(gameState.teams).forEach(team => {
      team.players = team.players.filter(p => p !== playerId);
    });
    
    gameState.teams[teamId].players.push(playerId);
    gameState.players[playerId].team = teamId;
    return true;
  }
  return false;
};

export {
  getGameState,
  setGameState,
  addPlayer,
  updatePlayer,
  addPlayerToTeam,
  initGameData
};