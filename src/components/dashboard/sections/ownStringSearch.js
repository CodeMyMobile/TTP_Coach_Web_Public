// The player's own string, named from the whole catalog where it's in there, so ratings and
// recommendations know what went in the racket. The shop's strings come first: players often
// bring a reel of something the shop stocks. (The vendor app's src/stringChoice.ts does the
// same for walk-ins.)

const ownStringName = string => `${string.brand} ${string.name}`;
const squash = text => String(text || '').trim().replace(/\s+/g, ' ').toLowerCase();
// What may follow the name and still be the same string: a gauge like 16, 16L, 1.25 or 1.25mm.
const GAUGE_TAIL = /^(?:\d{2}l?|1[.,]\d{2}(?:\s?mm)?)$/;

// The coach catalog marks a string the shop stocks by giving it the shop's string price
// (the API's withShopPrices); in_stock is used when a catalog has it.
export const shopStocks = string =>
  string?.in_stock !== undefined
    ? Boolean(string.in_stock)
    : string?.string_price_cents !== null && string?.string_price_cents !== undefined;

/**
 * Catalog strings for what's typed so far, best first: every word typed appears somewhere in
 * the brand and name ("hyp", "alu pow", "solinco hyper"), a gauge left out. The shop's stock
 * first, then names with a word starting with what was typed first, then A to Z.
 */
export function searchOwnStrings(text, catalog = [], limit = 8) {
  const words = squash(text).split(' ').filter(word => word && word !== 'mm' && !GAUGE_TAIL.test(word));
  if (!words.length) return [];
  const startsWithFirst = key => key.split(/[\s-]/).some(part => part.startsWith(words[0]));
  return catalog
    .map(string => ({ string, name: ownStringName(string), key: squash(ownStringName(string)) }))
    .filter(row => words.every(word => row.key.includes(word)))
    .sort((left, right) =>
      Number(shopStocks(right.string)) - Number(shopStocks(left.string))
      || Number(startsWithFirst(right.key)) - Number(startsWithFirst(left.key))
      || left.name.localeCompare(right.name))
    .slice(0, limit)
    .map(row => ({ id: String(row.string.id), name: row.name, inStock: shopStocks(row.string) }));
}

/** The catalog string the own-string box names, if any: its brand and name, maybe with a gauge after. */
export function matchOwnString(text, catalog = []) {
  const typed = squash(text);
  if (!typed) return undefined;
  return catalog
    .filter(string => {
      const name = squash(ownStringName(string));
      if (typed === name) return true;
      return typed.startsWith(`${name} `) && GAUGE_TAIL.test(typed.slice(name.length + 1));
    })
    .sort((left, right) => ownStringName(right).length - ownStringName(left).length)[0];
}

/** What the box lists: nothing once a pick is made and left alone. */
export const ownStringResults = (item, catalog = []) =>
  searchOwnStrings(item?.own_string_text, catalog)
    .filter(result => !(result.id === String(item?.string_id || '') && result.name === String(item?.own_string_text || '').trim()));

/** The fields to set as the player's string is typed: the text, and the catalog string it names. */
export const typedOwnString = (text, catalog = []) => ({
  own_string_text: text,
  string_id: String(matchOwnString(text, catalog)?.id ?? '')
});

/** The line under the box: whether it's a catalog string, or how it'll be saved. */
export function ownStringHint(item, catalog = []) {
  if (item?.string_id) {
    const string = catalog.find(entry => String(entry.id) === String(item.string_id));
    return `In the catalog${shopStocks(string) ? ', and the shop stocks it' : ''}`;
  }
  return String(item?.own_string_text || '').trim()
    ? 'No catalog match: pick one from the list, or it’s saved as typed'
    : '';
}
