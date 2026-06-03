export function calculateDuration(checkIn: string, checkOut: string): number {
  const [inH, inM] = checkIn.split(':').map(Number);
  const [outH, outM] = checkOut.split(':').map(Number);
  return (outH * 60 + outM) - (inH * 60 + inM);
}

export function formatDuration(minutes: number): string {
  const hours = (minutes / 60).toFixed(1);
  return `${hours}小时`;
}

export function formatTime(time: string | null): string {
  return time || '--:--';
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
}

export function getWeekDay(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return days[date.getDay()];
}

export function getCurrentDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentWeekString(): string {
  const now = new Date();
  return getWeekStringFromDate(now);
}

// ISO 8601 周计算（周一为一周的开始）
export function getWeekStringFromDate(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function getCurrentMonthString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getWeekDateRange(weekStr: string): { start: string; end: string } {
  const [year, week] = weekStr.split('-W').map(Number);
  // ISO 周一为开始
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay();
  const ISOweekStart = new Date(simple);
  if (dow <= 4) {
    ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
  } else {
    ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
  }
  const end = new Date(ISOweekStart);
  end.setUTCDate(ISOweekStart.getUTCDate() + 6);
  const format = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  return { start: format(ISOweekStart), end: format(end) };
}

export function getWeekOptions(): string[] {
  const options: string[] = [];
  const current = getCurrentWeekString();
  const [yearStr, wStr] = current.split('-W');
  const year = parseInt(yearStr);
  const currentW = parseInt(wStr);
  for (let w = 1; w <= currentW; w++) {
    options.push(`${year}-W${w.toString().padStart(2, '0')}`);
  }
  return options;
}

export function getMonthOptions(): string[] {
  const options: string[] = [];
  const now = new Date();
  const year = now.getFullYear();
  
  for (let m = 1; m <= now.getMonth() + 1; m++) {
    options.push(`${year}-${m.toString().padStart(2, '0')}`);
  }
  return options;
}

// 新增函数：计算某日期属于月份的第几周
export function getMonthWeekNumber(date: Date): { month: number; weekInMonth: number } {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfWeek = firstDay.getDay();
  const weekNumber = Math.ceil((date.getDate() + dayOfWeek) / 7);
  return { month: date.getMonth() + 1, weekInMonth: weekNumber };
}

// 新增函数：格式化周选项为"X月第X周"
export function formatWeekOption(weekStr: string): string {
  const range = getWeekDateRange(weekStr);
  const weekDate = new Date(range.start);
  const { month, weekInMonth } = getMonthWeekNumber(weekDate);
  return `${month}月第${weekInMonth}周`;
}

// 新增函数：格式化月份选项为"X月"
export function formatMonthOption(monthStr: string): string {
  const [, month] = monthStr.split('-');
  return `${parseInt(month)}月`;
}
