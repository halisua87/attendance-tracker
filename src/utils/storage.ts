const STORAGE_KEY = 'attendance_records';

export function getRecords(): import('../types').Record[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveRecords(records: import('../types').Record[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
