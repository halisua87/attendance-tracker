import { Record } from '../types';
import { RecordItem } from './RecordItem';
import { List } from 'lucide-react';

interface RecordListProps {
  records: Record[];
  onDelete: (id: string) => void;
  onEdit: (record: Record) => void;
}

export function RecordList({ records, onDelete, onEdit }: RecordListProps) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-50 rounded-xl">
          <List className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">打卡记录</h2>
          <span className="inline-block px-4 py-1.5 text-sm font-semibold rounded-full bg-gradient-to-r from-blue-100 to-purple-100 text-blue-600 mt-1">
            共 {records.length} 条记录
          </span>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-200 shadow-xl text-center">
          <div className="text-7xl mb-6">📝</div>
          <div className="text-2xl font-semibold text-gray-600 mb-3">暂无打卡记录</div>
          <div className="text-gray-500 text-lg">点击上方按钮开始打卡吧</div>
        </div>
      ) : (
        <div className="space-y-5">
          {records.map((record) => (
            <RecordItem key={record.id} record={record} onDelete={onDelete} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
