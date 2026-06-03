import { useState, useMemo, useEffect } from 'react';
import { Record } from '../types';
import { AppSettings } from '../services/syncService';
import { getCurrentWeekString, getCurrentDate, formatDate } from '../utils/time';
import {
  calculateWeeklyStats,
  calculateRemainingPlan,
  formatMinutes,
  Record_PlannedMap
} from '../utils/targetCalculator';
import { Target, Calendar, Clock, TrendingUp, Sun, Moon, Cloud, CloudOff, RefreshCw } from 'lucide-react';

interface TargetGoalProps {
  records: Record[];
  settings: AppSettings;
  syncStatus?: 'idle' | 'syncing' | 'synced' | 'offline';
  onSettingsChange: (newSettings: AppSettings) => void;
}

const QUICK_TARGETS = [10, 10.5, 11, 11.5, 12, 12.5];
const PLANNED_KEY = 'attendance_planned_checkins';

function loadPlanned(): Record_PlannedMap {
  try {
    return JSON.parse(localStorage.getItem(PLANNED_KEY) || '{}');
  } catch {
    return {};
  }
}
function savePlanned(map: Record_PlannedMap) {
  localStorage.setItem(PLANNED_KEY, JSON.stringify(map));
}

export function TargetGoal({ records, settings, syncStatus = 'idle', onSettingsChange }: TargetGoalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempTarget, setTempTarget] = useState(settings.weeklyTargetHours.toString());
  const [showSync, setShowSync] = useState(false);
  const [tempCode, setTempCode] = useState(settings.syncCode || '');
  const [planned, setPlanned] = useState<Record_PlannedMap>(loadPlanned());
  const currentWeek = getCurrentWeekString();

  useEffect(() => {
    setTempCode(settings.syncCode || '');
  }, [settings.syncCode]);

  const stats = useMemo(() => calculateWeeklyStats(records, currentWeek), [records, currentWeek]);
  const planResult = useMemo(
    () => calculateRemainingPlan(records, currentWeek, settings.weeklyTargetHours, planned),
    [records, currentWeek, settings.weeklyTargetHours, planned]
  );

  const targetMinutes = settings.weeklyTargetHours * 60;
  const progress = Math.min(100, (stats.totalMinutes / targetMinutes) * 100);
  const progressColor = progress >= 100
    ? 'from-green-500 to-emerald-600'
    : progress >= 80
      ? 'from-blue-500 to-indigo-600'
      : 'from-amber-500 to-orange-600';

  const handleSaveTarget = () => {
    const newTarget = parseFloat(tempTarget);
    if (!isNaN(newTarget) && newTarget > 0) {
      onSettingsChange({ ...settings, weeklyTargetHours: newTarget });
      setIsEditing(false);
    }
  };
  const handleQuickTarget = (h: number) => {
    onSettingsChange({ ...settings, weeklyTargetHours: h });
    setTempTarget(h.toString());
  };

  const handleSaveSync = () => {
    const code = tempCode.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    onSettingsChange({ ...settings, syncCode: code });
    setShowSync(false);
  };

  const handlePlannedChange = (date: string, time: string) => {
    const next = { ...planned, [date]: time };
    setPlanned(next);
    savePlanned(next);
  };

  const today = getCurrentDate();

  return (
    <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300">
      {/* 标题 + 同步状态 */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">本周目标</h3>
            <p className="text-sm text-gray-500">设定目标 · 智能规划下班时间</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSync(true)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              settings.syncCode
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="云同步设置"
          >
            {settings.syncCode ? <Cloud className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
            {syncStatus === 'syncing' && <RefreshCw className="w-3 h-3 animate-spin" />}
            <span>{settings.syncCode ? `已连接: ${settings.syncCode}` : '设置云同步'}</span>
          </button>
          {!isEditing ? (
            <button
              onClick={() => {
                setTempTarget(settings.weeklyTargetHours.toString());
                setIsEditing(true);
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-all"
            >
              编辑目标
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min="1"
                value={tempTarget}
                onChange={(e) => setTempTarget(e.target.value)}
                className="w-20 px-3 py-2 border-2 border-gray-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500"
              />
              <span className="text-gray-500 text-sm">小时</span>
              <button
                onClick={handleSaveTarget}
                className="px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg text-sm font-semibold hover:from-purple-600 hover:to-pink-700 transition-all"
              >
                保存
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300 transition-all"
              >
                取消
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 快速选目标 */}
      {isEditing && (
        <div className="mb-4 flex flex-wrap gap-2">
          {QUICK_TARGETS.map(h => (
            <button
              key={h}
              onClick={() => handleQuickTarget(h)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all border-2 ${
                Math.abs(settings.weeklyTargetHours - h) < 0.01
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-purple-400'
              }`}
            >
              {h}h
            </button>
          ))}
        </div>
      )}

      {/* 进度条 */}
      <div className="mb-6">
        <div className="flex items-end justify-between mb-3">
          <span className="text-sm font-semibold text-gray-600">目标进度</span>
          <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${progressColor} transition-all duration-500`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 4 个统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard color="purple" icon={<Target className="w-4 h-4 text-purple-600" />} label="目标" value={`${settings.weeklyTargetHours}h`} />
        <StatCard color="green" icon={<TrendingUp className="w-4 h-4 text-green-600" />} label="已完成" value={`${(stats.totalMinutes / 60).toFixed(1)}h`} />
        <StatCard color="blue" icon={<Calendar className="w-4 h-4 text-blue-600" />} label="剩余天数" value={`${stats.remainingDays}天`} />
        <StatCard color="amber" icon={<Clock className="w-4 h-4 text-amber-600" />} label="日均需求" value={planResult.perDayMinutes > 0 ? formatMinutes(planResult.perDayMinutes) : '-'} />
      </div>

      {/* 剩余每日规划表 */}
      {planResult.plan.length > 0 ? (
        <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/40 via-pink-50/40 to-blue-50/40 overflow-hidden">
          <div className="px-5 py-3 bg-white/60 border-b border-purple-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <span className="font-semibold text-gray-800">本周剩余规划</span>
            </div>
            <span className="text-xs text-gray-500">
              共需 <b className="text-purple-700">{formatMinutes(planResult.totalRemainingMinutes)}</b>
              {' '}· 每天 <b className="text-purple-700">{formatMinutes(planResult.perDayMinutes)}</b>
            </span>
          </div>
          <div className="divide-y divide-white/70">
            {planResult.plan.map((day) => (
              <div
                key={day.date}
                className={`flex flex-col md:flex-row md:items-center gap-3 md:gap-4 px-5 py-4 ${day.isToday ? 'bg-amber-50/60' : ''}`}
              >
                <div className="flex items-center gap-3 md:w-44">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold ${
                    day.isToday ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 border border-gray-200'
                  }`}>
                    {day.weekday.replace('周', '')}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-800">
                      {formatDate(day.date)} {day.isToday && <span className="text-amber-600 ml-1">今天</span>}
                    </div>
                    <div className="text-xs text-gray-500">{day.date}</div>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-xs text-gray-500 shrink-0">上班</span>
                    {day.checkIn && !day.isFuture && records.find(r => r.date === day.date)?.checkIn ? (
                      <span className="font-mono font-bold text-amber-600">{day.checkIn}</span>
                    ) : (
                      <input
                        type="time"
                        value={day.checkIn || ''}
                        onChange={(e) => handlePlannedChange(day.date, e.target.value)}
                        className="px-2 py-1 border border-gray-200 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500 w-full"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span className="text-xs text-gray-500 shrink-0">下班需≥</span>
                    <span className="font-mono font-bold text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {day.suggestedCheckOut || '--:--'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 bg-white/60 border-t border-purple-100 text-xs text-gray-500">
            提示：未来日期的上班时间默认按你最近的平均上班时间估算，可手动调整；下班时间会随之实时更新。
          </div>
        </div>
      ) : (
        <div className="p-6 bg-green-50 rounded-xl border border-green-200 text-center">
          <span className="text-green-700 font-semibold">本周目标已完成 / 无剩余天数 🎉</span>
        </div>
      )}

      {/* 同步码弹窗 */}
      {showSync && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowSync(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <Cloud className="w-6 h-6 text-blue-600" />
              <h4 className="text-lg font-bold text-gray-800">云同步设置</h4>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              输入一个<strong>自定义同步码</strong>（仅你自己知道，建议使用昵称+数字组合）。
              在其他设备上输入相同的同步码即可看到同一份数据。
            </p>
            <input
              type="text"
              value={tempCode}
              onChange={(e) => setTempCode(e.target.value)}
              placeholder="例如：qinjia-2026"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base font-mono focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 mb-2"
              maxLength={64}
            />
            <p className="text-xs text-gray-500 mb-4">
              仅支持字母、数字、下划线、横线，最多 64 位。今日 {today} 设置后将立即同步。
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleSaveSync}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all"
              >
                保存并同步
              </button>
              <button
                onClick={() => setShowSync(false)}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all"
              >
                取消
              </button>
            </div>
            {settings.syncCode && (
              <button
                onClick={() => {
                  onSettingsChange({ ...settings, syncCode: '' });
                  setTempCode('');
                  setShowSync(false);
                }}
                className="w-full mt-3 px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
              >
                断开云同步（仅本地保存）
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ color, icon, label, value }: { color: string; icon: React.ReactNode; label: string; value: string }) {
  const map: { [k: string]: string } = {
    purple: 'from-purple-50 to-pink-50 border-purple-100 text-purple-700',
    green: 'from-green-50 to-emerald-50 border-green-100 text-green-700',
    blue: 'from-blue-50 to-indigo-50 border-blue-100 text-blue-700',
    amber: 'from-amber-50 to-orange-50 border-amber-100 text-amber-700'
  };
  return (
    <div className={`p-4 bg-gradient-to-br rounded-xl border ${map[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-semibold text-gray-600">{label}</span>
      </div>
      <div className={`text-2xl font-bold`}>{value}</div>
    </div>
  );
}
