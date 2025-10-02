import express from 'express';
import { getGameState, addPlayerToTeam } from '../utils/dataManager.js';
import { validateTeam, validateGameState } from '../middleware/validation.js';
import { authenticatePlayer, requireRole, requireTeamAccess } from '../middleware/authentication.js';

const router = express.Router();

// Выбор команды
router.post('/select-team', authenticatePlayer, validateGameState('lobby'), (req, res) => {
  const { teamId } = req.body;
  
  if (!teamId) {
    return res.status(400).json({ error: 'Team ID is required' });
  }
  
  if (addPlayerToTeam(req.playerId, teamId)) {
    res.json({ success: true, gameState: getGameState() });
  } else {
    res.status(400).json({ error: 'Failed to join team' });
  }
});

// Получение списка команд
router.get('/', authenticatePlayer, (req, res) => {
  res.json({ teams: getGameState().teams });
});

// ГМ: изменение названия команды
router.post('/gm/rename-team', authenticatePlayer, requireRole('gm'), validateTeam, (req, res) => {
  const { teamId, newName } = req.body;
  const gameState = getGameState();
  
  gameState.teams[teamId].name = newName;
  res.json({ success: true, teams: gameState.teams });
});

// ГМ: перемещение игрока между командами
router.post('/gm/move-player', authenticatePlayer, requireRole('gm'), (req, res) => {
  const { playerId, newTeamId } = req.body;
  
  if (!playerId || !newTeamId) {
    return res.status(400).json({ error: 'Player ID and Team ID are required' });
  }
  
  if (addPlayerToTeam(playerId, newTeamId)) {
    res.json({ success: true, gameState: getGameState() });
  } else {
    res.status(400).json({ error: 'Failed to move player' });
  }
});

export default router;