/**
 * 云同步服务 —— 基于 Firebase Firestore REST API
 *
 * 路径：shared/{syncCode}  （由 Firestore 安全规则限制 4-64 位长度）
 * 优点：无需 Firebase SDK（包体小）、无需登录、跨设备共享同一份数据
 */
import { Record } from '../types';

const FIREBASE_API_KEY = 'AIzaSyAuAuIQ-P9Uvm5ermKXJe6mUYassDzsSi4Mk';
const FIREBASE_PROJECT = 'work-2f17c';
const BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;

const SYNC_CODE_KEY = 'attendance_sync_code';
const SETTINGS_KEY = 'attendance_settings';

export interface AppSettings {
  weeklyTargetHours: number;
  syncCode: string;
  workDaysPerWeek: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  weeklyTargetHours: 40,
  syncCode: '',
  workDaysPerWeek: 5,
};

/* ---------- 本地缓存 ---------- */
export function loadSettingsFromLocal(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      const code = localStorage.getItem(SYNC_CODE_KEY) || '';
      return { ...DEFAULT_SETTINGS, syncCode: code };
    }
    const obj = JSON.parse(raw);
    return {
      weeklyTargetHours: typeof obj.weeklyTargetHours === 'number' ? obj.weeklyTargetHours : 40,
      syncCode: typeof obj.syncCode === 'string' ? obj.syncCode : localStorage.getItem(SYNC_CODE_KEY) || '',
      workDaysPerWeek: typeof obj.workDaysPerWeek === 'number' ? obj.workDaysPerWeek : 5,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettingsToLocal(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  if (settings.syncCode) {
    localStorage.setItem(SYNC_CODE_KEY, settings.syncCode);
  } else {
    localStorage.removeItem(SYNC_CODE_KEY);
  }
}

export function getSyncCode(): string {
  return localStorage.getItem(SYNC_CODE_KEY) || '';
}

export function setSyncCode(code: string) {
  if (code) localStorage.setItem(SYNC_CODE_KEY, code);
  else localStorage.removeItem(SYNC_CODE_KEY);
}

/* ---------- 同步码格式校验（与 Firestore 规则一致） ---------- */
export function normalizeSyncCode(input: string): string {
  return input.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}
export function isValidSyncCode(code: string): boolean {
  return /^[a-zA-Z0-9_-]{4,64}$/.test(code);
}

/* ---------- Firestore JSON <-> 业务对象 ---------- */
function toFsValue(v: any): any {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return { integerValue: String(v) };
    return { doubleValue: v };
  }
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) {
    return { arrayValue: { values: v.map(toFsValue) } };
  }
  if (typeof v === 'object') {
    const fields: Record_ = {};
    Object.keys(v).forEach((k) => { fields[k] = toFsValue(v[k]); });
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}
type Record_ = { [k: string]: any };

function fromFsValue(v: any): any {
  if (!v) return null;
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return parseInt(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('stringValue' in v) return v.stringValue;
  if ('arrayValue' in v) {
    return (v.arrayValue.values || []).map(fromFsValue);
  }
  if ('mapValue' in v) {
    const o: Record_ = {};
    const fs = v.mapValue.fields || {};
    Object.keys(fs).forEach((k) => { o[k] = fromFsValue(fs[k]); });
    return o;
  }
  return null;
}

function packPayload(records: Record[], settings: AppSettings, updatedAtMs: number) {
  // 整个 records 数组 JSON.stringify 存为单个字符串字段，简单可靠
  // Firestore 单字段最大 1MB，足够
  return {
    fields: {
      recordsJson: { stringValue: JSON.stringify(records) },
      weeklyTargetHours: toFsValue(settings.weeklyTargetHours),
      workDaysPerWeek: toFsValue(settings.workDaysPerWeek ?? 5),
      updatedAtMs: { integerValue: String(updatedAtMs) },
    },
  };
}

function unpackPayload(doc: any): { records: Record[]; settings: Partial<AppSettings>; updatedAtMs: number } | null {
  if (!doc || !doc.fields) return null;
  const f = doc.fields;
  let records: Record[] = [];
  try {
    const raw = f.recordsJson?.stringValue || '[]';
    records = JSON.parse(raw);
  } catch {
    records = [];
  }
  return {
    records,
    settings: {
      weeklyTargetHours: f.weeklyTargetHours ? fromFsValue(f.weeklyTargetHours) : undefined,
      workDaysPerWeek: f.workDaysPerWeek ? fromFsValue(f.workDaysPerWeek) : undefined,
    },
    updatedAtMs: f.updatedAtMs ? parseInt(f.updatedAtMs.integerValue) : 0,
  };
}

/* ---------- 网络操作 ---------- */
export async function loadDataFromCloud(): Promise<{ records: Record[]; settings: Partial<AppSettings>; updatedAtMs: number } | null> {
  const code = getSyncCode();
  if (!code || !isValidSyncCode(code)) return null;
  try {
    const url = `${BASE}/shared/${encodeURIComponent(code)}?key=${FIREBASE_API_KEY}`;
    const resp = await fetch(url, { method: 'GET' });
    if (resp.status === 404) {
      // 文档不存在 = 这个 syncCode 还没有任何数据
      return { records: [], settings: {}, updatedAtMs: 0 };
    }
    if (!resp.ok) {
      console.warn('[sync] loadDataFromCloud failed', resp.status);
      return null;
    }
    const doc = await resp.json();
    return unpackPayload(doc);
  } catch (e) {
    console.warn('[sync] loadDataFromCloud error', e);
    return null;
  }
}

let writeTimer: any = null;
let pendingWrite: { records: Record[]; settings: AppSettings } | null = null;

async function doWrite() {
  if (!pendingWrite) return;
  const { records, settings } = pendingWrite;
  pendingWrite = null;
  const code = settings.syncCode || getSyncCode();
  if (!code || !isValidSyncCode(code)) return;
  try {
    const url = `${BASE}/shared/${encodeURIComponent(code)}?key=${FIREBASE_API_KEY}`;
    const body = packPayload(records, settings, Date.now());
    const resp = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.warn('[sync] write failed', resp.status, t);
    }
  } catch (e) {
    console.warn('[sync] write error', e);
  }
}

export function syncDataToCloud(records: Record[], settings: AppSettings) {
  pendingWrite = { records, settings };
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(doWrite, 600);
}

/**
 * 主设备首次启用同步 —— 用用户提供的 syncCode 创建文档，并把当前本地数据上传
 */
export async function enableSyncWithCode(
  code: string,
  records: Record[],
  settings: AppSettings
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isValidSyncCode(code)) {
    return { ok: false, reason: '同步码格式无效（4-64 位字母/数字/下划线/横线）' };
  }
  try {
    const url = `${BASE}/shared/${encodeURIComponent(code)}?key=${FIREBASE_API_KEY}`;
    const body = packPayload(records, { ...settings, syncCode: code }, Date.now());
    const resp = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const t = await resp.text();
      return { ok: false, reason: `服务器返回 ${resp.status}: ${t.slice(0, 100)}` };
    }
    setSyncCode(code);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: '网络错误: ' + (e?.message || String(e)) };
  }
}

/**
 * 订阅云端：定时轮询（15s）+ visibilitychange 立刻拉
 */
export function subscribeCloud(onData: (data: { records: Record[]; settings: Partial<AppSettings>; updatedAtMs: number }) => void): () => void {
  let stopped = false;
  let lastUpdatedAt = 0;

  const tick = async () => {
    if (stopped) return;
    const d = await loadDataFromCloud();
    if (d && d.updatedAtMs > lastUpdatedAt) {
      lastUpdatedAt = d.updatedAtMs;
      onData(d);
    }
  };

  tick(); // 立刻拉一次
  const id = setInterval(tick, 15000);
  const onVis = () => { if (document.visibilityState === 'visible') tick(); };
  document.addEventListener('visibilitychange', onVis);

  return () => {
    stopped = true;
    clearInterval(id);
    document.removeEventListener('visibilitychange', onVis);
  };
}
