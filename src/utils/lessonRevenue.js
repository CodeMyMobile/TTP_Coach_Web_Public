import { isComped } from './bookingPaymentState.js';

export const getExpectedGroupRevenue = ({ pricePerPerson, participants = [] } = {}) => {
  const parsedPrice = Number(pricePerPerson);
  const payingParticipants = (Array.isArray(participants) ? participants : []).filter(
    (participant) => participant?.holdsSpot && !isComped(participant.paymentMethod)
  );

  return {
    participantCount: payingParticipants.length,
    expectedRevenue: Number.isFinite(parsedPrice) ? parsedPrice * payingParticipants.length : null
  };
};
