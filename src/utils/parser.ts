import { Record } from '../types';

export function parseImportData(text: string, year: number = new Date().getFullYear()): { records: Omit<Record, 'id'>[]; errors: string[] } {
  const lines = text.trim().split('\n');
  const records: Omit<Record, 'id'>[] = [];
  const errors: string[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const parts = trimmed.split(/[\t\s]+/).filter(Boolean);
    if (parts.length < 2) {
      errors.push(`第${index + 1}行: 数据格式不正确，需要至少日期和上班时间`);
      return;
    }

    const datePart = parts[0];
    const checkIn = parts[1];
    const checkOut = parts[2] || null;

    const dateMatch = datePart.match(/^(\d{1,2})\.(\d{1,2})$/);
    if (!dateMatch) {
      errors.push(`第${index + 1}行: 日期格式不正确，应为如 5.11`);
      return;
    }

    const month = parseInt(dateMatch[1]);
    const day = parseInt(dateMatch[2]);
    const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

    if (!isValidTime(checkIn)) {
      errors.push(`第${index + 1}行: 上班时间格式不正确，应为如 9:38`);
      return;
    }

    let duration: number | null = null;
    if (checkOut && isValidTime(checkOut)) {
      const [inH, inM] = checkIn.split(':').map(Number);
      const [outH, outM] = checkOut.split(':').map(Number);
      duration = (outH * 60 + outM) - (inH * 60 + inM);
    }

    records.push({
      date,
      checkIn,
      checkOut,
      duration
    });
  });

  return { records, errors };
}

function isValidTime(time: string): boolean {
  return /^\d{1,2}:\d{2}$/.test(time);
}
