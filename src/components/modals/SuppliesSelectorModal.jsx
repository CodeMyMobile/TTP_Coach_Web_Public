import React, { useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal';
import { COACH_SUPPLIES_ITEMS, COACH_SUPPLIES_SHOP_ORIGIN } from '../../constants/urls';

const formatPrice = (amount) => `$${amount}`;

// Build a Shopify cart permalink from the selected (qty > 0) variants.
// Form: https://{shop}/cart/add?items[][id]={id}&items[][quantity]={qty}&…&return_to=/checkout
// Verified against the live store (1/2/3 items): builds the cart with the exact
// items and 302s to the store's standard checkout — NOT the cart page, NOT
// shop.app — so Shop Pay stays an accelerated *option* rather than the forced flow.
// (The id/qty pairs are positional, so they're appended in order.)
const buildSuppliesCartPermalink = (rows) => {
  const selected = rows.filter((row) => row.qty > 0 && row.variantId);
  if (selected.length === 0) {
    return null;
  }
  const params = new URLSearchParams();
  selected.forEach((row) => {
    params.append('items[][id]', row.variantId);
    params.append('items[][quantity]', String(row.qty));
  });
  params.append('return_to', '/checkout');
  return `${COACH_SUPPLIES_SHOP_ORIGIN}/cart/add?${params.toString()}`;
};

const SuppliesSelectorModal = ({ isOpen, onClose }) => {
  const [quantities, setQuantities] = useState({});

  const rows = useMemo(
    () => COACH_SUPPLIES_ITEMS.map((item) => ({ ...item, qty: quantities[item.key] || 0 })),
    [quantities]
  );
  const total = rows.reduce((sum, row) => sum + row.qty * row.price, 0);
  const hasSelection = rows.some((row) => row.qty > 0);

  const setQty = (key, next) =>
    setQuantities((prev) => ({ ...prev, [key]: Math.max(0, next) }));

  const handleCheckout = () => {
    const permalink = buildSuppliesCartPermalink(rows);
    if (!permalink) {
      return;
    }
    window.open(permalink, '_blank', 'noopener,noreferrer');
    onClose?.();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} placement="bottom" panelClassName="sm:max-w-md">
      <ModalHeader
        title="Coach supplies"
        description="Order gear for your sessions"
        onClose={onClose}
      />
      <ModalBody className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{row.name}</p>
              <p className="text-xs text-gray-500">{formatPrice(row.price)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQty(row.key, row.qty - 1)}
                disabled={row.qty === 0}
                aria-label={`Decrease ${row.name}`}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-6 text-center text-sm font-semibold text-gray-900">{row.qty}</span>
              <button
                type="button"
                onClick={() => setQty(row.key, row.qty + 1)}
                aria-label={`Increase ${row.name}`}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-purple-200 text-purple-700 transition hover:bg-purple-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between pt-1 text-sm font-semibold text-gray-900">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      </ModalBody>
      <ModalFooter>
        <button
          type="button"
          onClick={handleCheckout}
          disabled={!hasSelection}
          className="w-full rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          Checkout
        </button>
      </ModalFooter>
    </Modal>
  );
};

export default SuppliesSelectorModal;
