import React from 'react';
import {
  Calendar,
  ChevronDown,
  Circle,
  CircleDollarSign,
  Clock3,
  Download,
  Landmark,
  MapPin,
  TrendingUp,
  Users
} from 'lucide-react';

const balances = [
  {
    label: 'Available Balance',
    value: '$2,840',
    sub: 'Ready for payout',
    icon: CircleDollarSign,
    accent: 'green'
  },
  {
    label: 'Pending',
    value: '$1,440',
    sub: 'Clearing in 2-3 days',
    icon: Clock3,
    accent: 'default'
  },
  {
    label: 'Next Payout',
    value: '$2,840',
    sub: 'Arriving Mar 8 · Chase ****4521',
    icon: Landmark,
    accent: 'purple'
  }
];

const transactions = [
  { initials: 'SM', name: 'Sarah Miller', meta: 'Private Lesson · Today 2:30 PM', amount: '+$85.00' },
  { initials: 'JT', name: 'James Thompson', meta: '5 Lesson Package · Yesterday', amount: '+$382.50' },
  { initials: 'AL', name: 'Alex Lee', meta: 'Group Lesson · Mar 4', amount: '+$45.00' },
  { initials: 'MR', name: 'Mike Rodriguez', meta: 'Refund · Cancelled lesson', amount: '-$85.00', refund: true }
];

const payouts = [
  { day: 'Sat', date: '8', month: 'Mar', title: 'Scheduled Payout', meta: 'Chase ****4521', amount: '$2,840', status: 'Pending' },
  { day: 'Wed', date: '5', month: 'Mar', title: 'Completed', meta: 'Chase ****4521', amount: '$2,180', status: 'Paid' },
  { day: 'Sat', date: '1', month: 'Mar', title: 'Completed', meta: 'Chase ****4521', amount: '$1,920', status: 'Paid' }
];

const bars = [
  {
    title: 'Revenue by Lesson Type',
    rows: [
      { label: 'Private', value: '$2,782', width: '65%', color: 'bg-violet-500', pct: '65%' },
      { label: 'Group', value: '$1,070', width: '25%', color: 'bg-blue-500', pct: '25%' },
      { label: 'Packages', value: '$428', width: '10%', color: 'bg-emerald-500', pct: '' }
    ]
  },
  {
    title: 'Revenue by Location',
    rows: [
      { label: 'Penmar', value: '$2,354', width: '55%', color: 'bg-violet-500', pct: '55%' },
      { label: 'Venice Beach', value: '$1,284', width: '30%', color: 'bg-blue-500', pct: '30%' },
      { label: 'Mar Vista', value: '$642', width: '15%', color: 'bg-emerald-500', pct: '' }
    ]
  }
];

const topStudents = [
  { rank: 1, initials: 'JT', name: 'James Thompson', lessons: 32, value: '$2,720' },
  { rank: 2, initials: 'SM', name: 'Sarah Miller', lessons: 28, value: '$2,380' },
  { rank: 3, initials: 'EW', name: 'Emma Wilson', lessons: 24, value: '$2,040' },
  { rank: 4, initials: 'AL', name: 'Alex Lee', lessons: 18, value: '$1,530' }
];

const topStatCards = (revenueValue) => [
  { label: 'Today', value: '3', icon: Calendar, iconClass: 'bg-blue-100 text-blue-500' },
  { label: 'Revenue', value: `$${revenueValue}`, icon: CircleDollarSign, iconClass: 'bg-emerald-100 text-emerald-500' },
  { label: 'Students', value: '57', icon: Users, iconClass: 'bg-violet-100 text-violet-500' },
  { label: 'Upcoming', value: '21', icon: TrendingUp, iconClass: 'bg-rose-100 text-rose-500' }
];

const balanceAccent = {
  green: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/70',
  purple: 'border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100/70',
  default: 'border-slate-200 bg-white'
};

const EarningsSection = ({ stats }) => {
  const statCards = topStatCards(stats?.weekRevenue || '4,280');

  return (
    <section className="mt-6 space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 sm:p-4">
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
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

      <div className="flex flex-col gap-3 px-1 sm:flex-row sm:flex-wrap">
        {['Calendar', 'Students', 'Earnings', 'Packages', 'Locations', 'Groups'].map((tab) => (
          <button
            key={tab}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
              tab === 'Earnings'
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            {tab}
          </button>
        ))}
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
            <button className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
              <Calendar className="h-4 w-4" /> Past 30 days <ChevronDown className="h-4 w-4" />
            </button>
            <button className="flex items-center gap-1 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white">
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
        </div>

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
              {transactions.map((item) => (
                <div key={item.name} className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-none">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-xs font-semibold text-white">
                    {item.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{item.name}</p>
                    <p className="truncate text-xs text-slate-500">{item.meta}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${item.refund ? 'text-red-600' : 'text-emerald-600'}`}>{item.amount}</p>
                    <p className="text-xs text-slate-400">{item.refund ? 'Refunded' : '✓ Paid'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-800">Payout Schedule</h3>
              <span className="text-sm font-semibold text-violet-600">View history →</span>
            </div>
            <div className="px-4 py-2">
              {payouts.map((item) => (
                <div key={`${item.day}-${item.date}`} className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-none">
                  <div className="w-10 text-center">
                    <p className="text-[10px] uppercase text-slate-400">{item.day}</p>
                    <p className="text-lg font-bold text-slate-800">{item.date}</p>
                    <p className="text-[10px] text-slate-500">{item.month}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.meta}</p>
                  </div>
                  <p className="text-sm font-bold text-emerald-600">{item.amount}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {bars.map((group) => (
            <div key={group.title} className="rounded-xl border border-slate-200">
              <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">{group.title}</div>
              <div className="space-y-3 px-4 py-3">
                {group.rows.map((row) => (
                  <div key={row.label} className="flex items-center gap-2">
                    <p className="w-20 text-xs text-slate-500">{row.label}</p>
                    <div className="h-5 flex-1 rounded bg-slate-100">
                      <div style={{ width: row.width }} className={`flex h-5 items-center rounded px-2 text-[11px] font-semibold text-white ${row.color}`}>
                        {row.pct}
                      </div>
                    </div>
                    <p className="w-16 text-right text-xs font-semibold text-slate-800">{row.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-slate-200">
            <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">Top Students (LTV)</div>
            <div className="space-y-2 px-4 py-3">
              {topStudents.map((student) => (
                <div key={student.name} className="flex items-center gap-2 border-b border-slate-100 py-2 last:border-none">
                  <div className={`flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${student.rank === 1 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                    {student.rank}
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-[10px] font-semibold text-white">
                    {student.initials}
                  </div>
                  <p className="flex-1 truncate text-xs font-medium text-slate-700">{student.name}</p>
                  <p className="text-[11px] text-slate-400">{student.lessons}</p>
                  <p className="text-xs font-semibold text-slate-800">{student.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 lg:hidden">
        <p className="mb-2 text-sm font-semibold text-slate-700">Mobile quick nav</p>
        <div className="flex justify-between text-xs text-slate-500">
          <span>Calendar</span>
          <span>Students</span>
          <span className="font-semibold text-violet-600">Earnings</span>
          <span>Settings</span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
        <div className="flex items-center justify-center gap-2">
          <MapPin className="h-4 w-4" /> Desktop and mobile-friendly earnings layout implemented.
        </div>
      </div>
    </section>
  );
};

export default EarningsSection;
