import { useState } from 'react';
import { Record } from '../types';
import { getCurrentDate, getWeekDay, formatTime, formatDuration } from '../utils/time';
import { Clock, Sun, Moon, CheckCircle2 } from 'lucide-react';

interface CheckInAreaProps {
  todayRecord: Record | null;
  onCheckIn: (time?: string) => void;
  onCheckOut: (id: string, time?: string) => void;
}

export function CheckInArea({ todayRecord, onCheckIn, onCheckOut }: CheckInAreaProps) {
  const [showManualCheckIn, setShowManualCheckIn] = useState(false);
  const [showManualCheckOut, setShowManualCheckOut] = useState(false);
  const [manualCheckInTime, setManualCheckInTime] = useState('09:00');
  const [manualCheckOutTime, setManualCheckOutTime] = useState('18:00');
  const today = getCurrentDate();

  const handleManualCheckIn = () => {
    onCheckIn(manualCheckInTime);
    setShowManualCheckIn(false);
  };

  const handleManualCheckOut = () => {
    if (todayRecord) {
      onCheckOut(todayRecord.id, manualCheckOutTime);
      setShowManualCheckOut(false);
    }
  };

  const getStatus = () => {
    if (!todayRecord) return { text: '未打卡', color: 'text-gray-500', bg: 'bg-gray-100' };
    if (!todayRecord.checkOut) return { text: '上班已打卡', color: 'text-blue-600', bg: 'bg-blue-100' };
    return { text: '今日已完成', color: 'text-green-600', bg: 'bg-green-100' };
  };

  const status = getStatus();

  return (
    <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300">
      {/* 头部区域 */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">今日打卡</h2>
            <p className="text-gray-500 mt-1">{today} {getWeekDay(today)}</p>
          </div>
        </div>
        <div className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold ${status.color} ${status.bg}`}>
          {todayRecord?.checkOut ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
          <span>{status.text}</span>
        </div>
      </div>

      {/* 时间展示区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* 上班时间卡片 */}
        <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-amber-100 rounded-xl">
              <Sun className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-sm font-semibold text-gray-600">上班时间</span>
          </div>
          <div className="text-center py-4">
            <span className={`text-4xl font-mono font-bold ${todayRecord?.checkIn ? 'text-amber-600' : 'text-gray-300'}`}>
              {formatTime(todayRecord?.checkIn || null)}
            </span>
          </div>
        </div>

        {/* 下班时间卡片 */}
        <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <Moon className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-sm font-semibold text-gray-600">下班时间</span>
          </div>
          <div className="text-center py-4">
            <span className={`text-4xl font-mono font-bold ${todayRecord?.checkOut ? 'text-indigo-600' : 'text-gray-300'}`}>
              {formatTime(todayRecord?.checkOut || null)}
            </span>
          </div>
        </div>
      </div>

      {/* 手动输入区域 */}
      {(showManualCheckIn || showManualCheckOut) && (
        <div className="mb-6 p-6 bg-gray-50 rounded-2xl border border-gray-200">
          {showManualCheckIn && (
            <div className="space-y-4">
              <label className="text-sm font-semibold text-gray-700">请输入上班时间</label>
              <input
                type="time"
                value={manualCheckInTime}
                onChange={(e) => setManualCheckInTime(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base font-medium focus:outline-none focus:ring-4 focus:ring-amber-100 focus:border-amber-500"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleManualCheckIn}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  确认打卡
                </button>
                <button
                  onClick={() => setShowManualCheckIn(false)}
                  className="flex-1 px-5 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200"
                >
                  取消
                </button>
              </div>
            </div>
          )}
          {showManualCheckOut && (
            <div className="space-y-4">
              <label className="text-sm font-semibold text-gray-700">请输入下班时间</label>
              <input
                type="time"
                value={manualCheckOutTime}
                onChange={(e) => setManualCheckOutTime(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base font-medium focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleManualCheckOut}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  确认打卡
                </button>
                <button
                  onClick={() => setShowManualCheckOut(false)}
                  className="flex-1 px-5 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 操作按钮区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 上班打卡按钮 */}
        {!todayRecord?.checkIn ? (
          <div className="flex gap-3">
            <button
              onClick={() => onCheckIn()}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02]"
            >
              上班打卡
            </button>
            <button
              onClick={() => setShowManualCheckIn(true)}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl font-semibold hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02]"
            >
              手动输入
            </button>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center text-gray-500">
            上班已打卡 ✓
          </div>
        )}

        {/* 下班打卡按钮 */}
        {todayRecord?.checkIn && !todayRecord?.checkOut ? (
          <div className="flex gap-3">
            <button
              onClick={() => todayRecord && onCheckOut(todayRecord.id)}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02]"
            >
              下班打卡
            </button>
            <button
              onClick={() => setShowManualCheckOut(true)}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl font-semibold hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02]"
            >
              手动输入
            </button>
          </div>
        ) : todayRecord?.checkOut ? (
          <div className="p-4 bg-green-50 rounded-xl border border-green-200 text-center text-green-600">
            下班已打卡 ✓
          </div>
        ) : (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center text-gray-400">
            请先打卡上班
          </div>
        )}
      </div>

      {/* 工作时长展示 */}
      {todayRecord?.duration !== null && (
        <div className="mt-8 p-8 bg-gradient-to-r from-green-50 via-blue-50 to-purple-50 rounded-2xl border border-green-200">
          <div className="text-center">
            <span className="text-sm font-semibold text-gray-600 mb-3 block">今日工作时长</span>
            <div className="text-5xl font-mono font-bold bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
              ✨ {formatDuration(todayRecord?.duration || 0)} ✨
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
