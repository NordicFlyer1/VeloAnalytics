import { useState, useEffect, useRef, useCallback } from 'react';

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

/**
 * Sanitizes markdown, symbols, and cycling metric abbreviations into smooth,
 * natural speech for the SpeechSynthesis engine.
 */
export function sanitizeMarkdownForSpeech(markdown: string): string {
  if (!markdown) return '';

  let text = markdown;

  // Remove code fences completely
  text = text.replace(/```[\s\S]*?```/g, ' Code snippet omitted. ');
  // Remove inline code backticks
  text = text.replace(/`([^`]+)`/g, '$1');
  // Remove markdown images and links: [label](url) -> label
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '');
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  // Remove markdown headings, blockquotes, bullets
  text = text.replace(/^#+\s+/gm, '');
  text = text.replace(/^>\s+/gm, '');
  text = text.replace(/^[-*+]\s+/gm, '');
  text = text.replace(/^\d+\.\s+/gm, '');
  // Remove bold / italics
  text = text.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1');
  // Remove horizontal rules
  text = text.replace(/^---$/gm, '');

  // Pronunciation replacements for cycling science terminology
  text = text.replace(/\bxPower\b/gi, 'X-Power');
  text = text.replace(/\bBikeScore™?\b/gi, 'BikeScore');
  text = text.replace(/\bW'bal\b/gi, 'W prime balance');
  text = text.replace(/\bW' Balance\b/gi, 'W prime balance');
  text = text.replace(/\bW'\b/g, 'W prime');
  text = text.replace(/\bCP\b/g, 'Critical Power');
  text = text.replace(/\bRI\b/g, 'Relative Intensity');
  text = text.replace(/\bEF\b/g, 'Efficiency Factor');
  text = text.replace(/\bPw:HR\b/gi, 'aerobic decoupling');
  text = text.replace(/\bVRS\b/g, 'Velo Readiness Score');
  text = text.replace(/\bLTS\b/g, 'Fitness');
  text = text.replace(/\bSTS\b/g, 'Fatigue');
  text = text.replace(/\bSB\b/g, 'Form');
  text = text.replace(/\bHRV\b/g, 'heart rate variability');
  text = text.replace(/\bSpO2\b/gi, 'blood oxygen');
  text = text.replace(/\bSpO₂\b/gi, 'blood oxygen');

  // Units
  text = text.replace(/(\d+)\s*W\b/g, '$1 Watts');
  text = text.replace(/(\d+)\s*KJ\b/gi, '$1 kilojoules');
  text = text.replace(/(\d+)\s*BPM\b/gi, '$1 beats per minute');
  text = text.replace(/(\d+)\s*RPM\b/gi, '$1 revolutions per minute');
  text = text.replace(/(\d+)\s*KM\/H\b/gi, '$1 kilometers per hour');
  text = text.replace(/(\d+)\s*KM\b/gi, '$1 kilometers');
  text = text.replace(/(\d+)\s*MS\b/gi, '$1 milliseconds');

  // Collapse consecutive whitespace
  return text.replace(/\s+/g, ' ').trim();
}

interface UseVoiceCoachOptions {
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  autoSpeak?: boolean;
}

function getPermissionGuidance(): string {
  if (typeof window === 'undefined') return 'Microphone permission blocked.';
  const isTauri = typeof window !== 'undefined' && 
    (Boolean((window as unknown as Record<string, unknown>).__TAURI_INTERNALS__) || 
     Boolean((window as unknown as Record<string, unknown>).__TAURI__));
  if (isTauri) {
    return 'Microphone permission blocked. Enable in macOS System Settings > Privacy & Security > Microphone.';
  }
  const isSafari = typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  if (isSafari) {
    return 'Microphone access blocked. Enable in Safari Settings > Websites > Microphone or address bar.';
  }
  return 'Microphone access blocked. Click the lock/camera icon in your browser address bar to allow.';
}

export function useVoiceCoach(options: UseVoiceCoachOptions = {}) {
  const { onTranscript, autoSpeak = false } = options;

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  // Check Web Speech API availability
  const isSpeechRecognitionSupported = typeof window !== 'undefined' && 
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  
  const isSpeechSynthesisSupported = typeof window !== 'undefined' && 
    'speechSynthesis' in window;

  // Clean up synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const clearSpeechError = useCallback(() => {
    setSpeechError(null);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  }, []);

  // Start voice listening with fresh instance lifecycle and no stream collision
  const startListening = useCallback(() => {
    if (!isSpeechRecognitionSupported) {
      setSpeechError('Speech recognition is not supported in this browser or webview.');
      return;
    }

    // Stop synthesis if currently speaking
    if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    }

    // Abort and clean up any prior recognition session
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    try {
      setSpeechError(null);

      const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionConstructor) return;

      const recognition = new SpeechRecognitionConstructor();
      // Use continuous = false for single-utterance queries (stable on WebKit & Blink)
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        if (currentText && onTranscriptRef.current) {
          onTranscriptRef.current(currentText, Boolean(finalTranscript));
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        // 'no-speech' and 'aborted' are benign lifecycle events (user pause or stop toggle)
        if (event.error === 'no-speech' || event.error === 'aborted') {
          setIsListening(false);
          return;
        }

        console.warn('SpeechRecognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError(getPermissionGuidance());
        } else {
          setSpeechError(`Speech error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Failed to start SpeechRecognition:', err);
      setIsListening(false);
      recognitionRef.current = null;
      setSpeechError(getPermissionGuidance());
    }
  }, [isSpeechRecognitionSupported]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Text-To-Speech
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    }
  }, []);

  const speak = useCallback((text: string, messageId?: string) => {
    if (!isSpeechSynthesisSupported) {
      setSpeechError('Speech synthesis is not supported in this browser.');
      return;
    }

    const cleanText = sanitizeMarkdownForSpeech(text);
    if (!cleanText) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05; // Slightly brisk, athletic pace
    utterance.pitch = 1.0;

    // Select preferred high-quality voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      (v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')))
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      if (messageId) setSpeakingMessageId(messageId);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSpeechSynthesisSupported]);

  const toggleSpeak = useCallback((text: string, messageId: string) => {
    if (isSpeaking && speakingMessageId === messageId) {
      stopSpeaking();
    } else {
      speak(text, messageId);
    }
  }, [isSpeaking, speakingMessageId, speak, stopSpeaking]);

  return {
    isListening,
    isSpeaking,
    speakingMessageId,
    speechError,
    clearSpeechError,
    startListening,
    stopListening,
    toggleListening,
    speak,
    stopSpeaking,
    toggleSpeak,
    isSpeechRecognitionSupported,
    isSpeechSynthesisSupported,
    autoSpeak
  };
}
