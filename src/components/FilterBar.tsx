import { Filter } from 'lucide-react';
import { getWeekOptions, getMonthOptions } from '../utils/time';

interface FilterBarProps {
  filterType: string;
  selectedWeek: string;
  selectedMonth: string;
  customDateRange: { start: string; end: string };
  onFilterChange: (type: string, value?: any) => void;
}

export function FilterBar({
  filterType,
  selectedWeek,
  selectedMonth,
  customDateRange,
  onFilterChange
}: FilterBarProps) {
  const weekOptions = getWeekOptions();
  const monthOptions = getMonthOptions();

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-gray-700">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Filter className="w-5 h-5 text-blue-600" />
          </div>
          <span className="font-bold text-lg">筛选记录</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: '全部' },
            { key: 'week', label: '按周' },
            { key: 'month', label: '按月' },
            { key: 'custom', label: '自定义' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onFilterChange(key)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                filterType === key
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {filterType === 'week' && (
          <div className="flex items-center gap-3 ml-auto">
            <select
              value={selectedWeek}
              onChange={(e) => onFilterChange('week', e.target.value)}
              className="px-4 py-2.5 border-2 border-gray-200 rounded-xl text-gray-700 font-medium focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
            >
              {weekOptions.map((week) => {
                const [year, weekNum] = week.split('-W');
                return (
                  <option key={week} value={week}>
                    {year}年第{parseInt(weekNum)}周
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {filterType === 'month' && (
          <div className="flex items-center gap-3 ml-auto">
            <select
              value={selectedMonth}
              onChange={(e) => onFilterChange('month', e.target.value)}
              className="px-4 py-2.5 border-2 border-gray-200 rounded-xl text-gray-700 font-medium focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
            >
              {monthOptions.map((month) => {
                const [year, m] = month.split('-');
                return (
                  <option key={month} value={month}>
                    {year}年{parseInt(m)}月
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {filterType === 'custom' && (
          <div className="flex items-center gap-3 ml-auto">
            <input
              type="date"
              value={customDateRange.start}
              onChange={(e) => onFilterChange('custom', { ...customDateRange, start: e.target.value })}
              className="px-4 py-2.5 border-2 border-gray-200 rounded-xl text-gray-700 font-medium focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
            />
            <span className="text-gray-500 font-medium">至</span>
            <input
              type="date"
              value={customDateRange.end}
              onChange={(e) => onFilterChange('custom', { ...customDateRange, end: e.target.value })}
              className="px-4 py-2.5 border-2 border-gray-200 rounded-xl text-gray-700 font-medium focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
            />
          </div>
        )}
      </div>
    </div>
  );
}
