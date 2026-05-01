import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkle, Brain, X, Send, History, Trash2, 
  ArrowRight, Info, Activity, TrendingUp, Zap, AlertCircle,
  Download
} from 'lucide-react';
import Markdown from 'react-markdown';
import { cn } from '../../lib/utils';
import { AISettings, ChatMessage, ActivitySummary, PMCDataPoint, HistoricalActivity, SleepMetric, HRVMetric } from '../../types';
import { getCoachResponse, buildCoachContext } from '../../services/intelligenceService';

interface IntelligenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  aiSettings: AISettings;
  summary: ActivitySummary | null;
  currentPMC: PMCDataPoint | null;
  history: HistoricalActivity[];
  sleepHistory: SleepMetric[];
  hrvHistory: HRVMetric[];
  cp: number;
  wPrime: number;
}

export const IntelligenceDrawer: React.FC<IntelligenceDrawerProps> = ({
  isOpen,
  onClose,
  aiSettings,
  summary,
  currentPMC,
  history,
  sleepHistory,
  hrvHistory,
  cp,
  wPrime
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (textOverride?: string) => {
    const text = textOverride || inputValue;
    if (!text.trim() || isTyping) return;

    setError(null);
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsTyping(true);

    try {
      const context = buildCoachContext(summary, currentPMC, history, sleepHistory, hrvHistory, cp, wPrime);
      const response = await getCoachResponse(aiSettings, newMessages, context);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Coach Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to Velo Coach brain.');
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  const downloadResponse = (content: string, timestamp: Date) => {
    const dateStr = timestamp.toISOString().split('T')[0];
    const timeStr = timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }).replace(':', '');
    const filename = `velo-coach-insight-${dateStr}-${timeStr}.md`;
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const quickActions = [
    { label: 'Analyze This Ride', icon: Activity, prompt: 'Please provide a clinical analysis of my latest ride metrics, focusing on power zones and aerobic efficiency.' },
    { label: 'Check 6-Week Trend', icon: TrendingUp, prompt: 'How is my 6-week fitness (CTL) and fatigue (ATL) trending? Am I gaining or losing form?' },
    { label: 'Fatigue Watch', icon: Zap, prompt: 'Looking at my current form (TSB), am I at risk of overtraining or am I ready to race?' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[110]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[450px] bg-app-card border-l border-app-border z-[120] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-app-border bg-app-card/50 backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                  <Brain className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-app-text">Velo Coach</h2>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-[10px] text-app-muted uppercase font-bold tracking-widest">
                      {aiSettings.provider} • {
                        aiSettings.provider === 'gemini' ? aiSettings.geminiModel : 
                        aiSettings.provider === 'openai' ? aiSettings.openaiModel :
                        aiSettings.provider === 'anthropic' ? aiSettings.anthropicModel :
                        aiSettings.provider === 'ollama' ? aiSettings.ollamaModel :
                        aiSettings.lmStudioModel
                      }
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-app-bg/50 rounded-full text-app-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-app-bg/10"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-0 animate-in fade-in duration-700 delay-300 fill-mode-forwards">
                  <div className="w-16 h-16 rounded-3xl bg-orange-500/5 flex items-center justify-center border border-orange-500/10">
                    <Sparkle className="w-8 h-8 text-orange-500/40" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-app-text">Ready to analyze</h3>
                    <p className="text-xs text-app-muted max-w-[240px] leading-relaxed">
                      Your performance data is parsed and formatted. Ask me anything about your power, heart rate, or training load.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 w-full max-w-[280px]">
                    {quickActions.map(action => (
                      <button
                        key={action.label}
                        onClick={() => handleSend(action.prompt)}
                        className="flex items-center gap-3 p-3.5 rounded-2xl bg-app-card border border-app-border hover:border-orange-500/30 transition-all text-left group"
                      >
                        <action.icon className="w-4 h-4 text-orange-500" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-app-text">{action.label}</span>
                        <ArrowRight className="w-3 h-3 ml-auto text-app-muted group-hover:translate-x-1 transition-transform" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) => (
                  <div 
                    key={m.id}
                    className={cn(
                      "flex flex-col max-w-[90%] animate-in fade-in slide-in-from-bottom-2 duration-300",
                      m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <div className={cn(
                      "p-4 rounded-2xl text-sm leading-relaxed prose prose-invert prose-orange max-w-none prose-sm group relative",
                      m.role === 'user' 
                        ? "bg-orange-500 text-black font-bold shadow-lg shadow-orange-500/10 rounded-tr-none" 
                        : "bg-app-card border border-app-border text-app-text rounded-tl-none"
                    )}>
                      {m.role === 'user' ? (
                        <p>{m.content.includes('Context Info:') ? m.content.split('\n\nUser Question: ')[1] : m.content}</p>
                      ) : (
                        <>
                          <Markdown>{m.content}</Markdown>
                          <button
                            onClick={() => downloadResponse(m.content, m.timestamp)}
                            className="absolute -bottom-3 -right-3 p-2 bg-app-card border border-app-border rounded-xl text-app-muted hover:text-orange-500 hover:border-orange-500/50 shadow-lg transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 z-10"
                            title="Download as Markdown"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                    <span className="text-[9px] text-app-muted font-bold mt-1.5 uppercase tracking-widest">
                      {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
              {isTyping && (
                <div className="flex gap-1.5 items-center p-4 bg-app-card border border-app-border rounded-2xl rounded-tl-none w-16">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-bounce" />
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-bounce [animation-delay:0.4s]" />
                </div>
              )}
              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl animate-in fade-in zoom-in duration-300">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-red-400 uppercase tracking-widest">Coach Encountered a Problem</p>
                    <p className="text-[11px] text-app-secondary-text leading-relaxed">{error}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-app-border bg-app-card/50 backdrop-blur-md">
              <div className="flex items-center gap-3 bg-app-bg border border-app-border rounded-2xl p-1.5 focus-within:border-orange-500/50 transition-colors shadow-inner">
                <input 
                  type="text" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask your coach..."
                  className="bg-transparent flex-1 px-4 py-2 text-sm focus:outline-none placeholder:text-app-muted"
                />
                <button 
                  onClick={() => handleSend()}
                  disabled={!inputValue.trim() || isTyping}
                  className="p-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-orange-500 text-black rounded-xl transition-all active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-4 px-1">
                <button 
                  onClick={clearChat}
                  className="flex items-center gap-2 text-[10px] text-app-muted hover:text-red-400 font-bold uppercase tracking-widest transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Conversation
                </button>
                <div className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-app-muted" />
                  <span className="text-[10px] text-app-muted font-bold uppercase tracking-widest">
                    Privacy Enabled
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
