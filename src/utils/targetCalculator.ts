import { Record } from '../types';
import { getCurrentDate, getWeekDateRange, getWeekDay } from './time';

export function calculateWeeklyStats(records: Record[], weekStr: string): {
  totalMinutes: number;
  daysWithData: number;
  remainingDays: number;
  completedDates: Set<string>;
} {
  const weekRange = getWeekDateRange(weekStr);
  const weekRecords = records.filter(r =>
    r.date >= weekRange.start && r.date <= weekRange.end && r.duration !== null
  );

  const totalMinutes = weekRecords.reduce((sum, r) => sum + (r.duration || 0), 0);
  const daysWithData = weekRecords.length;

  const completedDates = new Set(weekRecords.filter(r => r.checkOut).map(r => r.date));

  const today = getCurrentDate();
  let remainingDays = 0;
  for (let i = 0; i < 7; i++) {
    const dateStr = addDays(weekRange.start, i);
    if (dateStr >= today && !completedDates.has(dateStr)) {
      remainingDays++;
    }
  }

  return { totalMinutes, daysWithData, remainingDays, completedDates };
}

export function calculateRequiredCheckOutTime(
  checkInTime: string,
  requiredMinutesToday: number
): string {
  const [inH, inM] = checkInTime.split(':').map(Number);
  const totalOutMinutes = inH * 60 + inM + requiredMinutesToday;
  const outH = Math.floor(totalOutMinutes / 60) % 24;
  const outM = Math.round(totalOutMinutes % 60);
  return `${String(outH).padStart(2, '0')}:${String(outM).padStart(2, '0')}`;
}

export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '0分钟';
  const sign = minutes < 0 ? '-' : '';
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  if (hours === 0) return `${sign}${mins}分钟`;
  if (mins === 0) return `${sign}${hours}小时`;
  return `${sign}${hours}小时${mins}分钟`;
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + n);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export interface DayPlan {
  date: string;
  weekday: string;
  isToday: boolean;
  isFuture: boolean;
  checkIn: string | null;          // 已 checkIn 或预计上班
  suggestedCheckOut: string | null;
  requiredMinutes: number;          // 这一天需要工作多少分钟
}

/**
 * 计算从今天起本周剩余每一天的下班时间建议
 * @param records 历史记录
 * @param weekStr 周标识，如 2026-W23
 * @param targetHours 周目标小时
 * @param plannedCheckIns 用户为未来某些天预设的上班时间 { 'YYYY-MM-DD': '09:30' }
 */
export function calculateRemainingPlan(
  records: Record[],
  weekStr: string,
  targetHours: number,
  plannedCheckIns: Record_PlannedMap = {}
): { plan: DayPlan[]; totalRemainingMinutes: number; perDayMinutes: number; defaultCheckIn: string } {
  const today = getCurrentDate();
  const range = getWeekDateRange(weekStr);
  const targetMinutes = Math.round(targetHours * 60);

  // 已完成（有 duration）那部分时间
  const weekRecords = records.filter(r =>
    r.date >= range.start && r.date <= range.end
  );
  const completedMinutes = weekRecords
    .filter(r => r.duration != null && r.checkOut)
    .reduce((s, r) => s + (r.duration || 0), 0);

  // 收集需要规划的天（今天 + 之后）
  const remainingDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const ds = addDays(range.start, i);
    if (ds < today) continue;
    const rec = weekRecords.find(r => r.date === ds);
    if (rec && rec.checkOut) continue; // 已下班的跳过
    remainingDates.push(ds);
  }

  const remainingMinutes = Math.max(0, targetMinutes - completedMinutes);
  const perDayMinutes = remainingDates.length > 0
    ? Math.round(remainingMinutes / remainingDates.length)
    : 0;

  // 默认上班时间：用最近 7 个工作日 checkIn 平均
  const recent = records
    .filter(r => r.checkIn)
    .slice(0, 7)
    .map(r => {
      const [h, m] = r.checkIn!.split(':').map(Number);
      return h * 60 + m;
    });
  const avgCheckInMin = recent.length > 0
    ? Math.round(recent.reduce((a, b) => a + b, 0) / recent.length)
    : 9 * 60 + 30;
  const defaultCheckIn = `${String(Math.floor(avgCheckInMin / 60)).padStart(2, '0')}:${String(avgCheckInMin % 60).padStart(2, '0')}`;

  const plan: DayPlan[] = remainingDates.map(ds => {
    const rec = weekRecords.find(r => r.date === ds);
    const isToday = ds === today;
    const isFuture = ds > today;

    let checkIn: string | null = null;
    if (rec?.checkIn) {
      checkIn = rec.checkIn;
    } else if (plannedCheckIns[ds]) {
      checkIn = plannedCheckIns[ds];
    } else if (isFuture) {
      checkIn = defaultCheckIn;
    }

    let suggestedCheckOut: string | null = null;
    if (checkIn && perDayMinutes > 0) {
      suggestedCheckOut = calculateRequiredCheckOutTime(checkIn, perDayMinutes);
    }

    return {
      date: ds,
      weekday: getWeekDay(ds),
      isToday,
      isFuture,
      checkIn,
      suggestedCheckOut,
      requiredMinutes: perDayMinutes
    };
  });

  return {
    plan,
    totalRemainingMinutes: remainingMinutes,
    perDayMinutes,
    defaultCheckIn
  };
}

export type Record_PlannedMap = { [date: string]: string };
