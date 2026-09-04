const normalize = (value) => String(value || '').trim().toLowerCase();

export const filterCompedPlayerOptions = (students, query, existingPlayerIds) => {
  const normalizedQuery = normalize(query);
  const existingIds = existingPlayerIds instanceof Set ? existingPlayerIds : new Set();

  return (Array.isArray(students) ? students : [])
    .map((student) => ({
      id: Number(student.playerId ?? student.player_id ?? student.id),
      name: student.name || student.full_name || student.player_name || 'Unnamed player',
      email: student.email || student.email_address || ''
    }))
    .filter((student) => Number.isFinite(student.id) && student.id > 0 && !existingIds.has(student.id))
    .filter((student, index, list) => list.findIndex((candidate) => candidate.id === student.id) === index)
    .filter((student) => {
      if (!normalizedQuery) return true;
      return normalize(student.name).includes(normalizedQuery) || normalize(student.email).includes(normalizedQuery);
    })
    .sort((left, right) => {
      const leftName = normalize(left.name);
      const rightName = normalize(right.name);
      const leftRank = normalizedQuery && leftName.startsWith(normalizedQuery) ? 0 : 1;
      const rightRank = normalizedQuery && rightName.startsWith(normalizedQuery) ? 0 : 1;
      return leftRank - rightRank || leftName.localeCompare(rightName);
    });
};
