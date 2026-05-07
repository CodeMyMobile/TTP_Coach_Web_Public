import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, Users } from 'lucide-react';
import { getCoachPackagePurchases } from '../../api/CoachApi/packages';
import Modal, { ModalBody, ModalFooter, ModalHeader } from './Modal';

const resolvePurchases = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  return payload.purchases || payload.data?.purchases || payload.items || payload.data?.items || [];
};

const resolvePackageSummary = (payload, fallbackPackage) => {
  if (!payload || typeof payload !== 'object') {
    return fallbackPackage;
  }

  return payload.package || payload.data?.package || fallbackPackage;
};

const resolvePagination = (payload, purchases) => {
  const source = payload?.pagination || payload?.meta || payload?.data?.pagination || {};

  const currentPage = Number(source.page ?? payload?.page ?? 1);
  const perPage = Number(source.perPage ?? source.per_page ?? payload?.perPage ?? 10);
  const total = Number(source.total ?? payload?.total ?? purchases.length);

  return {
    page: Number.isFinite(currentPage) && currentPage > 0 ? currentPage : 1,
    perPage: Number.isFinite(perPage) && perPage > 0 ? perPage : 10,
    total: Number.isFinite(total) && total >= 0 ? total : purchases.length
  };
};

const formatDateTime = (value) => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
};

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'succeeded', label: 'Succeeded' },
  { value: 'partially_used', label: 'Partially used' },
  { value: 'exhausted', label: 'Exhausted' }
];

const PackagePurchasesModal = ({ isOpen, onClose, lessonPackage }) => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [includePending, setIncludePending] = useState(false);
  const [page, setPage] = useState(1);
  const [purchases, setPurchases] = useState([]);
  const [packageSummary, setPackageSummary] = useState(lessonPackage);
  const [pagination, setPagination] = useState({ page: 1, perPage: 10, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSearch('');
    setStatus('');
    setIncludePending(false);
    setPage(1);
    setPurchases([]);
    setPackageSummary(lessonPackage);
    setError('');
  }, [isOpen, lessonPackage]);

  useEffect(() => {
    if (!isOpen || !lessonPackage?.id) {
      return;
    }

    let active = true;

    const fetchPurchases = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await getCoachPackagePurchases(lessonPackage.id, {
          search,
          status,
          includePending: includePending ? 'true' : '',
          perPage: 10,
          page
        });

        if (!response) {
          throw new Error('Your session has expired. Please sign in again.');
        }

        if (!response.ok) {
          let message = 'Failed to load package purchases.';

          try {
            const errorBody = await response.json();
            message =
              errorBody?.message ||
              errorBody?.error ||
              errorBody?.errors?.[0] ||
              message;
          } catch {
            // Ignore JSON parse errors.
          }

          throw new Error(message);
        }

        const payload = await response.json().catch(() => null);
        const resolvedPurchases = resolvePurchases(payload);

        if (!active) {
          return;
        }

        setPurchases(Array.isArray(resolvedPurchases) ? resolvedPurchases : []);
        setPackageSummary(resolvePackageSummary(payload, lessonPackage));
        setPagination(resolvePagination(payload, Array.isArray(resolvedPurchases) ? resolvedPurchases : []));
      } catch (requestError) {
        if (!active) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Failed to load package purchases.'
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchPurchases();

    return () => {
      active = false;
    };
  }, [includePending, isOpen, lessonPackage, page, search, status]);

  const totalPages = useMemo(() => {
    if (!pagination.total || !pagination.perPage) {
      return 1;
    }

    return Math.max(1, Math.ceil(pagination.total / pagination.perPage));
  }, [pagination.perPage, pagination.total]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} panelClassName="max-w-4xl">
      <ModalHeader
        title="Package Buyers"
        description={
          packageSummary?.name
            ? `${packageSummary.name} • ${packageSummary.purchaseCount ?? packageSummary.purchase_count ?? 0} purchases`
            : 'View students who bought this package'
        }
        onClose={onClose}
      />
      <ModalBody className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by player name, email, or phone"
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </label>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={includePending}
              onChange={(event) => {
                setIncludePending(event.target.checked);
                setPage(1);
              }}
              className="rounded text-purple-600"
            />
            Include pending
          </label>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 py-8 text-sm text-gray-500">
            <RefreshCw className="h-4 w-4 animate-spin text-purple-600" />
            Loading purchases...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && purchases.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-200 px-6 py-10 text-center text-sm text-gray-500">
            <Users className="mx-auto mb-3 h-5 w-5 text-gray-400" />
            No purchases matched these filters.
          </div>
        )}

        {!loading && !error && purchases.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_120px_120px_160px] gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <span>Player</span>
              <span>Contact</span>
              <span>Status</span>
              <span>Remaining</span>
              <span>Purchased</span>
            </div>
            {purchases.map((purchase, index) => {
              const rowKey = purchase.id ?? purchase.purchase_id ?? `${purchase.player_email}-${index}`;
              const name =
                purchase.player_full_name ||
                purchase.playerName ||
                purchase.full_name ||
                'Player';
              const contact = purchase.player_email || purchase.player_phone || 'N/A';
              const purchaseStatus = purchase.status || purchase.purchase_status || 'unknown';
              const creditsRemaining =
                purchase.credits_remaining ??
                purchase.creditsRemaining ??
                purchase.remaining_credits ??
                'N/A';
              const amountPaid = purchase.amount_paid ?? purchase.amountPaid;

              return (
                <div
                  key={rowKey}
                  className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_120px_120px_160px] gap-3 border-b border-gray-100 px-4 py-4 text-sm last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{name}</p>
                    {amountPaid !== null && amountPaid !== undefined && (
                      <p className="text-xs text-gray-500">Paid ${amountPaid}</p>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-gray-700">{contact}</p>
                    {purchase.player_phone && purchase.player_email && (
                      <p className="truncate text-xs text-gray-500">{purchase.player_phone}</p>
                    )}
                  </div>
                  <div className="text-gray-700">{purchaseStatus}</div>
                  <div className="text-gray-700">{creditsRemaining}</div>
                  <div className="text-gray-700">{formatDateTime(purchase.purchased_at)}</div>
                </div>
              );
            })}
          </div>
        )}
      </ModalBody>
      <ModalFooter className="items-center sm:justify-between">
        <div className="text-xs text-gray-500">
          Page {pagination.page} of {totalPages}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={pagination.page <= 1 || loading}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((current) => current + 1)}
            disabled={pagination.page >= totalPages || loading}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </ModalFooter>
    </Modal>
  );
};

export default PackagePurchasesModal;
