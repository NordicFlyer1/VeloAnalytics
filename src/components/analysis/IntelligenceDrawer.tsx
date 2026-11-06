import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkle, Brain, X, Send, History, Trash2, 
  ArrowRight, Info, Activity, TrendingUp, Zap, AlertCircle,
  Download, Command, Mic, MicOff, Volume2, VolumeX, Square
} from 'lucide-react';
import Markdown from 'react-markdown';
import { cn, formatLocalDate } from '../../lib/utils';
import { saveAs } from '../../lib/fileSystem';
import { AISettings, ChatMessage, ActivitySummary, PMCDataPoint, HistoricalActivity, SleepMetric, HRVMetric } from '../../types';
import { getCoachResponse, buildCoachContext } from '../../services/intelligenceService';
import { useVoiceCoach } from '../../hooks/useVoiceCoach';

interface IntelligenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  aiSettings: AISettings;
  updateAiSettings: (updates: Partial<AISettings>) => void;
  summary: ActivitySummary | null;
  currentPMC: PMCDataPoint | null;
  predictedPMC: PMCDataPoint | null;
  pmcData: PMCDataPoint[];
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
  updateAiSettings,
  summary,
  currentPMC,
  predictedPMC,
  pmcData,
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

  const {
    isListening,
    speakingMessageId,
    speechError,
    clearSpeechError,
    toggleListening,
    stopListening,
    toggleSpeak,
    stopSpeaking,
    speak,
    isSpeechSynthesisSupported
  } = useVoiceCoach({
    autoSpeak: aiSettings.autoSpeakResponses,
    onTranscript: (transcript) => {
      setInputValue(transcript);
    }
  });

  const handleClose = () => {
    stopSpeaking();
    stopListening();
    onClose();
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (textOverride?: string) => {
    const text = textOverride || inputValue;
    if (!text.trim() || isTyping) return;

    // Stop listening when sending
    stopListening();
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
      const context = buildCoachContext(
        summary, 
        currentPMC, 
        predictedPMC,
        pmcData,
        history, 
        sleepHistory, 
        hrvHistory, 
        cp, 
        wPrime,
        aiSettings,
        aiSettings.wellnessContextDays || 7
      );
      const response = await getCoachResponse(aiSettings, newMessages, context);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Automatically speak verbal response if autoSpeak is enabled
      if (aiSettings.autoSpeakResponses) {
        speak(response, assistantMessage.id);
      }
    } catch (err) {
      console.error('Coach Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to Velo Coach brain.');
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    stopSpeaking();
    stopListening();
    setMessages([]);
    setError(null);
  };

  const downloadResponse = async (content: string, timestamp: Date) => {
    const dateStr = formatLocalDate(timestamp);
    const timeStr = timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }).replace(':', '');
    const filename = `velo-coach-insight-${dateStr}-${timeStr}.md`;
    
    await saveAs(content, filename, {
      description: 'Markdown File',
      accept: { 'text/markdown': ['.md'] }
    });
  };

  const downloadContext = async () => {
    const context = buildCoachContext(
      summary, 
      currentPMC, 
      predictedPMC,
      pmcData,
      history, 
      sleepHistory, 
      hrvHistory, 
      cp, 
      wPrime,
      aiSettings,
      aiSettings.wellnessContextDays || 7
    );
    
    const filename = `velo-ai-context-${new Date().toISOString().split('T')[0]}.json`;

    await saveAs(context, filename, {
      description: 'JSON File',
      accept: { 'application/json': ['.json'] }
    });
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
            onClick={handleClose}
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
                        aiSettings.provider === 'groq' ? aiSettings.groqModel :
                        aiSettings.provider === 'ollama' ? aiSettings.ollamaModel :
                        aiSettings.lmStudioModel
                      }
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Voice Audio Capsule */}
                {isSpeechSynthesisSupported && (
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-[9px] text-app-muted font-bold uppercase tracking-widest mb-1.5">Voice Audio</span>
                    <div className="flex bg-app-bg/50 p-0.5 rounded-full border border-app-border">
                      <button
                        type="button"
                        onClick={() => {
                          updateAiSettings({ autoSpeakResponses: false });
                          stopSpeaking();
                        }}
                        className={cn(
                          "px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-tighter transition-all",
                          !aiSettings.autoSpeakResponses 
                            ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" 
                            : "text-app-muted hover:text-app-text"
                        )}
                        title="Mute voice auto-speak (Click speaker on message to listen on demand)"
                      >
                        Off
                      </button>
                      <button
                        type="button"
                        onClick={() => updateAiSettings({ autoSpeakResponses: true })}
                        className={cn(
                          "px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-tighter transition-all flex items-center gap-1",
                          aiSettings.autoSpeakResponses 
                            ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" 
                            : "text-app-muted hover:text-app-text"
                        )}
                        title="Automatically speak coach responses aloud"
                      >
                        <Volume2 className="w-2.5 h-2.5" />
                        Auto
                      </button>
                    </div>
                  </div>
                )}

                {/* Context Window Capsule */}
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[9px] text-app-muted font-bold uppercase tracking-widest mb-1.5">Context Window</span>
                  <div className="flex bg-app-bg/50 p-0.5 rounded-full border border-app-border">
                    {[7, 14, 21, 28].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => updateAiSettings({ wellnessContextDays: days })}
                        className={cn(
                          "px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-tighter transition-all",
                          aiSettings.wellnessContextDays === days 
                            ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" 
                            : "text-app-muted hover:text-app-text"
                        )}
                      >
                        {days}d
                      </button>
                    ))}
                  </div>
                </div>
                <button 
                  onClick={downloadContext}
                  className="p-2 hover:bg-app-bg/50 rounded-full text-app-muted hover:text-orange-500 transition-colors"
                  title="Export Internal AI Context (JSON)"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleClose}
                  className="p-2 hover:bg-app-bg/50 rounded-full text-app-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
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

                  <div className="p-3 rounded-2xl bg-app-card/60 border border-app-border/70 max-w-[280px] text-left flex items-start gap-2.5">
                    <Command className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-app-muted leading-relaxed">
                      <strong className="text-app-text">macOS Tip:</strong> Ask Siri or press <kbd className="px-1 py-0.2 rounded bg-app-bg border border-app-border text-[9px]">⌘ Space</kbd> and type <span className="text-orange-500 font-semibold">"Ask Velo Coach"</span> to open this assistant from anywhere on your Mac.
                    </p>
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
                          <div className="absolute -bottom-3 -right-3 flex items-center gap-1.5 z-10">
                            {isSpeechSynthesisSupported && (
                              <button
                                type="button"
                                onClick={() => toggleSpeak(m.content, m.id)}
                                className={cn(
                                  "p-2 bg-app-card border border-app-border rounded-xl text-app-muted hover:text-orange-500 hover:border-orange-500/50 shadow-lg transition-all",
                                  speakingMessageId === m.id
                                    ? "text-orange-500 border-orange-500/60 bg-orange-500/15 opacity-100 scale-100 ring-2 ring-orange-500/30"
                                    : "opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                                )}
                                title={speakingMessageId === m.id ? "Stop reading aloud" : "Read insight aloud"}
                              >
                                {speakingMessageId === m.id ? (
                                  <Square className="w-3.5 h-3.5 fill-orange-500 text-orange-500 animate-pulse" />
                                ) : (
                                  <Volume2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => downloadResponse(m.content, m.timestamp)}
                              className="p-2 bg-app-card border border-app-border rounded-xl text-app-muted hover:text-orange-500 hover:border-orange-500/50 shadow-lg transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                              title="Download as Markdown"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
            <div className="p-6 border-t border-app-border bg-app-card/50 backdrop-blur-md space-y-2">
              {/* Active Listening Indicator */}
              {isListening && (
                <motion.div 
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-500"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                    <span className="text-[11px] font-bold tracking-tight">Listening to your voice... Speak your question now</span>
                  </div>
                  <button 
                    type="button"
                    onClick={stopListening}
                    className="text-[10px] font-bold uppercase tracking-wider hover:underline text-orange-400"
                  >
                    Done Speaking
                  </button>
                </motion.div>
              )}

              {/* Speech Error Banner if permission denied */}
              {speechError && (
                <div className="px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] flex items-center justify-between animate-in fade-in duration-200">
                  <span className="leading-tight pr-2">{speechError}</span>
                  <button 
                    type="button" 
                    onClick={clearSpeechError} 
                    className="text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-red-300 hover:underline shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 bg-app-bg border border-app-border rounded-2xl p-1.5 focus-within:border-orange-500/50 transition-colors shadow-inner">
                {/* Voice Input Microphone Button */}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={cn(
                    "p-3 rounded-xl transition-all flex items-center justify-center shrink-0 active:scale-95",
                    isListening
                      ? "bg-orange-500 text-black shadow-lg shadow-orange-500/25 ring-2 ring-orange-500/40"
                      : "text-app-muted hover:text-orange-500 hover:bg-app-card/80"
                  )}
                  title={isListening ? "Listening... Click to stop" : "Speak your question via microphone"}
                >
                  {isListening ? (
                    <MicOff className="w-4 h-4 animate-bounce" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>

                <input 
                  type="text" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={isListening ? "Listening to your voice..." : "Ask your coach (or click mic to speak)..."}
                  className="bg-transparent flex-1 px-2 py-2 text-sm focus:outline-none placeholder:text-app-muted"
                />
                <button 
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!inputValue.trim() || isTyping}
                  className="p-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-orange-500 text-black rounded-xl transition-all active:scale-95 shrink-0"
                  title="Send Question"
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
