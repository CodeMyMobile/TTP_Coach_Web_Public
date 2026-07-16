import assert from 'node:assert/strict';
import test from 'node:test';

import { formatCertificationString, parseCertificationList } from './certifications.js';

test('parseCertificationList handles comma spacing and arrays', () => {
  assert.deepEqual(parseCertificationList('USPTA,USPTA Elite, PTR'), ['USPTA', 'USPTA Elite', 'PTR']);
  assert.deepEqual(parseCertificationList(['USPTA', ' USPTA Elite ']), ['USPTA', 'USPTA Elite']);
});

test('formatCertificationString normalizes API certification values', () => {
  assert.equal(formatCertificationString('USPTA,USPTA Elite'), 'USPTA, USPTA Elite');
});
