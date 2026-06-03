import { Calendar as CalendarIcon, TrendingUp, CalendarDays } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Stats } from '../types';
import { formatDuration, getWeekDateRange, getMonthOptions, getWeekOptions, formatDate, getWeekDay } from '../utils/time';
import { Record } from '../types';

interface HeaderProps {
  records: Record[];
  filterType: 'week' | 'month' | 'all';
  selectedWeek: string;
  selectedMonth: string;
  onFilterChange: (type: 'week' | 'month', value?: string) => void;
}

const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

function calculateStatsForRange(records: Record[], startDate: string, endDate: string): Stats {
  const filteredRecords = records.filter(r => r.date >= startDate && r.date <= endDate);
  const validRecords = filteredRecords.filter(r => r.duration !== null);
  const totalDays = validRecords.length;
  const totalMinutes = validRecords.reduce((sum, r) => sum + (r.duration || 0), 0);
  const averageMinutes = totalDays > 0 ? Math.round(totalMinutes / totalDays) : 0;

  return { totalDays, totalMinutes, averageMinutes };
}

function getWeekDayIndex(dayName: string): number {
  const index = WEEK_DAYS.indexOf(dayName);
  return index === -1 ? 0 : index;
}

function getChartData(records: Record[], startDate: string, endDate: string, isMonth: boolean) {
  const filteredRecords = records.filter(r => r.date >= startDate && r.date <= endDate && r.duration !== null);
  
  if (isMonth) {
    // 按月显示：显示每个日期
    const data: { name: string; 时长: number; 日期: string }[] = [];
    
    // 按日期排序
    const sortedRecords = [...filteredRecords].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    
    sortedRecords.forEach(record => {
      const day = record.date.split('-')[2]; // 获取日期中的天
      data.push({
        name: `${parseInt(day)}日`,
        时长: record.duration! / 60,
        日期: formatDate(record.date)
      });
    });
    
    return data;
  } else {
    // 按周显示：显示周一到周日
    const sortedRecords = [...filteredRecords].sort((a, b) => {
      return getWeekDayIndex(getWeekDay(a.date)) - getWeekDayIndex(getWeekDay(b.date));
    });
    
    const data: { name: string; 时长: number; 日期: string }[] = [];
    
    WEEK_DAYS.forEach(dayName => {
      const record = sortedRecords.find(r => getWeekDay(r.date) === dayName);
      if (record) {
        data.push({
          name: dayName,
          时长: record.duration! / 60,
          日期: formatDate(record.date)
        });
      }
    });
    
    return data;
  }
}

export function Header({ records, filterType, selectedWeek, selectedMonth, onFilterChange }: HeaderProps) {
  let stats;
  let chartData;
  let title;
  let startDate, endDate;
  let isMonth = false;

  if (filterType === 'week') {
    const range = getWeekDateRange(selectedWeek);
    startDate = range.start;
    endDate = range.end;
    stats = calculateStatsForRange(records, startDate, endDate);
    chartData = getChartData(records, startDate, endDate, false);
    const [year, week] = selectedWeek.split('-W');
    title = `${year}年第${parseInt(week)}周`;
  } else if (filterType === 'month') {
    const [year, month] = selectedMonth.split('-');
    startDate = `${year}-${month}-01`;
    endDate = `${year}-${month}-31`;
    stats = calculateStatsForRange(records, startDate, endDate);
    chartData = getChartData(records, startDate, endDate, true);
    isMonth = true;
    title = `${year}年${parseInt(month)}月`;
  } else {
    const range = getWeekDateRange(selectedWeek);
    startDate = range.start;
    endDate = range.end;
    stats = calculateStatsForRange(records, startDate, endDate);
    chartData = getChartData(records, startDate, endDate, false);
    const [year, week] = selectedWeek.split('-W');
    title = `${year}年第${parseInt(week)}周`;
  }

  const COLORS = [
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6',
    '#10b981', '#22c55e', '#84cc16', '#eab308',
    '#f59e0b', '#f97316', '#ef4444', '#f87171'
  ];

  return (
    <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md">
                <CalendarDays className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">打卡统计</h2>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <CalendarIcon className="w-4 h-4" />
              <span>{title}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 bg-gray-50 p-1 rounded-xl border border-gray-200 shadow-sm w-fit">
          <button
            onClick={() => onFilterChange('week')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
              filterType === 'week' || filterType === 'all'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md transform scale-105'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            按周
          </button>
          <button
            onClick={() => onFilterChange('month')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
              filterType === 'month'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md transform scale-105'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            按月
          </button>
        </div>
      </div>

      <div className="mb-6">
        {filterType === 'week' || filterType === 'all' ? (
          <select
            value={selectedWeek}
            onChange={(e) => onFilterChange('week', e.target.value)}
            className="px-5 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-800 font-medium focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
          >
            {getWeekOptions().map((week) => {
              const [year, weekNum] = week.split('-W');
              return <option key={week} value={week}>{year}年第{parseInt(weekNum)}周</option>;
            })}
          </select>
        ) : (
          <select
            value={selectedMonth}
            onChange={(e) => onFilterChange('month', e.target.value)}
            className="px-5 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-800 font-medium focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
          >
            {getMonthOptions().map((month) => {
              const [year, m] = month.split('-');
              return <option key={month} value={month}>{year}年{parseInt(m)}月</option>;
            })}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-6 border border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">工作天数</span>
          </div>
          <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{stats.totalDays}天</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-white rounded-2xl p-6 border border-green-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <CalendarDays className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">累计时长</span>
          </div>
          <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{formatDuration(stats.totalMinutes)}</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-6 border border-purple-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-3 bg-purple-100 rounded-xl">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">日均时长</span>
          </div>
          <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{formatDuration(stats.averageMinutes)}</div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-200 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg shadow-md">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">{title} 工作时长</h3>
              <p className="text-sm text-gray-500">{isMonth ? '每日工作时间统计' : '每日工作时间统计'}</p>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#6b7280" 
                  style={{ fontSize: '13px' }} 
                  tick={{ fill: '#4b5563' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#6b7280"
                  tick={{ fill: '#4b5563', fontSize: '12px' }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '16px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    padding: '16px'
                  }}
                  labelStyle={{
                    fontWeight: 'bold',
                    color: '#374151',
                    marginBottom: '8px'
                  }}
                  formatter={(value: unknown) => {
                    const num = value as number;
                    return [`${num.toFixed(1)} 小时`, '工作时长'];
                  }}
                />
                <Bar
                  dataKey="时长"
                  radius={[12, 12, 4, 4]}
                  barSize={isMonth ? 28 : 40}
                  animationDuration={1500}
                  animationEasing="ease-out"
                >
                  {chartData.map((_, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
