const toNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const usageStatusOf = (row) =>
  String(row?.usage_status ?? row?.usageStatus ?? row?.usage_metadata?.status ?? '').toLowerCase();

// Rows arrive newest first, and a player who cancelled and rebooked has one row
// per booking. The first row that is not `restored` is the live booking; a
// restored row is a credit already given back, so it is not a credit booking.
export const mapCreditUsageByPlayer = (rows = []) => {
  const byPlayer = new Map();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const playerId = row?.player_id ?? row?.playerId;
    if (playerId === null || playerId === undefined) {
      return;
    }

    const key = String(playerId);
    const status = usageStatusOf(row);
    if (byPlayer.has(key) || status === 'restored') {
      return;
    }

    const creditsTotal = toNumber(row.credits_total ?? row.creditsTotal);
    const creditsUsed = toNumber(row.credits_used ?? row.creditsUsed);
    const creditsRemaining =
      toNumber(row.credits_remaining ?? row.creditsRemaining) ??
      (creditsTotal !== null && creditsUsed !== null ? creditsTotal - creditsUsed : null);

    byPlayer.set(key, {
      isPending: status === 'pending',
      creditsRemaining,
      creditsTotal
    });
  });

  return byPlayer;
};

export const formatParticipantCreditLabel = (usage) => {
  if (!usage) {
    return '';
  }

  const lead = usage.isPending ? 'Credit pending' : 'Booked with credit';
  if (usage.creditsRemaining === null) {
    return lead;
  }

  const remaining =
    usage.creditsTotal !== null
      ? `${usage.creditsRemaining} of ${usage.creditsTotal} left`
      : `${usage.creditsRemaining} left`;
  return `${lead} · ${remaining}`;
};
