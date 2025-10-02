const express = require('express');
const router = express.Router();
const { getGameState, addPlayer, updatePlayer } = require('../utils/dataManager');

// Вход в игру
router.post('/join', (req, res) => {
  const { name, role } = req.body;
  
  if (!name || !role) {
    return res.status(400).json({ error: 'Name and role are required' });
  }

  const player = addPlayer({ name, role });
  res.json({ player, gameState: getGameState() });
});

// Выбор персонажа
router.post('/select-character', (req, res) => {
  const { playerId, character, characterClass } = req.body;
  
  const updatedPlayer = updatePlayer(playerId, { 
    character, 
    class: characterClass,
    stats: getStatsForClass(characterClass)
  });
  
  if (updatedPlayer) {
    res.json({ player: updatedPlayer });
  } else {
    res.status(404).json({ error: 'Player not found' });
  }
});

// Готовность игрока
router.post('/toggle-ready', (req, res) => {
  const { playerId } = req.body;
  
  const player = getGameState().players[playerId];
  if (player) {
    const updatedPlayer = updatePlayer(playerId, { ready: !player.ready });
    res.json({ player: updatedPlayer });
  } else {
    res.status(404).json({ error: 'Player not found' });
  }
});

function getStatsForClass(characterClass) {
  // Статы по классам (можно вынести в отдельный файл)
  const stats = {
    warrior: { strength: 8, dexterity: 4, intelligence: 2 },
    rogue: { strength: 4, dexterity: 8, intelligence: 4 },
    mage: { strength: 2, dexterity: 4, intelligence: 8 },
    cleric: { strength: 5, dexterity: 4, intelligence: 6 }
  };
  return stats[characterClass] || stats.warrior;
}

module.exports = router;