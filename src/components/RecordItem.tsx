import { Record } from '../types';
import { Sun, Moon, Clock, Edit2, Trash2 } from 'lucide-react';
import { formatDate, getWeekDay, formatTime, formatDuration } from '../utils/time';

interface RecordItemProps {
  record: Record;
  onDelete: (id: string) => void;
  onEdit: (record: Record) => void;
}

export function RecordItem({ record, onDelete, onEdit }: RecordItemProps) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
              <div className="text-2xl">📅</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-800">{formatDate(record.date)}</div>
              <div className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-600 inline-block mt-1">
                {getWeekDay(record.date)}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={() => onEdit(record)}
            className="p-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:scale-110"
            title="编辑"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => onDelete(record.id)}
            className="p-3 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 hover:scale-110"
            title="删除"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 第一行：上下班时间 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-3 p-5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
          <div className="p-3 bg-amber-100 rounded-xl">
            <Sun className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-gray-500 mb-1">上班时间</span>
            <span className="font-mono text-xl font-bold text-gray-800">{formatTime(record.checkIn)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 p-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
          <div className="p-3 bg-indigo-100 rounded-xl">
            <Moon className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-gray-500 mb-1">下班时间</span>
            <span className="font-mono text-xl font-bold text-gray-800">{formatTime(record.checkOut)}</span>
          </div>
        </div>
      </div>

      {/* 第二行：工作时长 */}
      <div className="flex items-center gap-3 p-5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
        <div className="p-3 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl">
          <Clock className="w-6 h-6 text-blue-600" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-gray-500 mb-1">工作时长</span>
          <span className="font-mono text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {record.duration !== null ? formatDuration(record.duration) : '--'}
          </span>
        </div>
      </div>
    </div>
  );
}
