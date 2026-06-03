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
  getSyncCode
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
        try {
          const cloud = await loadDataFromCloud();
          if (cloud && cloud.records && cloud.records.length > 0) {
            // 云端有数据：以云端为准
            setRecords(cloud.records);
            saveRecords(cloud.records);
            if (cloud.settings) {
              const merged = { ...cloud.settings, syncCode: loadedSettings.syncCode };
              setSettings(merged);
              saveSettingsToLocal(merged);
            }
          } else {
            // 云端为空：把本地数据上传
            syncDataToCloud(baseRecords, loadedSettings);
          }
          setSyncStatus('synced');
        } catch {
          setSyncStatus('offline');
        }
      }

      setInitialized(true);
    };
    init();
  }, []);

  // 当 syncCode 变化时，重新订阅
  useEffect(() => {
    if (!initialized) return;
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
    if (settings.syncCode) {
      unsubRef.current = subscribeCloud(({ records: rRecs, settings: rSettings, updatedAtMs }) => {
        // 忽略 1.5s 内本地刚刚 push 上去的数据回放
        if (Date.now() - lastLocalUpdateRef.current < 1500) return;
        if (Array.isArray(rRecs)) {
          setRecords(rRecs);
          saveRecords(rRecs);
        }
        if (rSettings) {
          const merged = { ...rSettings, syncCode: settings.syncCode };
          setSettings(merged);
          saveSettingsToLocal(merged);
        }
        setSyncStatus('synced');
        void updatedAtMs;
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
    if (newSettings.syncCode) {
      setSyncStatus('syncing');
      syncDataToCloud(newRecords, newSettings);
      setTimeout(() => setSyncStatus('synced'), 600);
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

  const updateSettings = useCallback((newSettings: AppSettings) => {
    const codeChanged = newSettings.syncCode !== settings.syncCode;
    setSettings(newSettings);
    setSyncCode(newSettings.syncCode || '');
    saveSettingsToLocal(newSettings);
    if (codeChanged && newSettings.syncCode) {
      // 切换/启用同步码：先尝试拉云端
      (async () => {
        setSyncStatus('syncing');
        const cloud = await loadDataFromCloud();
        if (cloud && cloud.records && cloud.records.length > 0) {
          setRecords(cloud.records);
          saveRecords(cloud.records);
          if (cloud.settings) {
            const merged = { ...cloud.settings, syncCode: newSettings.syncCode };
            setSettings(merged);
            saveSettingsToLocal(merged);
          }
        } else {
          // 云端没有：把本地推上去
          syncDataToCloud(records, newSettings);
        }
        setSyncStatus('synced');
      })();
    } else {
      persist(records, newSettings);
    }
  }, [records, settings, persist]);

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
    currentSyncCode: getSyncCode()
  };
}
