export interface Record {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  duration: number | null;
}

export interface AppState {
  records: Record[];
  filterType: 'week' | 'month' | 'custom' | 'all';
  customDateRange: {
    start: string;
    end: string;
  };
  selectedWeek: string;
  selectedMonth: string;
}

export interface Stats {
  totalDays: number;
  totalMinutes: number;
  averageMinutes: number;
}

export interface VoiceParseResult {
  type: 'checkIn' | 'checkOut';
  time: string;
  success: boolean;
  message: string;
}
