export const PAY_ON_COURT_METHOD = 'pay_on_court';
export const COMPED_METHOD = 'comped';

export const isPayOnCourt = (method) =>
  String(method ?? '').toLowerCase() === PAY_ON_COURT_METHOD;

export const isComped = (method) =>
  String(method ?? '').toLowerCase() === COMPED_METHOD;

export const parseStatusValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const resolveBookingPaymentState = ({
  status,
  paymentStatus,
  paymentMethod
} = {}) => {
  const parsedStatus = parseStatusValue(status);
  const parsedPaymentStatus = parseStatusValue(paymentStatus);

  if (parsedStatus === 2 || parsedPaymentStatus === 2) {
    return {
      key: 'cancelled',
      label: 'Cancelled',
      tone: 'danger',
      paymentDue: false
    };
  }

  if (isComped(paymentMethod)) {
    return {
      key: 'comped',
      label: 'Booked · added by coach',
      tone: 'success',
      paymentDue: false
    };
  }

  if (parsedStatus === 1 && parsedPaymentStatus === 1) {
    return {
      key: 'booked',
      label: 'Confirmed',
      tone: 'success',
      paymentDue: false
    };
  }

  if (parsedStatus === 1 && isPayOnCourt(paymentMethod)) {
    return {
      key: 'pay_on_court',
      label: 'Booked · pay on the day',
      tone: 'success',
      paymentDue: true
    };
  }

  if (parsedStatus === 1 && parsedPaymentStatus === null) {
    return {
      key: 'booked',
      label: 'Confirmed',
      tone: 'success',
      paymentDue: false
    };
  }

  return {
    key: 'pending',
    label: 'Pending',
    tone: 'pending',
    paymentDue: false
  };
};

export const holdsLessonSpot = ({
  status,
  paymentStatus,
  paymentMethod
} = {}) => {
  const parsedStatus = parseStatusValue(status);
  const parsedPaymentStatus = parseStatusValue(paymentStatus);

  if (parsedStatus === 2 || parsedPaymentStatus === 2) {
    return false;
  }

  if (isComped(paymentMethod)) {
    return true;
  }

  if (parsedStatus !== 1) {
    return false;
  }

  return parsedPaymentStatus === 1 || parsedPaymentStatus === null || isPayOnCourt(paymentMethod);
};
