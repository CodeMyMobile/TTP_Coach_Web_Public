import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Download,
  Landmark,
  Loader2
} from 'lucide-react';
import {
  exportCoachEarningsTransactions,
  getCoachEarningsDashboard,
  getCoachEarningsPayouts,
  getCoachEarningsTransactions
} from '../../../services/coach';

const RANGE_OPTIONS = [
  { value: '7d', label: 'Past 7 days' },
  { value: '30d', label: 'Past 30 days' },
  { value: '90d', label: 'Past 90 days' },
  { value: 'month', label: 'This month' }
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
    minimumFractionDigits: numeric % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  }).format(numeric);
};

const dateParts = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { dow: '---', day: '--', month: '---' };
  }

  return {
    dow: date.toLocaleDateString('en-US', { weekday: 'short' }),
    day: String(date.getDate()),
    month: date.toLocaleDateString('en-US', { month: 'short' })
  };
};

const EarningsSection = () => {
  const [range, setRange] = useState('30d');
  const [dashboard, setDashboard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const [dashboardData, transactionsData, payoutsData] = await Promise.all([
          getCoachEarningsDashboard({ range, transactionsLimit: 4, topStudentsLimit: 4 }),
          getCoachEarningsTransactions({ range, page: 1, perPage: 4 }),
          getCoachEarningsPayouts({ limit: 3 })
        ]);

        if (!mounted) {
          return;
        }

        setDashboard(dashboardData || null);
        setTransactions(
          getCollection(transactionsData, ['transactions']).length > 0
            ? getCollection(transactionsData, ['transactions'])
            : getCollection(dashboardData, ['recent_transactions'])
        );
        setPayouts(
          getCollection(payoutsData, ['payouts']).length > 0
            ? getCollection(payoutsData, ['payouts'])
            : getCollection(dashboardData, ['payout_schedule'])
        );
      } catch (err) {
        if (mounted) {
          setError(err?.message || 'Unable to load earnings data.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [range]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportCoachEarningsTransactions({ range });
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

  const apiBalances = dashboard?.balances || {};
  const nextPayout = apiBalances?.next_payout || null;
  const lessonTypeBreakdown = getCollection(dashboard?.breakdown, ['lesson_type']);
  const locationBreakdown = getCollection(dashboard?.breakdown, ['location']);
  const topStudents = getCollection(dashboard?.breakdown, ['top_students']);

  const balances = [
    {
      label: 'Available Balance',
      value: currency(apiBalances?.available ?? 0),
      sub: 'Ready for payout',
      icon: CircleDollarSign,
      accent: 'green'
    },
    {
      label: 'Pending',
      value: currency(apiBalances?.pending ?? 0),
      sub: 'Clearing in 2-3 days',
      icon: Clock3,
      accent: 'default'
    },
    {
      label: 'Next Payout',
      value: currency(nextPayout?.amount ?? 0),
      sub: nextPayout?.arrival_date
        ? `Arriving ${new Date(nextPayout.arrival_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        })} · ${String(nextPayout.status || '').toUpperCase()}`
        : 'Stripe connected account',
      icon: Landmark,
      accent: 'purple'
    }
  ];

  const balanceAccent = {
    green: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/70',
    purple: 'border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100/70',
    default: 'border-slate-200 bg-white'
  };

  return (
    <section className="mt-6 space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 sm:p-4">
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Earnings Overview</h2>
            <p className="text-sm text-slate-500">Track revenue, payouts, and performance</p>
          </div>
          <div className="flex gap-2">
            <label className="relative">
              <select
                value={range}
                onChange={(event) => setRange(event.target.value)}
                className="appearance-none rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm text-slate-600"
              >
                {RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-slate-500" />
            </label>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading earnings data...
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {balances.map((balance) => {
            const Icon = balance.icon;
            return (
              <div key={balance.label} className={`relative rounded-xl border p-4 ${balanceAccent[balance.accent]}`}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{balance.label}</p>
                <p className="mt-1 text-3xl font-bold text-slate-800">{balance.value}</p>
                <p className="text-xs text-slate-500">{balance.sub}</p>
                <Icon className="absolute right-4 top-4 h-5 w-5 text-slate-400" />
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-5">
          <div className="rounded-xl border border-slate-200 lg:col-span-3">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-800">Recent Transactions</h3>
              <span className="text-sm font-semibold text-violet-600">View all →</span>
            </div>
            <div className="px-4 py-2">
              {transactions.slice(0, 4).map((item) => {
                const name = item?.player_name || 'Player';
                const amount = Number(item?.amount || 0);
                const isRefund = Boolean(item?.is_refund);
                const meta = `${(item?.transaction_type || 'lesson').replace('_', ' ')} · ${new Date(
                  item?.transaction_date_time || item?.created_at
                ).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                const initials = name
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase())
                  .join('');

                return (
                  <div key={item.id} className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-none">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-xs font-semibold text-white">
                      {initials || 'TR'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
                      <p className="truncate text-xs text-slate-500">{meta}</p>
                    </div>
                    <p className={`text-sm font-semibold ${isRefund ? 'text-red-600' : 'text-emerald-600'}`}>
                      {isRefund ? '-' : '+'}{currency(Math.abs(amount))}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-800">Payout Schedule</h3>
              <span className="text-sm font-semibold text-violet-600">View history →</span>
            </div>
            <div className="px-4 py-2">
              {payouts.slice(0, 3).map((item) => {
                const parts = dateParts(item?.arrival_date);
                return (
                  <div key={item.id} className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-none">
                    <div className="w-10 text-center">
                      <p className="text-[10px] uppercase text-slate-400">{parts.dow}</p>
                      <p className="text-lg font-bold text-slate-800">{parts.day}</p>
                      <p className="text-[10px] text-slate-500">{parts.month}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800">{String(item?.status || 'Payout').toUpperCase()}</p>
                      <p className="text-xs text-slate-500">{item?.method || 'standard'} · {item?.type || 'bank_account'}</p>
                    </div>
                    <p className="text-sm font-bold text-emerald-600">{currency(item?.amount || 0)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {[{ title: 'Revenue by Lesson Type', rows: lessonTypeBreakdown, label: 'label' }, { title: 'Revenue by Location', rows: locationBreakdown, label: 'location_name' }].map((group) => (
            <div key={group.title} className="rounded-xl border border-slate-200">
              <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">{group.title}</div>
              <div className="space-y-3 px-4 py-3">
                {group.rows.slice(0, 3).map((row, index) => {
                  const label = row?.[group.label] || `Item ${index + 1}`;
                  const value = Number(row?.amount || 0);
                  const percent = Number(row?.share_pct || 0);
                  const color = index === 0 ? 'bg-violet-500' : index === 1 ? 'bg-blue-500' : 'bg-emerald-500';

                  return (
                    <div key={`${label}-${index}`} className="flex items-center gap-2">
                      <p className="w-24 truncate text-xs text-slate-500">{label}</p>
                      <div className="h-5 flex-1 rounded bg-slate-100">
                        <div style={{ width: `${Math.max(Math.min(percent, 100), 0)}%` }} className={`flex h-5 items-center rounded px-2 text-[11px] font-semibold text-white ${color}`}>
                          {percent > 12 ? `${Math.round(percent)}%` : ''}
                        </div>
                      </div>
                      <p className="w-16 text-right text-xs font-semibold text-slate-800">{currency(value)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-slate-200">
            <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">Top Students (LTV)</div>
            <div className="space-y-2 px-4 py-3">
              {topStudents.slice(0, 4).map((student, index) => {
                const name = student?.full_name || 'Student';
                const lessons = student?.lessons_count ?? 0;
                const value = Number(student?.ltv || 0);
                const initials = name
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase())
                  .join('');

                return (
                  <div key={student.player_id || index} className="flex items-center gap-2 border-b border-slate-100 py-2 last:border-none">
                    <div className={`flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${index === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                      {student?.rank || index + 1}
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-[10px] font-semibold text-white">
                      {initials || 'ST'}
                    </div>
                    <p className="flex-1 truncate text-xs font-medium text-slate-700">{name}</p>
                    <p className="text-[11px] text-slate-400">{lessons}</p>
                    <p className="text-xs font-semibold text-slate-800">{currency(value)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EarningsSection;
