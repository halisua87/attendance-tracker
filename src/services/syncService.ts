import { Record } from '../types';

/**
 * 基于 jsonblob.com 的免费、无需鉴权的 JSON 存储。
 * - 同步码即 blob 的 UUID。
 * - A 设备首次启用同步 → POST 创建 blob，得到 location header，提取 UUID 作为同步码返回给用户。
 * - B 设备输入同步码 → GET /api/jsonBlob/{id} 即可读到完全一样的数据。
 */

const SETTINGS_KEY = 'attendance_settings';
const SYNC_CODE_KEY = 'attendance_sync_code';
const API_BASE = 'https://jsonblob.com/api/jsonBlob';

export interface AppSettings {
  weeklyTargetHours: number;
  syncCode: string;
  workDaysPerWeek: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  weeklyTargetHours: 40,
  syncCode: '',
  workDaysPerWeek: 5
};

interface CloudPayload {
  records: Record[];
  settings: AppSettings;
  updatedAtMs: number;
}

export function getSyncCode(): string {
  return localStorage.getItem(SYNC_CODE_KEY) || '';
}
export function setSyncCode(code: string): void {
  if (code) localStorage.setItem(SYNC_CODE_KEY, code);
  else localStorage.removeItem(SYNC_CODE_KEY);
}

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

/** 创建一个全新的同步 blob，返回同步码（UUID） */
export async function createSyncBlob(records: Record[], settings: AppSettings): Promise<string | null> {
  try {
    const body: CloudPayload = { records, settings, updatedAtMs: Date.now() };
    const resp = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!resp.ok) {
      console.warn('[sync] create failed', resp.status);
      return null;
    }
    // 优先 Location header
    const loc = resp.headers.get('Location') || resp.headers.get('location') || '';
    const m = loc.match(/jsonBlob\/([0-9a-f-]+)/i);
    if (m) return m[1];
    // 部分浏览器 CORS 拿不到 Location，但有 X-jsonblob-id header
    const xid = resp.headers.get('X-jsonblob-id') || resp.headers.get('x-jsonblob-id');
    if (xid) return xid;
    return null;
  } catch (e) {
    console.warn('[sync] create error', e);
    return null;
  }
}

/** 拉取云端数据 */
export async function loadDataFromCloud(): Promise<CloudPayload | null> {
  const code = getSyncCode();
  if (!code || !isUuid(code)) return null;
  try {
    const resp = await fetch(`${API_BASE}/${code}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return {
      records: Array.isArray(data?.records) ? data.records : [],
      settings: data?.settings ?? DEFAULT_SETTINGS,
      updatedAtMs: data?.updatedAtMs ?? 0
    };
  } catch (e) {
    console.warn('[sync] load error', e);
    return null;
  }
}

let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPayload: CloudPayload | null = null;

/** 上传到云端（debounced 600ms） */
export function syncDataToCloud(records: Record[], settings: AppSettings): void {
  pendingPayload = { records, settings, updatedAtMs: Date.now() };
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(flushSync, 600);
}

async function flushSync() {
  if (!pendingPayload) return;
  const payload = pendingPayload;
  pendingPayload = null;
  pendingTimer = null;

  const code = getSyncCode();
  if (!code || !isUuid(code)) return;

  try {
    const resp = await fetch(`${API_BASE}/${code}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      console.warn('[sync] put failed', resp.status);
    } else {
      console.log('[sync] uploaded code=', code);
    }
  } catch (e) {
    console.warn('[sync] put error', e);
  }
}

/** 简易"订阅"：每 15 秒轮询一次云端，如有更新则回调 */
export function subscribeCloud(
  onData: (data: CloudPayload) => void
): () => void {
  const code = getSyncCode();
  if (!code || !isUuid(code)) return () => {};

  let stopped = false;
  let lastUpdatedMs = 0;

  const poll = async () => {
    if (stopped) return;
    try {
      const data = await loadDataFromCloud();
      if (data && data.updatedAtMs && data.updatedAtMs > lastUpdatedMs) {
        lastUpdatedMs = data.updatedAtMs;
        onData(data);
      }
    } catch {}
  };

  // 立即拉一次 + 之后每 15s 轮询
  poll();
  const id = setInterval(poll, 15000);

  // 页面回到前台时立即拉一次
  const onVis = () => { if (document.visibilityState === 'visible') poll(); };
  document.addEventListener('visibilitychange', onVis);

  return () => {
    stopped = true;
    clearInterval(id);
    document.removeEventListener('visibilitychange', onVis);
  };
}

export function saveSettingsToLocal(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
export function loadSettingsFromLocal(): AppSettings {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    const parsed = data ? JSON.parse(data) : null;
    return {
      ...DEFAULT_SETTINGS,
      ...(parsed || {}),
      syncCode: getSyncCode() || (parsed?.syncCode ?? '')
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
