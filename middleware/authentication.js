import { getGameState } from '../utils/dataManager.js';

// Простая аутентификация по playerId
const authenticatePlayer = (req, res, next) => {
  const playerId = req.body.playerId || req.query.playerId || req.headers['x-player-id'];
  
  if (!playerId) {
    return res.status(401).json({ error: 'Player authentication required' });
  }
  
  const gameState = getGameState();
  const player = gameState.players[playerId];
  
  if (!player) {
    return res.status(401).json({ error: 'Invalid player ID' });
  }
  
  req.player = player;
  req.playerId = playerId;
  next();
};

// Проверка роли игрока
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.player) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (req.player.role !== role) {
      return res.status(403).json({ error: `Required role: ${role}` });
    }
    
    next();
  };
};

// Проверка принадлежности к команде
const requireTeamAccess = (req, res, next) => {
  const teamId = req.body.teamId || req.params.teamId;
  
  if (!teamId) {
    return res.status(400).json({ error: 'Team ID is required' });
  }
  
  if (!req.player.team && req.player.role !== 'gm') {
    return res.status(403).json({ error: 'Player must be in a team' });
  }
  
  if (req.player.role !== 'gm' && req.player.team !== teamId) {
    return res.status(403).json({ error: 'Access to other team is forbidden' });
  }
  
  next();
};

export {
  authenticatePlayer,
  requireRole,
  requireTeamAccess
};