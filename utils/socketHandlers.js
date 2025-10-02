import { getGameState, setGameState } from './dataManager.js';

const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-game', (playerId) => {
      socket.join('game-room');
      socket.playerId = playerId;
      
      socket.emit('game-state-update', getGameState());
    });

    socket.on('player-update', (playerData) => {
      io.to('game-room').emit('game-state-update', getGameState());
    });

    socket.on('player-action', (actionData) => {
      io.to('game-room').emit('action-result', actionData);
      io.to('game-room').emit('game-state-update', getGameState());
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};

export { setupSocketHandlers };