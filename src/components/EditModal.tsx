import { useState, useEffect } from 'react';
import { X, Edit2 } from 'lucide-react';
import { Record } from '../types';

interface EditModalProps {
  isOpen: boolean;
  record: Record | null;
  onClose: () => void;
  onSave: (id: string, date: string, checkIn: string, checkOut: string | null) => void;
}

export function EditModal({ isOpen, record, onClose, onSave }: EditModalProps) {
  const [date, setDate] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');

  useEffect(() => {
    if (record) {
      setDate(record.date);
      setCheckIn(record.checkIn ?? '');
      setCheckOut(record.checkOut ?? '');
    }
  }, [record]);

  const handleSave = () => {
    if (record) {
      const finalCheckOut = checkOut.trim() === '' ? null : checkOut;
      onSave(record.id, date, checkIn, finalCheckOut);
      onClose();
    }
  };

  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-8 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
              <Edit2 className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">编辑打卡记录</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl text-base font-medium focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">上班时间</label>
            <input
              type="time"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl text-base font-medium focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">下班时间</label>
            <input
              type="time"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl text-base font-medium focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 p-8 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-8 py-3 text-gray-700 bg-gray-100 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-8 py-3 text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
