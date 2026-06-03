import { useState, useCallback, useEffect, useRef } from 'react';
import { Record } from '../types';
import { getRecords, saveRecords, generateId } from '../utils/storage';
import { getCurrentDate, calculateDuration } from '../utils/time';
import {
  AppSettings,
  loadSettingsFromLocal,
  saveSettingsToLocal,
  syncDataToCloud,
  loadDataFromCloud,
  subscribeCloud,
  setSyncCode,
  getSyncCode,
  enableSyncWithCode,
  isValidSyncCode
} from '../services/syncService';

const INITIAL_DATA = `5.11	9:38	21:07
5.12	10:14	21:20
5.13	10:10	21:34
5.14	10:07	21:34
5.15	10:20	20:15
5.18	9:38	21:19
5.19	9:30	21:13
5.20	9:12	20:20
5.21	9:56	21:08
5.22	10:00	20:00
5.25	10:26	21:12
5.26	10:11	21:26
5.27	9:44	21:25
5.28	10:10`;

function parseInitialData(text: string, year: number = 2026): Omit<Record, 'id'>[] {
  const lines = text.trim().split('\n');
  const records: Omit<Record, 'id'>[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const parts = trimmed.split(/[\t\s]+/).filter(Boolean);
    if (parts.length < 2) return;

    const datePart = parts[0];
    const checkIn = parts[1];
    const checkOut = parts[2] || null;

    const dateMatch = datePart.match(/^(\d{1,2})\.(\d{1,2})$/);
    if (!dateMatch) return;

    const month = parseInt(dateMatch[1]);
    const day = parseInt(dateMatch[2]);
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    let duration: number | null = null;
    if (checkOut && /^\d{1,2}:\d{2}$/.test(checkOut)) {
      const [inH, inM] = checkIn.split(':').map(Number);
      const [outH, outM] = checkOut.split(':').map(Number);
      duration = (outH * 60 + outM) - (inH * 60 + inM);
    }

    records.push({ date, checkIn, checkOut, duration });
  });

  return records;
}

export function useRecords() {
  const [records, setRecords] = useState<Record[]>([]);
  const [settings, setSettings] = useState<AppSettings>(loadSettingsFromLocal());
  const [initialized, setInitialized] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'offline'>('idle');
  const unsubRef = useRef<(() => void) | null>(null);
  const lastLocalUpdateRef = useRef<number>(0);

  // 初始化（仅首次）
  useEffect(() => {
    const init = async () => {
      const existingRecords = getRecords();
      const loadedSettings = loadSettingsFromLocal();

      let baseRecords = existingRecords;
      if (existingRecords.length === 0) {
        const initialRecords = parseInitialData(INITIAL_DATA);
        const withIds = initialRecords.map(r => ({ ...r, id: generateId() }));
        baseRecords = withIds.sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        saveRecords(baseRecords);
      }
      setRecords(baseRecords);
      setSettings(loadedSettings);
      saveSettingsToLocal(loadedSettings);

      if (loadedSettings.syncCode) {
        setSyncStatus('syncing');
        const cloud = await loadDataFromCloud();
        if (cloud) {
          // 比较时间戳：如果云端比本地"更新过"，用云端
          const localUpdated = parseInt(localStorage.getItem('attendance_local_updated_ms') || '0');
          if (cloud.updatedAtMs > localUpdated) {
            if (Array.isArray(cloud.records) && cloud.records.length > 0) {
              setRecords(cloud.records);
              saveRecords(cloud.records);
            }
            if (cloud.settings) {
              const merged: AppSettings = {
                weeklyTargetHours: cloud.settings.weeklyTargetHours ?? loadedSettings.weeklyTargetHours,
                workDaysPerWeek: cloud.settings.workDaysPerWeek ?? loadedSettings.workDaysPerWeek,
                syncCode: loadedSettings.syncCode,
              };
              setSettings(merged);
              saveSettingsToLocal(merged);
            }
          } else {
            // 本地更新，推上去
            syncDataToCloud(baseRecords, loadedSettings);
          }
          setSyncStatus('synced');
        } else {
          setSyncStatus('offline');
        }
      }

      setInitialized(true);
    };
    init();
  }, []);

  // 订阅云端轮询
  useEffect(() => {
    if (!initialized) return;
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
    if (settings.syncCode) {
      unsubRef.current = subscribeCloud((data) => {
        if (Date.now() - lastLocalUpdateRef.current < 2000) return;
        if (Array.isArray(data.records)) {
          setRecords(data.records);
          saveRecords(data.records);
        }
        if (data.settings) {
          const merged: AppSettings = {
            weeklyTargetHours: data.settings.weeklyTargetHours ?? settings.weeklyTargetHours,
            workDaysPerWeek: data.settings.workDaysPerWeek ?? settings.workDaysPerWeek,
            syncCode: settings.syncCode,
          };
          setSettings(merged);
          saveSettingsToLocal(merged);
        }
        setSyncStatus('synced');
      });
    }
    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [settings.syncCode, initialized]);

  const persist = useCallback((newRecords: Record[], newSettings: AppSettings) => {
    saveRecords(newRecords);
    saveSettingsToLocal(newSettings);
    lastLocalUpdateRef.current = Date.now();
    localStorage.setItem('attendance_local_updated_ms', String(lastLocalUpdateRef.current));
    if (newSettings.syncCode) {
      setSyncStatus('syncing');
      syncDataToCloud(newRecords, newSettings);
      setTimeout(() => setSyncStatus('synced'), 800);
    }
  }, []);

  const addRecord = useCallback((date: string, checkIn: string) => {
    const newRecord: Record = {
      id: generateId(),
      date,
      checkIn,
      checkOut: null,
      duration: null
    };
    const updated = [newRecord, ...records];
    setRecords(updated);
    persist(updated, settings);
    return newRecord;
  }, [records, settings, persist]);

  const updateRecord = useCallback((id: string, checkOut: string) => {
    const record = records.find(r => r.id === id);
    if (!record || !record.checkIn) return null;
    const duration = calculateDuration(record.checkIn, checkOut);
    const updated = records.map(r =>
      r.id === id ? { ...r, checkOut, duration } : r
    );
    setRecords(updated);
    persist(updated, settings);
    return { ...record, checkOut, duration };
  }, [records, settings, persist]);

  const editRecord = useCallback((id: string, date: string, checkIn: string, checkOut: string | null) => {
    let duration: number | null = null;
    if (checkIn && checkOut) {
      duration = calculateDuration(checkIn, checkOut);
    }
    const updated = records.map(r =>
      r.id === id ? { ...r, date, checkIn, checkOut, duration } : r
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setRecords(updated);
    persist(updated, settings);
  }, [records, settings, persist]);

  const deleteRecord = useCallback((id: string) => {
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    persist(updated, settings);
  }, [records, settings, persist]);

  /** 用自定义同步码启用同步（A 设备：上传本地数据 / 已存在则覆盖云端） */
  const enableSyncWithUserCode = useCallback(async (code: string): Promise<{ ok: boolean; reason?: string }> => {
    const trimmed = code.trim();
    if (!isValidSyncCode(trimmed)) {
      return { ok: false, reason: '同步码格式无效（4-64 位字母/数字/下划线/横线）' };
    }
    setSyncStatus('syncing');
    const r = await enableSyncWithCode(trimmed, records, { ...settings, syncCode: trimmed });
    if (!r.ok) {
      setSyncStatus('offline');
      return r;
    }
    const merged = { ...settings, syncCode: trimmed };
    setSettings(merged);
    saveSettingsToLocal(merged);
    setSyncStatus('synced');
    return { ok: true };
  }, [records, settings]);

  /** 加入已有的同步空间（B 设备：用已知同步码拉取云端数据覆盖本地） */
  const joinSync = useCallback(async (code: string): Promise<{ ok: boolean; reason?: string }> => {
    const trimmed = code.trim();
    if (!isValidSyncCode(trimmed)) {
      return { ok: false, reason: '同步码格式无效（4-64 位字母/数字/下划线/横线）' };
    }
    setSyncCode(trimmed);
    setSyncStatus('syncing');

    const cloud = await loadDataFromCloud();
    if (!cloud) {
      setSyncStatus('offline');
      return { ok: false, reason: '网络错误或同步码无效' };
    }
    if (cloud.updatedAtMs === 0 && cloud.records.length === 0) {
      setSyncStatus('offline');
      return { ok: false, reason: '该同步码在云端没有数据，请确认主设备已点击 "保存并同步"' };
    }
    setRecords(cloud.records);
    saveRecords(cloud.records);
    const mergedSettings: AppSettings = {
      weeklyTargetHours: cloud.settings.weeklyTargetHours ?? settings.weeklyTargetHours,
      workDaysPerWeek: cloud.settings.workDaysPerWeek ?? settings.workDaysPerWeek,
      syncCode: trimmed,
    };
    setSettings(mergedSettings);
    saveSettingsToLocal(mergedSettings);
    setSyncStatus('synced');
    return { ok: true };
  }, [settings]);

  /** 断开同步 */
  const disableSync = useCallback(() => {
    setSyncCode('');
    const merged = { ...settings, syncCode: '' };
    setSettings(merged);
    saveSettingsToLocal(merged);
    setSyncStatus('idle');
  }, [settings]);

  const updateSettings = useCallback((newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettingsToLocal(newSettings);
    persist(records, newSettings);
  }, [records, persist]);

  const getTodayRecord = useCallback(() => {
    const today = getCurrentDate();
    return records.find(r => r.date === today) || null;
  }, [records]);

  const importRecords = useCallback((newRecords: Omit<Record, 'id'>[]) => {
    const withIds = newRecords.map(r => ({ ...r, id: generateId() }));
    const existingDates = new Set(records.map(r => r.date));
    const toAdd = withIds.filter(r => !existingDates.has(r.date));
    const updated = [...toAdd, ...records].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setRecords(updated);
    persist(updated, settings);
    return toAdd.length;
  }, [records, settings, persist]);

  return {
    records,
    settings,
    initialized,
    syncStatus,
    addRecord,
    updateRecord,
    editRecord,
    deleteRecord,
    getTodayRecord,
    importRecords,
    updateSettings,
    enableSyncWithUserCode,
    joinSync,
    disableSync,
    currentSyncCode: getSyncCode()
  };
}
