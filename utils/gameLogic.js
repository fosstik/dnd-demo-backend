// Логика расчета результатов действий
const calculateActionResult = (statValue, actionId) => {
  const randomValue = Math.random() * 10;
  const total = statValue + randomValue;
  const maxStat = 10;
  
  let type, description;
  
  if (total < maxStat / 2) {
    type = 'failure';
    description = 'Провал, действие блокируется';
  } else if (total < maxStat * 0.75) {
    type = 'success';
    description = 'Частичный успех, половина штрафа';
  } else {
    type = 'perfect';
    description = 'Идеальный успех';
  }
  
  return { type, description, total };
};

// Проверка завершения комнаты
const isRoomCompleted = (room, teamProgress) => {
  if (room.type === 'unique') {
    return room.actions.every(action => 
      !action.available || teamProgress[action.id]
    );
  } else {
    const successfulActions = Object.values(teamProgress)
      .filter(progress => progress.result !== 'failure').length;
    return successfulActions >= room.required_successes;
  }
};

export {
  calculateActionResult,
  isRoomCompleted
};