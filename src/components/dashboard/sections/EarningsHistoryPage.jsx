import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Download, Loader2, Search } from 'lucide-react';
import {
  exportCoachEarningsTransactions,
  getCoachEarningsPayouts,
  getCoachEarningsTransactions
} from '../../../services/coach';

const RANGE_OPTIONS = [
  { value: '7d', label: 'Past 7 days' },
  { value: '30d', label: 'Past 30 days' },
  { value: '90d', label: 'Past 90 days' },
  { value: 'month', label: 'This month' }
];

const TRANSACTION_TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'private', label: 'Private' },
  { value: 'semi_private', label: 'Semi-private' },
  { value: 'group', label: 'Group' },
  { value: 'package', label: 'Package' },
  { value: 'refund', label: 'Refund' }
];

const TRANSACTION_STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' }
];

const PAYOUT_STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' }
];

const getCollection = (payload, keys) => {
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) {
      return payload[key];
    }
  }
  return [];
};

const currency = (value) => {
  const numeric = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numeric);
};

const statusClass = (status = '') => {
  const normalized = String(status).toLowerCase();
  if (normalized === 'paid') return 'bg-emerald-100 text-emerald-700';
  if (normalized === 'pending') return 'bg-amber-100 text-amber-700';
  if (normalized === 'failed') return 'bg-red-100 text-red-700';
  if (normalized === 'refunded') return 'bg-slate-100 text-slate-600';
  return 'bg-slate-100 text-slate-600';
};

const typeClass = (type = '') => {
  const normalized = String(type).toLowerCase();
  if (normalized.includes('private')) return 'bg-violet-100 text-violet-700';
  if (normalized.includes('group')) return 'bg-blue-100 text-blue-700';
  if (normalized.includes('package')) return 'bg-emerald-100 text-emerald-700';
  if (normalized.includes('refund')) return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-700';
};

const EarningsHistoryPage = ({ mode = 'transactions', onBack }) => {
  const isTransactions = mode === 'transactions';
  const [range, setRange] = useState(isTransactions ? '30d' : '90d');
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, showing_from: 0, showing_to: 0, total_pages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [range, status, type, mode]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        if (isTransactions) {
          const data = await getCoachEarningsTransactions({ range, page, perPage, search: search || undefined, type, status });
          if (!mounted) return;
          setItems(getCollection(data, ['transactions']));
          setSummary(data?.summary || null);
          setPagination({
            total: Number(data?.total ?? data?.pagination?.total ?? 0),
            total_pages: Number(data?.total_pages ?? data?.pagination?.total_pages ?? 1),
            showing_from: Number(data?.showing_from ?? data?.pagination?.showing_from ?? 0),
            showing_to: Number(data?.showing_to ?? data?.pagination?.showing_to ?? 0)
          });
        } else {
          const data = await getCoachEarningsPayouts({ range, page, perPage, search: search || undefined, status });
          if (!mounted) return;
          setItems(getCollection(data, ['payouts']));
          setSummary(data?.summary || null);
          setPagination({
            total: Number(data?.total ?? data?.pagination?.total ?? 0),
            total_pages: Number(data?.total_pages ?? data?.pagination?.total_pages ?? 1),
            showing_from: Number(data?.showing_from ?? data?.pagination?.showing_from ?? 0),
            showing_to: Number(data?.showing_to ?? data?.pagination?.showing_to ?? 0)
          });
        }
      } catch (err) {
        if (mounted) setError(err?.message || 'Unable to load history.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [isTransactions, page, perPage, range, search, status, type]);

  const title = isTransactions ? 'Transaction History' : 'Payout History';
  const subtitle = isTransactions ? 'All payments and refunds' : 'All bank transfers';

  const summaryItems = useMemo(() => {
    if (isTransactions) {
      return [
        { label: 'Total Revenue', value: currency(summary?.total_revenue ?? summary?.revenue ?? 0), accent: 'text-emerald-600' },
        { label: 'Transactions', value: String(summary?.transaction_count ?? summary?.count ?? 0) },
        { label: 'Refunds', value: currency(summary?.refunds ?? 0), accent: 'text-red-600' },
        { label: 'Net', value: currency(summary?.net ?? 0) }
      ];
    }

    return [
      { label: 'Total Paid Out', value: currency(summary?.total_paid_out ?? summary?.total_paid ?? 0), accent: 'text-emerald-600' },
      { label: 'Payouts', value: String(summary?.payout_count ?? summary?.count ?? 0) },
      { label: 'Pending', value: currency(summary?.pending ?? 0) },
      { label: 'Avg. Payout', value: currency(summary?.avg_payout ?? 0) }
    ];
  }, [isTransactions, summary]);

  const handleExportTransactions = async () => {
    if (!isTransactions) return;
    setExporting(true);
    try {
      const blob = await exportCoachEarningsTransactions({ range, search: search || undefined, type, status });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `earnings-transactions-${range}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="mx-auto mt-6 max-w-6xl rounded-2xl border border-emerald-100 bg-emerald-50 p-3 sm:p-4">
      {error ? <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">←</button>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{title}</h2>
              <p className="text-sm text-slate-500">{subtitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="relative">
              <select value={range} onChange={(e) => setRange(e.target.value)} className="appearance-none rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm text-slate-600">
                {RANGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-slate-500" />
            </label>
            {isTransactions ? (
              <label className="relative">
                <select value={type} onChange={(e) => setType(e.target.value)} className="appearance-none rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm text-slate-600">
                  {TRANSACTION_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-slate-500" />
              </label>
            ) : null}
            <label className="relative">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="appearance-none rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm text-slate-600">
                {(isTransactions ? TRANSACTION_STATUS_OPTIONS : PAYOUT_STATUS_OPTIONS).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-slate-500" />
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500">
              <Search className="h-4 w-4" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={isTransactions ? 'Search student...' : 'Search bank/account...'} className="w-40 border-none p-0 text-sm outline-none" />
            </div>
            {isTransactions ? (
              <button onClick={handleExportTransactions} disabled={exporting} className="flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-200 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
          {summaryItems.map((item) => (
            <div key={item.label}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className={`text-2xl font-bold text-slate-800 ${item.accent || ''}`}>{item.value}</p>
            </div>
          ))}
        </div>

        <div className="hidden md:block">
          <div className={`grid bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${isTransactions ? 'grid-cols-[1.4fr_0.9fr_0.9fr_0.8fr_0.6fr]' : 'grid-cols-[0.7fr_1.4fr_0.9fr_0.8fr_0.6fr]'}`}>
            {isTransactions ? <><span>Student</span><span>Type</span><span>Date</span><span>Amount</span><span>Status</span></> : <><span>Date</span><span>Bank Account</span><span>Transactions</span><span>Amount</span><span>Status</span></>}
          </div>
          {items.map((item, index) => (
            <div key={item?.id || index} className={`grid items-center border-t border-slate-100 px-4 py-3 text-sm ${isTransactions ? 'grid-cols-[1.4fr_0.9fr_0.9fr_0.8fr_0.6fr]' : 'grid-cols-[0.7fr_1.4fr_0.9fr_0.8fr_0.6fr]'}`}>
              {isTransactions ? (
                <>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">{item?.player_name || item?.student_name || item?.student?.name || 'Student'}</p>
                    <p className="truncate text-xs text-slate-500">{item?.player_email || item?.student?.email || '-'}</p>
                  </div>
                  <span><span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${typeClass(item?.transaction_type || item?.type)}`}>{String(item?.transaction_type || item?.type || 'lesson').replaceAll('_', ' ')}</span></span>
                  <span className="text-slate-600">{new Date(item?.transaction_date_time || item?.date || item?.created_at || item?.arrival_date).toLocaleDateString()}</span>
                  <span className={`font-semibold ${Number(item?.amount || 0) < 0 || item?.is_refund ? 'text-red-600' : 'text-emerald-600'}`}>{currency(item?.amount || 0)}</span>
                  <span><span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${statusClass(item?.status)}`}>{item?.status || '-'}</span></span>
                </>
              ) : (
                <>
                  <span className="text-slate-600">{new Date(item?.arrival_date || item?.date).toLocaleDateString()}</span>
                  <span className="font-semibold text-slate-800">{item?.bank_name || item?.bank?.name || 'Bank'} {item?.account_mask || item?.bank_account_mask || item?.bank?.account_mask || ''}</span>
                  <span className="text-slate-600">{item?.transaction_count || 0} transactions</span>
                  <span className="font-semibold text-emerald-600">{currency(item?.amount || 0)}</span>
                  <span><span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${statusClass(item?.status)}`}>{item?.status || '-'}</span></span>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-2 p-3 md:hidden">
          {items.map((item, index) => (
            <div key={item?.id || index} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-800">{isTransactions ? (item?.player_name || item?.student_name || 'Student') : (item?.bank_name || 'Bank Transfer')}</p>
              <p className="text-xs text-slate-500">{new Date(item?.transaction_date_time || item?.arrival_date || item?.date || item?.created_at).toLocaleString()}</p>
              <div className="mt-2 flex items-center justify-between">
                <p className={`text-sm font-bold ${Number(item?.amount || 0) < 0 || item?.is_refund ? 'text-red-600' : 'text-emerald-600'}`}>{currency(item?.amount || 0)}</p>
                <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${statusClass(item?.status)}`}>{item?.status || '-'}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          <p>Showing {pagination.showing_from}-{pagination.showing_to} of {pagination.total}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1 || loading} className="rounded border border-slate-200 bg-white px-2 py-1 disabled:opacity-50">← Prev</button>
            <span>{page}/{Math.max(pagination.total_pages, 1)}</span>
            <button onClick={() => setPage((prev) => Math.min(pagination.total_pages || 1, prev + 1))} disabled={page >= (pagination.total_pages || 1) || loading} className="rounded border border-slate-200 bg-white px-2 py-1 disabled:opacity-50">Next →</button>
          </div>
        </div>
      </div>
      {loading ? <div className="flex items-center gap-2 px-3 py-4 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading history...</div> : null}
    </section>
  );
};

export default EarningsHistoryPage;
