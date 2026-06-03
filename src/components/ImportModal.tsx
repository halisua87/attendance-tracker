import { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { parseImportData } from '../utils/parser';
import { Record } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (records: Omit<Record, 'id'>[]) => number;
}

export function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImport = () => {
    try {
      setError(null);
      const result = parseImportData(input);
      if (result.errors.length > 0) {
        setError(result.errors.join('\n'));
        return;
      }
      const count = onImport(result.records);
      alert(`成功导入 ${count} 条记录！`);
      onClose();
      setInput('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '导入失败');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setInput(text);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-8 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
              <Upload className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">导入打卡记录</h2>
          </div>
          <button
            onClick={onClose}
            className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
          >
            <X className="w-7 h-7" />
          </button>
        </div>

        <div className="p-8">
          <div className="mb-6">
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Upload className="w-5 h-5" />
                选择文件
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="粘贴记录，格式：&#10;日期 上班时间 下班时间&#10;例如：&#10;5.11 9:38 21:07&#10;5.12 10:14 21:20"
              className="w-full h-64 px-6 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-mono text-base transition-all duration-200"
            />
          </div>

          {error && (
            <div className="p-5 mb-6 bg-gradient-to-r from-red-50 to-orange-50 text-red-700 rounded-2xl border border-red-200 font-medium">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-8 py-3 text-gray-700 bg-gray-100 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
            >
              取消
            </button>
            <button
              onClick={handleImport}
              className="px-8 py-3 text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              导入
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
