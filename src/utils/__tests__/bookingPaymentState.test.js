import test from 'node:test';
import assert from 'node:assert/strict';
import {
  holdsLessonSpot,
  isPayOnCourt,
  resolveBookingPaymentState
} from '../bookingPaymentState.js';

test('recognizes pay-on-court method case-insensitively', () => {
  assert.equal(isPayOnCourt('pay_on_court'), true);
  assert.equal(isPayOnCourt('PAY_ON_COURT'), true);
  assert.equal(isPayOnCourt('card'), false);
});

test('paid booking resolves confirmed with no payment due', () => {
  assert.deepEqual(
    resolveBookingPaymentState({ status: 1, paymentStatus: 1, paymentMethod: 'card' }),
    {
      key: 'booked',
      label: 'Confirmed',
      tone: 'success',
      paymentDue: false
    }
  );
});

test('pay-on-court booking is confirmed with offline payment due', () => {
  assert.deepEqual(
    resolveBookingPaymentState({ status: 1, paymentStatus: 0, paymentMethod: 'pay_on_court' }),
    {
      key: 'pay_on_court',
      label: 'Booked · pay on the day',
      tone: 'success',
      paymentDue: true
    }
  );
});

test('unpaid card booking stays pending', () => {
  assert.deepEqual(
    resolveBookingPaymentState({ status: 1, paymentStatus: 0, paymentMethod: 'card' }),
    {
      key: 'pending',
      label: 'Pending',
      tone: 'pending',
      paymentDue: false
    }
  );
});

test('status-only confirmed booking stays confirmed for legacy payloads', () => {
  assert.deepEqual(
    resolveBookingPaymentState({ status: 1 }),
    {
      key: 'booked',
      label: 'Confirmed',
      tone: 'success',
      paymentDue: false
    }
  );
});

test('cancelled booking wins over payment method', () => {
  assert.deepEqual(
    resolveBookingPaymentState({ status: 2, paymentStatus: 0, paymentMethod: 'pay_on_court' }),
    {
      key: 'cancelled',
      label: 'Cancelled',
      tone: 'danger',
      paymentDue: false
    }
  );
});

test('pay-on-court booking holds a lesson spot', () => {
  assert.equal(holdsLessonSpot({ status: 1, paymentStatus: 0, paymentMethod: 'pay_on_court' }), true);
  assert.equal(holdsLessonSpot({ status: 1, paymentStatus: 1, paymentMethod: 'card' }), true);
  assert.equal(holdsLessonSpot({ status: 1 }), true);
  assert.equal(holdsLessonSpot({ status: 1, paymentStatus: 0, paymentMethod: 'card' }), false);
});
