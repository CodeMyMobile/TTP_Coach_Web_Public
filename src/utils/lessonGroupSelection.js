export const resolveGroupPlayerIds = (group = {}) => {
  const explicitIds = Array.isArray(group.player_ids) ? group.player_ids : [];
  if (explicitIds.length > 0) {
    return explicitIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0);
  }

  const players = Array.isArray(group.players) ? group.players : [];
  return players
    .map((player) => Number(player?.player_id ?? player?.id ?? player?.user_id))
    .filter((id) => Number.isFinite(id) && id > 0);
};

export const getUniqueSelectedPlayerIds = ({ playerIds = [], groupIds = [], groups = [] } = {}) => {
  const normalizedPlayers = (Array.isArray(playerIds) ? playerIds : [])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);

  const groupMap = new Map((Array.isArray(groups) ? groups : []).map((group) => [Number(group.id), group]));
  const fromGroups = (Array.isArray(groupIds) ? groupIds : [])
    .map((id) => groupMap.get(Number(id)))
    .filter(Boolean)
    .flatMap((group) => resolveGroupPlayerIds(group));

  return [...new Set([...normalizedPlayers, ...fromGroups])];
};

export const validatePrivateLessonSelection = ({
  playerIds = [],
  groupIds = [],
  groups = [],
  invitees = []
} = {}) => {
  const uniqueExistingPlayers = getUniqueSelectedPlayerIds({ playerIds, groupIds, groups });
  const validInviteesCount = (Array.isArray(invitees) ? invitees : []).filter((invitee) => {
    const fullName = String(invitee?.full_name || '').trim();
    const phone = String(invitee?.phone || '').trim();
    const email = String(invitee?.email || '').trim();
    return Boolean(fullName && (phone || email));
  }).length;

  const total = uniqueExistingPlayers.length + validInviteesCount;
  return {
    total,
    isValid: total === 1,
    uniqueExistingPlayers
  };
};
