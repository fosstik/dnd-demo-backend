const express = require('express');
const router = express.Router();
const { getGameState, addPlayerToTeam, updatePlayer } = require('../utils/dataManager');

// Выбор команды
router.post('/select-team', (req, res) => {
  const { playerId, teamId } = req.body;
  
  if (addPlayerToTeam(playerId, teamId)) {
    res.json({ success: true, gameState: getGameState() });
  } else {
    res.status(400).json({ error: 'Failed to join team' });
  }
});

// Получение списка команд
router.get('/', (req, res) => {
  res.json({ teams: getGameState().teams });
});

// ГМ: изменение названия команды
router.post('/gm/rename-team', (req, res) => {
  const { teamId, newName } = req.body;
  const gameState = getGameState();
  
  if (gameState.teams[teamId]) {
    gameState.teams[teamId].name = newName;
    res.json({ success: true, teams: gameState.teams });
  } else {
    res.status(404).json({ error: 'Team not found' });
  }
});

// ГМ: перемещение игрока между командами
router.post('/gm/move-player', (req, res) => {
  const { playerId, newTeamId } = req.body;
  
  if (addPlayerToTeam(playerId, newTeamId)) {
    res.json({ success: true, gameState: getGameState() });
  } else {
    res.status(400).json({ error: 'Failed to move player' });
  }
});

module.exports = router;