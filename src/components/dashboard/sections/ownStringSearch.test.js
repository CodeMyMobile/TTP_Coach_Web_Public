import test from 'node:test';
import assert from 'node:assert/strict';
import {
  matchOwnString,
  ownStringHint,
  ownStringResults,
  searchOwnStrings,
  shopStocks,
  typedOwnString
} from './ownStringSearch.js';

// The coach catalog: every active string, with the shop's string price where it stocks it.
const catalog = [
  { id: 1, brand: 'Solinco', name: 'Hyper-G', string_price_cents: 1500 },
  { id: 2, brand: 'Solinco', name: 'Hyper-G Soft', string_price_cents: null },
  { id: 3, brand: 'Luxilon', name: 'ALU Power', string_price_cents: null },
  { id: 4, brand: 'Wilson', name: 'NXT', string_price_cents: 1800 },
  { id: 5, brand: 'Babolat', name: 'RPM Blast', string_price_cents: null }
];

test('a string the shop prices is one it stocks; in_stock wins when a catalog has it', () => {
  assert.equal(shopStocks(catalog[0]), true);
  assert.equal(shopStocks(catalog[1]), false);
  assert.equal(shopStocks({ in_stock: false, string_price_cents: 1500 }), false);
  assert.equal(shopStocks(undefined), false);
});

test('search: every typed word somewhere in brand and name, gauges ignored, stocked first', () => {
  assert.deepEqual(searchOwnStrings('hyp', catalog), [
    { id: '1', name: 'Solinco Hyper-G', inStock: true },
    { id: '2', name: 'Solinco Hyper-G Soft', inStock: false }
  ]);
  assert.deepEqual(searchOwnStrings('alu pow 1.25mm', catalog).map(row => row.id), ['3']);
  // Stocked first, then a name word starting with the first word typed.
  assert.deepEqual(searchOwnStrings('l', catalog).map(row => row.id), ['1', '4', '3', '5', '2']);
  assert.deepEqual(searchOwnStrings('  ', catalog), []);
  assert.deepEqual(searchOwnStrings('16L', catalog), []);
  assert.equal(searchOwnStrings('s', catalog, 2).length, 2);
});

test('match: brand and name exactly, maybe with a gauge, the longest name winning', () => {
  assert.equal(matchOwnString('solinco hyper-g', catalog)?.id, 1);
  assert.equal(matchOwnString('Solinco  Hyper-G 16L', catalog)?.id, 1);
  assert.equal(matchOwnString('Solinco Hyper-G Soft 1.25 mm', catalog)?.id, 2);
  assert.equal(matchOwnString('Solinco Hyper-G something', catalog), undefined);
  assert.equal(matchOwnString('Hyper-G', catalog), undefined);
  assert.equal(matchOwnString('', catalog), undefined);
});

test('typing sets the catalog string only while the text still names it', () => {
  assert.deepEqual(typedOwnString('Wilson NXT 16', catalog), { own_string_text: 'Wilson NXT 16', string_id: '4' });
  assert.deepEqual(typedOwnString('Wilson NX', catalog), { own_string_text: 'Wilson NX', string_id: '' });
});

test('a pick left alone lists nothing; the hint says what will be saved', () => {
  assert.deepEqual(ownStringResults({ own_string_text: 'Wilson NXT', string_id: '4' }, catalog), []);
  assert.equal(ownStringResults({ own_string_text: 'Wilson', string_id: '' }, catalog).length, 1);
  assert.equal(ownStringHint({ own_string_text: 'Wilson NXT', string_id: '4' }, catalog), 'In the catalog, and the shop stocks it');
  assert.equal(ownStringHint({ own_string_text: 'Babolat RPM Blast', string_id: '5' }, catalog), 'In the catalog');
  assert.equal(ownStringHint({ own_string_text: 'Mystery poly', string_id: '' }, catalog), 'No catalog match: pick one from the list, or it’s saved as typed');
  assert.equal(ownStringHint({ own_string_text: '', string_id: '' }, catalog), '');
});
