import { useState, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { CheckInArea } from './components/CheckInArea';
import { FilterBar } from './components/FilterBar';
import { RecordList } from './components/RecordList';
import { ImportModal } from './components/ImportModal';
import { ConfirmModal } from './components/ConfirmModal';
import { EditModal } from './components/EditModal';
import { TargetGoal } from './components/TargetGoal';
import { useRecords } from './hooks/useRecords';
import { getCurrentDate, getCurrentWeekString, getCurrentMonthString, getWeekDateRange } from './utils/time';
import { Upload } from 'lucide-react';
import { Record } from './types';

function getFilteredRecords(
  records: Record[],
  filterType: string,
  selectedWeek: string,
  selectedMonth: string,
  customDateRange: { start: string; end: string }
): Record[] {
  switch (filterType) {
    case 'week': {
      const range = getWeekDateRange(selectedWeek);
      return records.filter(r => r.date >= range.start && r.date <= range.end);
    }
    case 'month': {
      const [y, m] = selectedMonth.split('-');
      return records.filter(r => r.date.startsWith(`${y}-${m}`));
    }
    case 'custom': {
      return records.filter(r => r.date >= customDateRange.start && r.date <= customDateRange.end);
    }
    default:
      return records;
  }
}

export default function App() {
  const { records, settings, syncStatus, addRecord, updateRecord, editRecord, deleteRecord, getTodayRecord, importRecords, updateSettings, enableSyncWithUserCode, joinSync, disableSync } = useRecords();
  // 默认显示全部
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState<string>(getCurrentWeekString());
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthString());
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string }>({
    start: getCurrentDate(),
    end: getCurrentDate()
  });
  const [showImport, setShowImport] = useState<boolean>(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null
  });
  const [showEdit, setShowEdit] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<Record | null>(null);

  const todayRecord = getTodayRecord();

  const filteredRecords = useMemo(() => {
    const filtered = getFilteredRecords(records, filterType, selectedWeek, selectedMonth, customDateRange);
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, filterType, selectedWeek, selectedMonth, customDateRange]);

  const handleFilterChange = useCallback((type: string, value?: any) => {
    setFilterType(type);
    if (type === 'week' && value) setSelectedWeek(value);
    if (type === 'month' && value) setSelectedMonth(value);
    if (type === 'custom' && value) setCustomDateRange(value);
  }, []);

  // 用于Header组件的筛选变更
  const handleHeaderFilterChange = useCallback((type: 'week' | 'month', value?: string) => {
    setFilterType(type);
    if (type === 'week' && value) setSelectedWeek(value);
    if (type === 'month' && value) setSelectedMonth(value);
  }, []);

  const handleCheckIn = useCallback((time?: string) => {
    if (time) {
      addRecord(getCurrentDate(), time);
    } else {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      addRecord(getCurrentDate(), currentTime);
    }
  }, [addRecord]);

  const handleCheckOut = useCallback((id: string, time?: string) => {
    if (time) {
      updateRecord(id, time);
    } else {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      updateRecord(id, currentTime);
    }
  }, [updateRecord]);

  const handleDelete = useCallback((id: string) => {
    setDeleteConfirm({ open: true, id });
  }, []);

  const confirmDelete = useCallback(() => {
    if (deleteConfirm.id) {
      deleteRecord(deleteConfirm.id);
      setDeleteConfirm({ open: false, id: null });
    }
  }, [deleteConfirm.id, deleteRecord]);

  const handleEdit = useCallback((record: Record) => {
    setEditingRecord(record);
    setShowEdit(true);
  }, []);

  const handleSaveEdit = useCallback((id: string, date: string, checkIn: string, checkOut: string | null) => {
    editRecord(id, date, checkIn, checkOut);
  }, [editRecord]);

  const handleImport = useCallback((newRecords: Omit<Record, 'id'>[]) => {
    return importRecords(newRecords);
  }, [importRecords]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <Upload className="w-5 h-5" />
            <span>导入数据</span>
          </button>
        </div>

        <CheckInArea
          todayRecord={todayRecord}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
        />

        <TargetGoal
          records={records}
          settings={settings}
          syncStatus={syncStatus}
          onSettingsChange={updateSettings}
          onEnableSyncWithCode={enableSyncWithUserCode}
          onJoinSync={joinSync}
          onDisableSync={disableSync}
        />

        <Header 
          records={records}
          filterType={filterType as 'week' | 'month' | 'all'}
          selectedWeek={selectedWeek}
          selectedMonth={selectedMonth}
          onFilterChange={handleHeaderFilterChange}
        />

        <FilterBar
          filterType={filterType}
          selectedWeek={selectedWeek}
          selectedMonth={selectedMonth}
          customDateRange={customDateRange}
          onFilterChange={handleFilterChange}
        />

        <RecordList records={filteredRecords} onDelete={handleDelete} onEdit={handleEdit} />
      </main>

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImport}
      />

      <EditModal
        isOpen={showEdit}
        record={editingRecord}
        onClose={() => setShowEdit(false)}
        onSave={handleSaveEdit}
      />

      <ConfirmModal
        isOpen={deleteConfirm.open}
        title="删除记录"
        message="确定要删除这条打卡记录吗？此操作无法撤销。"
        confirmText="删除"
        cancelText="取消"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
        danger
      />
    </div>
  );
}
