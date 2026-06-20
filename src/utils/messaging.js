import { getCoachPlayerById } from '../services/coach';

const normalizePhone = (value) => String(value || '').replace(/\s+/g, '');

export const resolvePlayerPhone = async ({ playerId, phone } = {}) => {
  const directPhone = typeof phone === 'string' ? phone.trim() : '';
  if (directPhone) {
    return directPhone;
  }

  if (!playerId) {
    return '';
  }

  try {
    const playerDetails = await getCoachPlayerById({ playerId });
    return (
      playerDetails?.phone ||
      playerDetails?.phone_number ||
      playerDetails?.data?.phone ||
      playerDetails?.data?.phone_number ||
      ''
    );
  } catch (error) {
    // Ignore fetch errors and fall back to empty contact details.
    return '';
  }
};

export const openSmsComposer = async ({ playerId, phone } = {}) => {
  const resolvedPhone = await resolvePlayerPhone({ playerId, phone });
  const normalizedPhone = normalizePhone(resolvedPhone);
  const smsLink = `sms:${normalizedPhone}`;
  const smstoLink = `smsto:${normalizedPhone}`;

  if (typeof window !== 'undefined') {
    window.location.href = smsLink;
    setTimeout(() => {
      window.location.href = smstoLink;
    }, 75);
  }
};

export const openPhoneDialer = async ({ playerId, phone } = {}) => {
  const resolvedPhone = await resolvePlayerPhone({ playerId, phone });
  const normalizedPhone = normalizePhone(resolvedPhone);

  if (typeof window !== 'undefined') {
    window.location.href = `tel:${normalizedPhone}`;
  }
};

export const textAllParticipants = async (participants = []) => {
  const resolvedPhones = await Promise.all(
    participants.map((participant) =>
      resolvePlayerPhone({ playerId: participant.playerId, phone: participant.phone })
    )
  );

  const dedupedPhones = [...new Set(resolvedPhones.map(normalizePhone).filter(Boolean))];

  if (dedupedPhones.length === 0 || typeof window === 'undefined') {
    return;
  }

  window.location.href = `sms:${dedupedPhones.join(',')}`;
};
