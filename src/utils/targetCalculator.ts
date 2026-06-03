import { Record } from '../types';
import { getCurrentDate, getWeekDateRange, getWeekDay } from './time';

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + n);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** 周内第 i 天（0=周一）是否为工作日 */
function isWorkdayIndex(i: number, workDaysPerWeek: number): boolean {
  return i < workDaysPerWeek;
}

export function calculateWeeklyStats(
  records: Record[],
  weekStr: string,
  workDaysPerWeek: number = 5
): {
  totalMinutes: number;
  daysWithData: number;
  remainingDays: number;
  completedDates: Set<string>;
} {
  const weekRange = getWeekDateRange(weekStr);
  // 仅统计本周工作日的记录（避免周六周日临时打卡污染）
  const workdayDates = new Set<string>();
  for (let i = 0; i < 7; i++) {
    if (isWorkdayIndex(i, workDaysPerWeek)) {
      workdayDates.add(addDays(weekRange.start, i));
    }
  }

  const weekRecords = records.filter(r =>
    workdayDates.has(r.date) && r.duration !== null
  );

  const totalMinutes = weekRecords.reduce((sum, r) => sum + (r.duration || 0), 0);
  const daysWithData = weekRecords.length;
  const completedDates = new Set(weekRecords.filter(r => r.checkOut).map(r => r.date));

  const today = getCurrentDate();
  let remainingDays = 0;
  for (let i = 0; i < 7; i++) {
    if (!isWorkdayIndex(i, workDaysPerWeek)) continue;
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

export interface DayPlan {
  date: string;
  weekday: string;
  isToday: boolean;
  isFuture: boolean;
  isWorkday: boolean;
  checkIn: string | null;
  suggestedCheckOut: string | null;
  requiredMinutes: number;
}

export function calculateRemainingPlan(
  records: Record[],
  weekStr: string,
  targetHours: number,
  plannedCheckIns: Record_PlannedMap = {},
  workDaysPerWeek: number = 5
): { plan: DayPlan[]; totalRemainingMinutes: number; perDayMinutes: number; defaultCheckIn: string } {
  const today = getCurrentDate();
  const range = getWeekDateRange(weekStr);
  const targetMinutes = Math.round(targetHours * 60);

  const workdayDates = new Set<string>();
  for (let i = 0; i < 7; i++) {
    if (isWorkdayIndex(i, workDaysPerWeek)) {
      workdayDates.add(addDays(range.start, i));
    }
  }

  // 仅统计工作日已完成的时间
  const weekRecords = records.filter(r =>
    r.date >= range.start && r.date <= range.end
  );
  const completedMinutes = weekRecords
    .filter(r => r.duration != null && r.checkOut && workdayDates.has(r.date))
    .reduce((s, r) => s + (r.duration || 0), 0);

  // 仅工作日中需要规划的天（今天 + 之后，且未下班）
  const remainingDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    if (!isWorkdayIndex(i, workDaysPerWeek)) continue;
    const ds = addDays(range.start, i);
    if (ds < today) continue;
    const rec = weekRecords.find(r => r.date === ds);
    if (rec && rec.checkOut) continue;
    remainingDates.push(ds);
  }

  const remainingMinutes = Math.max(0, targetMinutes - completedMinutes);
  const perDayMinutes = remainingDates.length > 0
    ? Math.round(remainingMinutes / remainingDates.length)
    : 0;

  // 默认上班时间：最近 7 个工作日 checkIn 平均
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
    if (rec?.checkIn) checkIn = rec.checkIn;
    else if (plannedCheckIns[ds]) checkIn = plannedCheckIns[ds];
    else if (isFuture) checkIn = defaultCheckIn;

    let suggestedCheckOut: string | null = null;
    if (checkIn && perDayMinutes > 0) {
      suggestedCheckOut = calculateRequiredCheckOutTime(checkIn, perDayMinutes);
    }

    return {
      date: ds,
      weekday: getWeekDay(ds),
      isToday,
      isFuture,
      isWorkday: true,
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
