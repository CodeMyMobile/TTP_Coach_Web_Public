import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  ChevronDown,
  Circle,
  CircleDollarSign,
  Clock3,
  Download,
  Landmark,
  Loader2,
  TrendingUp,
  Users
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

const getValue = (payload, keys, fallback = 0) => {
  for (const key of keys) {
    if (payload?.[key] !== undefined && payload?.[key] !== null) {
      return payload[key];
    }
  }
  return fallback;
};

const EarningsSection = ({ stats }) => {
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
        const [dashboardData, transactionData, payoutData] = await Promise.all([
          getCoachEarningsDashboard({ range, transactionsLimit: 4, topStudentsLimit: 4 }),
          getCoachEarningsTransactions({ range, perPage: 4, page: 1 }),
          getCoachEarningsPayouts({ limit: 3 })
        ]);

        if (!mounted) {
          return;
        }

        setDashboard(dashboardData || null);
        setTransactions(
          getCollection(transactionData, ['transactions', 'data']).length > 0
            ? getCollection(transactionData, ['transactions', 'data'])
            : getCollection(dashboardData, ['recent_transactions', 'recentTransactions'])
        );
        setPayouts(
          getCollection(payoutData, ['payouts', 'data']).length > 0
            ? getCollection(payoutData, ['payouts', 'data'])
            : getCollection(dashboardData, ['payout_schedule', 'payoutSchedule'])
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
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `earnings-transactions-${range}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError(err?.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const topStats = useMemo(() => {
    const apiTopStats = dashboard?.top_stats || dashboard?.topStats || {};
    return [
      {
        label: 'Today',
        value: getValue(apiTopStats, ['today_lessons', 'todayLessons'], stats?.todayLessons ?? 0),
        icon: Calendar,
        iconClass: 'bg-blue-100 text-blue-500'
      },
      {
        label: 'Revenue',
        value: `$${getValue(apiTopStats, ['revenue', 'total_revenue', 'weekRevenue'], stats?.weekRevenue ?? 0)}`,
        icon: CircleDollarSign,
        iconClass: 'bg-emerald-100 text-emerald-500'
      },
      {
        label: 'Students',
        value: getValue(apiTopStats, ['students', 'active_students', 'activeStudents'], stats?.activeStudents ?? 0),
        icon: Users,
        iconClass: 'bg-violet-100 text-violet-500'
      },
      {
        label: 'Upcoming',
        value: getValue(apiTopStats, ['upcoming', 'upcoming_lessons', 'upcomingLessons'], stats?.upcomingLessons ?? 0),
        icon: TrendingUp,
        iconClass: 'bg-rose-100 text-rose-500'
      }
    ];
  }, [dashboard, stats]);

  const balances = useMemo(() => {
    const apiBalances = dashboard?.balances || {};
    return [
      {
        label: 'Available Balance',
        value: `$${getValue(apiBalances, ['available', 'available_balance'], 0)}`,
        sub: 'Ready for payout',
        icon: CircleDollarSign,
        accent: 'green'
      },
      {
        label: 'Pending',
        value: `$${getValue(apiBalances, ['pending', 'pending_balance'], 0)}`,
        sub: 'Clearing in 2-3 days',
        icon: Clock3,
        accent: 'default'
      },
      {
        label: 'Next Payout',
        value: `$${getValue(apiBalances, ['next_payout_amount', 'nextPayoutAmount'], 0)}`,
        sub: getValue(apiBalances, ['next_payout_label', 'nextPayoutLabel'], 'Stripe connected account'),
        icon: Landmark,
        accent: 'purple'
      }
    ];
  }, [dashboard]);

  const lessonTypeBreakdown = getCollection(dashboard?.breakdown, ['lesson_type', 'lessonType']);
  const locationBreakdown = getCollection(dashboard?.breakdown, ['location']);
  const topStudents = getCollection(dashboard?.breakdown, ['top_students', 'topStudents']);

  const balanceAccent = {
    green: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/70',
    purple: 'border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100/70',
    default: 'border-slate-200 bg-white'
  };

  return (
    <section className="mt-6 space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 sm:p-4">
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
        {topStats.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 sm:border-0 sm:p-1">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.iconClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{card.label}</p>
                <p className="text-lg font-bold text-slate-800">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="flex items-center gap-2 px-1 text-xs text-slate-500">
        <Circle className="h-3 w-3 fill-emerald-500 text-emerald-500" /> Secure portal · Last synced moments ago
      </p>

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
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
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
              {transactions.slice(0, 4).map((item, index) => {
                const name = getValue(item, ['student_name', 'name', 'title'], `Transaction ${index + 1}`);
                const meta = getValue(item, ['description', 'meta'], 'Earnings transaction');
                const amount = Number(getValue(item, ['amount', 'net_amount', 'value'], 0));
                const initials = name
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase())
                  .join('');

                return (
                  <div key={`${name}-${index}`} className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-none">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-xs font-semibold text-white">
                      {initials || 'TR'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
                      <p className="truncate text-xs text-slate-500">{meta}</p>
                    </div>
                    <p className={`text-sm font-semibold ${amount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {amount < 0 ? '-' : '+'}${Math.abs(amount).toFixed(2)}
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
              {payouts.slice(0, 3).map((item, index) => (
                <div key={`${item?.id || index}`} className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-none">
                  <div className="w-10 text-center">
                    <p className="text-[10px] uppercase text-slate-400">{getValue(item, ['day'], '---')}</p>
                    <p className="text-lg font-bold text-slate-800">{getValue(item, ['date', 'day_of_month'], '--')}</p>
                    <p className="text-[10px] text-slate-500">{getValue(item, ['month'], '')}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{getValue(item, ['title', 'status'], 'Payout')}</p>
                    <p className="text-xs text-slate-500">{getValue(item, ['meta', 'bank'], 'Stripe connected account')}</p>
                  </div>
                  <p className="text-sm font-bold text-emerald-600">
                    ${Number(getValue(item, ['amount', 'value'], 0)).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {[{ title: 'Revenue by Lesson Type', rows: lessonTypeBreakdown }, { title: 'Revenue by Location', rows: locationBreakdown }].map((group) => (
            <div key={group.title} className="rounded-xl border border-slate-200">
              <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">{group.title}</div>
              <div className="space-y-3 px-4 py-3">
                {group.rows.slice(0, 3).map((row, index) => {
                  const label = getValue(row, ['label', 'name', 'type'], `Item ${index + 1}`);
                  const value = Number(getValue(row, ['amount', 'value'], 0));
                  const percent = Number(getValue(row, ['percentage', 'percent'], 0));
                  const color = index === 0 ? 'bg-violet-500' : index === 1 ? 'bg-blue-500' : 'bg-emerald-500';

                  return (
                    <div key={`${label}-${index}`} className="flex items-center gap-2">
                      <p className="w-20 text-xs text-slate-500">{label}</p>
                      <div className="h-5 flex-1 rounded bg-slate-100">
                        <div style={{ width: `${Math.max(Math.min(percent, 100), 0)}%` }} className={`flex h-5 items-center rounded px-2 text-[11px] font-semibold text-white ${color}`}>
                          {percent > 12 ? `${Math.round(percent)}%` : ''}
                        </div>
                      </div>
                      <p className="w-16 text-right text-xs font-semibold text-slate-800">${value.toFixed(0)}</p>
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
                const name = getValue(student, ['name', 'student_name'], `Student ${index + 1}`);
                const lessons = getValue(student, ['lessons', 'lessons_count'], 0);
                const value = Number(getValue(student, ['amount', 'value', 'ltv'], 0));
                const initials = name
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase())
                  .join('');

                return (
                  <div key={`${name}-${index}`} className="flex items-center gap-2 border-b border-slate-100 py-2 last:border-none">
                    <div className={`flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${index === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                      {index + 1}
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-[10px] font-semibold text-white">
                      {initials || 'ST'}
                    </div>
                    <p className="flex-1 truncate text-xs font-medium text-slate-700">{name}</p>
                    <p className="text-[11px] text-slate-400">{lessons}</p>
                    <p className="text-xs font-semibold text-slate-800">${value.toFixed(0)}</p>
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
