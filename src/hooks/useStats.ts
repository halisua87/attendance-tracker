import { Record, Stats } from '../types';
import { getWeekDateRange } from '../utils/time';

export function useStats(
  records: Record[],
  filterType: string,
  selectedWeek?: string,
  selectedMonth?: string,
  customDateRange?: { start: string; end: string }
): Stats {
  const getFilteredRecords = (): Record[] => {
    switch (filterType) {
      case 'week': {
        if (!selectedWeek) return records;
        const range = getWeekDateRange(selectedWeek);
        return records.filter(r => r.date >= range.start && r.date <= range.end);
      }
      case 'month': {
        if (!selectedMonth) return records;
        const [y, m] = selectedMonth.split('-');
        return records.filter(r => r.date.startsWith(`${y}-${m}`));
      }
      case 'custom': {
        if (!customDateRange?.start || !customDateRange?.end) return records;
        return records.filter(r => r.date >= customDateRange.start && r.date <= customDateRange.end);
      }
      default:
        return records;
    }
  };

  const calculateStats = (filteredRecords: Record[]): Stats => {
    const validRecords = filteredRecords.filter(r => r.duration !== null);
    const totalDays = validRecords.length;
    const totalMinutes = validRecords.reduce((sum, r) => sum + (r.duration || 0), 0);
    const averageMinutes = totalDays > 0 ? Math.round(totalMinutes / totalDays) : 0;

    return {
      totalDays,
      totalMinutes,
      averageMinutes
    };
  };

  const filtered = getFilteredRecords();
  return calculateStats(filtered);
}

export function getWeekStats(records: Record[]): Stats {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const weekRecords = records.filter(r => {
    const date = new Date(r.date);
    return date >= startOfWeek && date <= endOfWeek;
  });

  const validRecords = weekRecords.filter(r => r.duration !== null);
  const totalDays = validRecords.length;
  const totalMinutes = validRecords.reduce((sum, r) => sum + (r.duration || 0), 0);
  const averageMinutes = totalDays > 0 ? Math.round(totalMinutes / totalDays) : 0;

  return { totalDays, totalMinutes, averageMinutes };
}

export function getMonthStats(records: Record[]): Stats {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const monthRecords = records.filter(r => r.date.startsWith(`${year}-${month}`));

  const validRecords = monthRecords.filter(r => r.duration !== null);
  const totalDays = validRecords.length;
  const totalMinutes = validRecords.reduce((sum, r) => sum + (r.duration || 0), 0);
  const averageMinutes = totalDays > 0 ? Math.round(totalMinutes / totalDays) : 0;

  return { totalDays, totalMinutes, averageMinutes };
}
