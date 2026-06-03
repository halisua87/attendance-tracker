import { VoiceParseResult } from '../types';

// 语音识别支持检测
export function isSpeechRecognitionSupported(): boolean {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

// 解析语音命令
export function parseVoiceCommand(text: string): VoiceParseResult {
  text = text.toLowerCase();
  
  // 识别打卡类型
  let type: 'checkIn' | 'checkOut' | null = null;
  if (text.includes('上班') || text.includes('开始') || text.includes('到')) {
    type = 'checkIn';
  } else if (text.includes('下班') || text.includes('结束') || text.includes('走')) {
    type = 'checkOut';
  }
  
  // 识别时间
  const time = parseTimeFromText(text);
  
  return {
    type: type || 'checkIn',
    time: time || getCurrentTime(),
    success: type !== null,
    message: type 
      ? `识别成功: ${type === 'checkIn' ? '上班' : '下班'} ${time}` 
      : '未识别打卡类型，请说"上班"或"下班"'
  };
}

// 从文本中解析时间
function parseTimeFromText(text: string): string | null {
  // 尝试匹配"九点半"、"十点十分"等模式
  let match = text.match(/([一二三四五六七八九十零\d]+)(?:点|时)([一二三四五六七八九十零\d]+)?(?:分)?/);
  if (match) {
    const hour = chineseToNumber(match[1]);
    const minute = match[2] ? chineseToNumber(match[2]) : 0;
    if (hour !== null) {
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
  }
  
  // 尝试匹配数字时间格式如"9:30"、"10:15"
  match = text.match(/(\d{1,2})[:：](\d{2})/);
  if (match) {
    return `${String(parseInt(match[1])).padStart(2, '0')}:${match[2]}`;
  }
  
  return null;
}

// 中文数字转阿拉伯数字
function chineseToNumber(text: string): number | null {
  const chineseNums: { [key: string]: number } = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '零': 0,
    '1': 1, '2': 2, '3': 3, '4': 4, '5': 5,
    '6': 6, '7': 7, '8': 8, '9': 9, '0': 0
  };
  
  let result = 0;
  let temp = 0;
  
  for (const char of text) {
    const num = chineseNums[char];
    if (num !== undefined) {
      if (num === 10) {
        temp = temp === 0 ? 10 : temp * 10;
      } else {
        temp += num;
      }
    }
  }
  
  result = temp !== 0 ? temp : parseInt(text) || 0;
  
  return result;
}

// 获取当前时间
function getCurrentTime(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}
