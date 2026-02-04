import React from 'react';
import { Calendar, DollarSign, TrendingUp, Users } from 'lucide-react';

const StatsSummary = ({ stats }) => (
  <div className="border-b bg-white stats-summary">
    <div className="mx-auto max-w-7xl px-4 py-4 stats-summary-desktop">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        <div className="flex items-center rounded-lg bg-gray-50 p-3">
          <div className="rounded-lg bg-blue-50 p-2">
            <Calendar className="h-4 w-4 text-blue-600 md:h-5 md:w-5" />
          </div>
          <div className="ml-3">
            <p className="text-xs text-gray-500">Today</p>
            <p className="text-base font-semibold text-gray-900 md:text-lg">{stats.todayLessons}</p>
          </div>
        </div>
        <div className="flex items-center rounded-lg bg-gray-50 p-3">
          <div className="rounded-lg bg-green-50 p-2">
            <DollarSign className="h-4 w-4 text-green-600 md:h-5 md:w-5" />
          </div>
          <div className="ml-3">
            <p className="text-xs text-gray-500">Revenue</p>
            <p className="text-base font-semibold text-gray-900 md:text-lg">${stats.weekRevenue}</p>
          </div>
        </div>
        <div className="flex items-center rounded-lg bg-gray-50 p-3">
          <div className="rounded-lg bg-purple-50 p-2">
            <Users className="h-4 w-4 text-purple-600 md:h-5 md:w-5" />
          </div>
          <div className="ml-3">
            <p className="text-xs text-gray-500">Students</p>
            <p className="text-base font-semibold text-gray-900 md:text-lg">{stats.activeStudents}</p>
          </div>
        </div>
        <div className="flex items-center rounded-lg bg-gray-50 p-3">
          <div className="rounded-lg bg-orange-50 p-2">
            <TrendingUp className="h-4 w-4 text-orange-600 md:h-5 md:w-5" />
          </div>
          <div className="ml-3">
            <p className="text-xs text-gray-500">Upcoming</p>
            <p className="text-base font-semibold text-gray-900 md:text-lg">{stats.upcomingLessons}</p>
          </div>
        </div>
      </div>
    </div>
    <div className="stats-summary-mobile">
      <div className="stats-summary-mobile-row">
        <div className="stats-summary-mobile-item">
          <span className="stats-summary-mobile-value">{stats.todayLessons}</span>
          <span className="stats-summary-mobile-label">Today</span>
        </div>
        <div className="stats-summary-mobile-divider" />
        <div className="stats-summary-mobile-item">
          <span className="stats-summary-mobile-value">${stats.weekRevenue}</span>
          <span className="stats-summary-mobile-label">This Week</span>
        </div>
        <div className="stats-summary-mobile-divider" />
        <div className="stats-summary-mobile-item">
          <span className="stats-summary-mobile-value">{stats.activeStudents}</span>
          <span className="stats-summary-mobile-label">Students</span>
        </div>
        <div className="stats-summary-mobile-divider" />
        <div className="stats-summary-mobile-item">
          <span className="stats-summary-mobile-value">{stats.upcomingLessons}</span>
          <span className="stats-summary-mobile-label">Upcoming</span>
        </div>
      </div>
    </div>
  </div>
);

export default StatsSummary;
