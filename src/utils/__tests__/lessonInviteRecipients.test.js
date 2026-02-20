import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInviteRecipients } from '../lessonInviteRecipients.js';

test('parseInviteRecipients trims, removes empties, and dedupes emails and phones', () => {
  const result = parseInviteRecipients({
    emails: '  One@Example.com, two@example.com, one@example.com, , TWO@example.com  ',
    phones: ' +1 (555) 111-2222, 5551112222,  , +1-555-333-4444, +1 555 333 4444 '
  });

  assert.deepEqual(result, {
    emails: ['One@Example.com', 'two@example.com'],
    phone_numbers: ['+1 (555) 111-2222', '+1-555-333-4444']
  });
});
