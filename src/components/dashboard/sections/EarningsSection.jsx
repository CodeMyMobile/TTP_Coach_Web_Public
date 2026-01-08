import React from 'react';
import { ArrowDownRight, ArrowUpRight, Calendar, ChevronDown, Target } from 'lucide-react';

const EarningsSection = ({ stats }) => (
  <section className="mt-6 space-y-6">
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Earnings Overview</h2>
          <p className="text-sm text-gray-500">Track revenue, payouts, and performance</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-nowrap sm:space-x-2 sm:gap-0">
          <button className="flex w-full items-center justify-center space-x-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 sm:w-auto sm:justify-start">
            <Calendar className="h-4 w-4" />
            <span>Past 30 days</span>
            <ChevronDown className="h-4 w-4" />
          </button>
          <button className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 sm:w-auto">
            Export
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-purple-100 bg-purple-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-purple-500">Total Revenue</p>
              <p className="text-2xl font-bold text-purple-900">${stats.weekRevenue}</p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-purple-500" />
          </div>
          <p className="mt-2 text-xs text-purple-700">Up 12% from last period</p>
        </div>
        <div className="rounded-xl border border-green-100 bg-green-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-green-500">Outstanding</p>
              <p className="text-2xl font-bold text-green-900">$280</p>
            </div>
            <ArrowDownRight className="h-5 w-5 text-green-500" />
          </div>
          <p className="mt-2 text-xs text-green-700">2 invoices awaiting payment</p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-blue-500">Average Rate</p>
              <p className="text-2xl font-bold text-blue-900">$112/hr</p>
            </div>
            <Target className="h-5 w-5 text-blue-500" />
          </div>
          <p className="mt-2 text-xs text-blue-700">Across all lesson types</p>
        </div>
      </div>
    </div>
  </section>
);

export default EarningsSection;
