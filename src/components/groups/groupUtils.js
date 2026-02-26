export const getInitials = (name = '') => {
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return 'GR';
  return parts.map((part) => part[0].toUpperCase()).join('');
};

export const getMemberCount = (group = {}) => {
  if (Number.isFinite(Number(group.member_count))) {
    return Number(group.member_count);
  }
  if (Array.isArray(group.player_ids)) {
    return group.player_ids.length;
  }
  if (Array.isArray(group.players)) {
    return group.players.length;
  }
  return 0;
};
