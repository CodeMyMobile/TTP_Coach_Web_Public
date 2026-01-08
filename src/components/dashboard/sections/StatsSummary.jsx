import React from 'react';
import { Calendar, DollarSign, TrendingUp, Users } from 'lucide-react';

const StatsSummary = ({ stats }) => (
  <div className="border-b bg-white">
    <div className="mx-auto max-w-7xl px-4 py-4">
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
  </div>
);

export default StatsSummary;
