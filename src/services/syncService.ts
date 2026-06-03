import { Record } from '../types';
import { appInitialized, getFirestoreDB } from '../config/firebase';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

const SETTINGS_KEY = 'attendance_settings';
const SYNC_CODE_KEY = 'attendance_sync_code';

export interface AppSettings {
  weeklyTargetHours: number;
  syncCode: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  weeklyTargetHours: 40,
  syncCode: ''
};

export function getSyncCode(): string {
  return localStorage.getItem(SYNC_CODE_KEY) || '';
}

export function setSyncCode(code: string): void {
  if (code) {
    localStorage.setItem(SYNC_CODE_KEY, code);
  } else {
    localStorage.removeItem(SYNC_CODE_KEY);
  }
}

function sanitizeCode(code: string): string {
  return code.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}

let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPayload: { records: Record[]; settings: AppSettings } | null = null;

export function syncDataToCloud(records: Record[], settings: AppSettings): void {
  pendingPayload = { records, settings };
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(flushSync, 400);
}

async function flushSync() {
  if (!pendingPayload) return;
  const { records, settings } = pendingPayload;
  pendingPayload = null;
  pendingTimer = null;

  const code = sanitizeCode(settings.syncCode || getSyncCode());
  if (!code || !appInitialized) return;
  const db = getFirestoreDB();
  if (!db) return;

  try {
    const ref = doc(db, 'shared', code);
    await setDoc(ref, {
      records,
      settings,
      updatedAt: serverTimestamp(),
      updatedAtMs: Date.now()
    }, { merge: false });
    console.log('[sync] 已上传至云端 sync code=', code);
  } catch (e) {
    console.warn('[sync] 上传失败', e);
  }
}

export async function loadDataFromCloud(): Promise<{ records?: Record[]; settings?: AppSettings; updatedAtMs?: number } | null> {
  const code = sanitizeCode(getSyncCode());
  if (!code || !appInitialized) return null;
  const db = getFirestoreDB();
  if (!db) return null;

  try {
    const ref = doc(db, 'shared', code);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as any;
      return {
        records: data.records || [],
        settings: data.settings,
        updatedAtMs: data.updatedAtMs || 0
      };
    }
  } catch (e) {
    console.warn('[sync] 拉取失败', e);
  }
  return null;
}

export function subscribeCloud(
  onData: (data: { records: Record[]; settings: AppSettings; updatedAtMs: number }) => void
): () => void {
  const code = sanitizeCode(getSyncCode());
  if (!code || !appInitialized) return () => {};
  const db = getFirestoreDB();
  if (!db) return () => {};

  const ref = doc(db, 'shared', code);
  const unsub = onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      const data = snap.data() as any;
      onData({
        records: data.records || [],
        settings: data.settings || DEFAULT_SETTINGS,
        updatedAtMs: data.updatedAtMs || 0
      });
    }
  }, (err) => {
    console.warn('[sync] 订阅出错', err);
  });
  return unsub;
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
