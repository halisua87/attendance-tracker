import { useState, useRef, useEffect } from 'react';
import { Mic, Volume2 } from 'lucide-react';
import { isSpeechRecognitionSupported, parseVoiceCommand } from '../utils/voice';
import { VoiceParseResult } from '../types';

interface VoiceInputProps {
  onVoiceCheckIn: (time: string) => void;
  onVoiceCheckOut: (time: string) => void;
}

export function VoiceInput({ onVoiceCheckIn, onVoiceCheckOut }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'success' | 'error'>('idle');
  const recognitionRef = useRef<any>(null);
  const supported = isSpeechRecognitionSupported();

  useEffect(() => {
    if (supported) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'zh-CN';

        recognition.onstart = () => {
          setIsListening(true);
          setStatus('listening');
          setTranscript('');
        };

        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setTranscript(finalTranscript);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setStatus('error');
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [supported]);

  const startListening = () => {
    if (!supported) return;
    try {
      recognitionRef.current?.start();
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
    }
  };

  const stopListening = () => {
    if (!supported) return;
    try {
      recognitionRef.current?.stop();
      if (transcript) {
        const result: VoiceParseResult = parseVoiceCommand(transcript);
        if (result.success) {
          setStatus('success');
          if (result.type === 'checkIn') {
            onVoiceCheckIn(result.time);
          } else {
            onVoiceCheckOut(result.time);
          }
        } else {
          setStatus('error');
        }
        setTimeout(() => {
          setStatus('idle');
          setTranscript('');
        }, 2000);
      }
    } catch (e) {
      console.error('Failed to stop speech recognition:', e);
    }
  };

  const handleToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!supported) {
    return (
      <div className="text-center text-text-gray text-sm">
        浏览器不支持语音识别
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleToggle}
        className={`relative flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 ${
          isListening
            ? 'bg-gradient-to-br from-primary to-primary-dark shadow-kitty animate-pulse'
            : status === 'success'
            ? 'bg-gradient-to-br from-success to-green-600 shadow-kitty'
            : 'bg-gradient-to-br from-primary-light to-primary hover:shadow-kitty hover:scale-105'
        }`}
      >
        {isListening ? (
          <Mic className="w-8 h-8 text-white" />
        ) : status === 'success' ? (
          <Volume2 className="w-8 h-8 text-white" />
        ) : (
          <Mic className="w-8 h-8 text-white" />
        )}
      </button>

      <div className="text-center">
        {isListening && (
          <div className="text-primary font-bold text-sm animate-pulse">
            🎤 正在听... {transcript && (
              <span className="block text-text-dark mt-1">{transcript}</span>
            )}
          </div>
        )}
        {status === 'success' && (
          <div className="text-success font-bold text-sm">
            ✨ {parseVoiceCommand(transcript).message}
          </div>
        )}
        {status === 'error' && (
          <div className="text-red-500 font-bold text-sm">
            ❌ 请说"上班"或"下班"
          </div>
        )}
        {status === 'idle' && !isListening && (
          <div className="text-text-gray text-sm">
            点击麦克风语音打卡 🐱
          </div>
        )}
      </div>
    </div>
  );
}
