export const isPendingParticipant = (participant) =>
  String(participant?.status || '').toLowerCase().includes('pending');

export const splitParticipantsByBookingState = (participants = []) => {
  const active = [];
  const pending = [];
  const other = [];

  participants.forEach((participant) => {
    if (participant?.holdsSpot) {
      active.push(participant);
      return;
    }

    if (isPendingParticipant(participant)) {
      pending.push(participant);
      return;
    }

    other.push(participant);
  });

  return { active, pending, other };
};
