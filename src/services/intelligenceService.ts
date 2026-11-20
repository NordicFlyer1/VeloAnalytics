import { GoogleGenAI } from '@google/genai';
import { AISettings, ActivitySummary, PMCDataPoint, ChatMessage, HistoricalActivity, SleepMetric, HRVMetric } from '../types';
import { calculateVeloReadiness, calculateStandardReadiness } from './wellnessService';

/**
 * Distills complex activity and performance data into a structured JSON format for the LLM.
 */
export function buildCoachContext(
  summary: ActivitySummary | null,
  currentPMC: PMCDataPoint | null,
  predictedPMC: PMCDataPoint | null,
  pmcData: PMCDataPoint[],
  history: HistoricalActivity[],
  sleepHistory: SleepMetric[],
  hrvHistory: HRVMetric[],
  cp: number,
  wPrime: number,
  aiSettings: AISettings,
  wellnessContextDays: number = 7
): string {
  // 1. Wellness Trends (Newest First)
  const sortedSleep = [...sleepHistory].sort((a, b) => b.date.localeCompare(a.date)).slice(0, wellnessContextDays);
  const sortedHRV = [...hrvHistory].sort((a, b) => b.date.localeCompare(a.date)).slice(0, wellnessContextDays);
  
  // 2. Absolute Athlete State (Matches SummaryCards "Interface" logic)
  const latestSleep = sortedSleep[0] || null;
  
  // Find PMC aligned with latest sleep (Athlete's current baseline)
  let athleteCurrentPMC = null;
  if (latestSleep) {
    athleteCurrentPMC = pmcData.find(p => p.date === latestSleep.date);
  }
  
  // If no sleep data or no match, fall back to last real PMC point in history
  if (!athleteCurrentPMC && pmcData.length > 0) {
    const realPoints = pmcData.filter(p => !p.isPredictive);
    if (realPoints.length > 0) {
      athleteCurrentPMC = [...realPoints].sort((a, b) => b.date.localeCompare(a.date))[0];
    }
  }

  const isExperimental = !!aiSettings?.useExperimentalReadiness;

  // Calculate Global Athlete Readiness (The "Interface" number matching SummaryCards)
  let athleteGlobalReadiness: any = null;
  if (latestSleep && athleteCurrentPMC) {
    // Aligned to latest sleep as per SummaryCards
    const alignedHRV = hrvHistory.find(h => h.date === latestSleep.date) || null;
    
    if (isExperimental) {
      const veloResult = calculateVeloReadiness(
        latestSleep,
        alignedHRV,
        athleteCurrentPMC.sb,
        athleteCurrentPMC.sts,
        athleteCurrentPMC.bikeScore || 0
      );
      athleteGlobalReadiness = {
        model: "Velo Readiness (Experimental 4-Pillar)",
        ...veloResult
      };
    } else {
      const rawGarminScore = (latestSleep.readinessScore && latestSleep.readinessScore > 0) ? latestSleep.readinessScore : null;
      const computedScore = calculateStandardReadiness(
        latestSleep,
        alignedHRV,
        athleteCurrentPMC.sb
      );
      const score = rawGarminScore || computedScore;
      athleteGlobalReadiness = {
        model: "Standard Readiness (Garmin-aligned)",
        score: score,
        source: rawGarminScore ? "Garmin Direct Readiness" : "Standard 5-Pillar Calculated",
        contributors: {
          sleepScore: latestSleep.score,
          restingHeartRate: latestSleep.restingHeartRate,
          durationMinutes: latestSleep.duration,
          sleepNeedMinutes: latestSleep.sleepNeed,
          overnightHRV: alignedHRV?.overnightHRV || null,
          hrvBaseline: alignedHRV ? `${alignedHRV.baselineMin}-${alignedHRV.baselineMax}ms` : null,
          formTSB: Math.round(athleteCurrentPMC.sb)
        }
      };
    }
  }

  // 3. Activity-Specific Readiness (Context for the selected ride on ride-day)
  let activityReadiness: any = null;
  if (currentPMC && summary) {
    const activityDate = summary.startTime.toISOString().split('T')[0];
    const activitySleep = sleepHistory.find(s => s.date === activityDate) || null;
    const activityHRV = hrvHistory.find(h => h.date === activityDate) || null;
    
    if (activitySleep) {
      if (isExperimental) {
        const veloResult = calculateVeloReadiness(
          activitySleep,
          activityHRV,
          currentPMC.sb,
          currentPMC.sts,
          summary.bikeScore || 0
        );
        activityReadiness = {
          model: "Velo Readiness (Experimental 4-Pillar)",
          ...veloResult
        };
      } else {
        const rawGarminScore = (activitySleep.readinessScore && activitySleep.readinessScore > 0) ? activitySleep.readinessScore : null;
        const computedScore = calculateStandardReadiness(
          activitySleep,
          activityHRV,
          currentPMC.sb
        );
        const score = rawGarminScore || computedScore;
        activityReadiness = {
          model: "Standard Readiness (Garmin-aligned)",
          score: score,
          source: rawGarminScore ? "Garmin Direct Readiness" : "Standard 5-Pillar Calculated",
          contributors: {
            sleepScore: activitySleep.score,
            restingHeartRate: activitySleep.restingHeartRate,
            durationMinutes: activitySleep.duration,
            sleepNeedMinutes: activitySleep.sleepNeed,
            overnightHRV: activityHRV?.overnightHRV || null,
            hrvBaseline: activityHRV ? `${activityHRV.baselineMin}-${activityHRV.baselineMax}ms` : null,
            formTSB: Math.round(currentPMC.sb)
          }
        };
      }
    }
  }

  // Calculate Efficiency Factor if possible
  let efficiencyFactor = null;
  if (summary && summary.xPower && summary.avgHeartRate && summary.avgHeartRate > 0) {
    efficiencyFactor = Number((summary.xPower / summary.avgHeartRate).toFixed(2));
  }

  const contextData = {
    system: {
      date: new Date().toISOString().split('T')[0],
      units: "Metric (KM, Watts, m, kg)",
      lookbackDays: wellnessContextDays,
      readinessModel: isExperimental 
        ? "Velo Readiness (Experimental 4-Pillar)" 
        : "Standard Readiness (Garmin-aligned 5-Pillar)",
      readinessFormula: isExperimental
        ? "Base = (Sleep*0.35 + Recovery*0.25 + HRV*0.20 + Load*0.20). Adjusted by WorstPillar suppression and debt/spike penalties."
        : "Composite = (SleepScore*0.30 + HRVStatus*0.25 + DurationNeed*0.15 + RestingHR*0.15 + FormTSB*0.15). Scale 0-100."
    },
    athleteCurrentState: {
      readiness: athleteGlobalReadiness, // The "remarkably higher" UI number
      performance: athleteCurrentPMC ? {
        fitness: Math.round(athleteCurrentPMC.lts),
        fatigue: Math.round(athleteCurrentPMC.sts),
        form: Math.round(athleteCurrentPMC.sb)
      } : null,
      latestWellness: {
        sleep: latestSleep,
        hrv: sortedHRV[0] || null
      },
      sleepTrend: sortedSleep.map(s => ({
        date: s.date,
        score: s.score,
        durationMinutes: s.duration,
        quality: s.quality,
        restingHR: s.restingHeartRate
      })),
      hrvTrend: sortedHRV.map(h => ({
        date: h.date,
        overnightHRV: h.overnightHRV,
        baseline: `${h.baselineMin}-${h.baselineMax}ms`,
        sevenDayAvg: h.sevenDayAvg
      })),
      athleteProfile: {
        criticalPower: cp,
        wPrime: wPrime
      }
    },
    activityContext: summary ? {
      name: summary.name,
      date: summary.startTime.toISOString().split('T')[0],
      metrics: {
        xPower: summary.xPower,
        relativeIntensity: summary.relativeIntensity,
        bikeScore: summary.bikeScore,
        efficiencyFactor: efficiencyFactor,
        aerobicDecoupling: summary.aerobicDecoupling,
        workKJ: summary.work,
        totalAscent: summary.totalAscent,
        readinessOnDay: activityReadiness // How you felt GOING INTO this ride
      },
      performanceAtTime: currentPMC ? {
        fitness: Math.round(currentPMC.lts),
        fatigue: Math.round(currentPMC.sts),
        form: Math.round(currentPMC.sb)
      } : null,
      stats: {
        durationSeconds: summary.duration,
        distanceMeters: summary.distance,
        avgPower: summary.avgPower,
        maxPower: summary.maxPower,
        avgHR: summary.avgHeartRate,
        maxHR: summary.maxHeartRate,
        avgCadence: summary.avgCadence,
        avgSpeed: summary.avgSpeed
      }
    } : null,
    projections: predictedPMC ? {
      forecastDate: predictedPMC.date,
      fitness: Math.round(predictedPMC.lts),
      fatigue: Math.round(predictedPMC.sts),
      form: Math.round(predictedPMC.sb)
    } : null,
    history: [...history]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 40) // Increased to 40
      .map((h, i) => ({
        index: i + 1,
        name: h.name,
        date: h.date,
        bikeScore: Math.round(h.bikeScore || 0),
        fileName: h.originalFileName || 'N/A'
      }))
  };

  return JSON.stringify(contextData, null, 2);
}


export interface StreamCoachCallbacks {
  onToken: (delta: string, fullText: string) => void;
  signal?: AbortSignal;
}

function buildSystemInstructionWithContext(settings: AISettings, context: string): string {
  if (!context) return settings.systemPrompt;
  return `${settings.systemPrompt}\n\nAthlete Telemetry Context (JSON):\n${context}`;
}

/**
 * Parses Server-Sent Events (SSE) / OpenAI-compatible streaming responses
 * (used by OpenAI, Groq, Ollama, LM Studio, and oMLX).
 * Falls back cleanly to single JSON extraction if a server ignores `stream: true`.
 */
async function readOpenAICompatibleStream(
  response: Response,
  callbacks: StreamCoachCallbacks,
  providerLabel: string
): Promise<string> {
  const contentType = response.headers.get('content-type') || '';

  if (!response.body || (contentType.includes('application/json') && !contentType.includes('event-stream'))) {
    const data = await response.json();
    const text =
      data?.choices?.[0]?.message?.content ??
      data?.message?.content ??
      data?.response ??
      '';
    if (!text) {
      throw new Error(`${providerLabel} returned an empty or malformed response. Check if the model is loaded.`);
    }
    callbacks.onToken(text, text);
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let fullText = '';

  const processLine = (rawLine: string) => {
    const line = rawLine.trim();
    if (!line || line.startsWith(':')) return;

    const payload = line.startsWith('data:') ? line.slice(5).trim() : line;
    if (!payload || payload === '[DONE]') return;

    let parsed: any;
    try {
      parsed = JSON.parse(payload);
    } catch {
      return;
    }

    if (parsed?.error) {
      const errMsg = typeof parsed.error === 'string'
        ? parsed.error
        : parsed.error.message || JSON.stringify(parsed.error);
      throw new Error(`${providerLabel} Stream Error: ${errMsg}`);
    }

    const delta =
      parsed?.choices?.[0]?.delta?.content ??
      parsed?.choices?.[0]?.text ??
      parsed?.message?.content ??
      '';

    if (delta) {
      fullText += delta;
      callbacks.onToken(delta, fullText);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      processLine(line);
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    for (const line of buffer.split(/\r?\n/)) {
      processLine(line);
    }
  }

  if (!fullText) {
    throw new Error(`${providerLabel} returned an empty stream. Check if the model is loaded.`);
  }

  return fullText;
}

/**
 * Handles streaming communication with Cloud-based Gemini
 */
async function callGeminiStream(
  settings: AISettings,
  messages: ChatMessage[],
  systemInstruction: string,
  callbacks: StreamCoachCallbacks
): Promise<string> {
  const apiKey =
    settings.geminiApiKey ||
    import.meta.env.VITE_GEMINI_API_KEY ||
    (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined) ||
    (globalThis as any).GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Gemini API key is required. Please set VITE_GEMINI_API_KEY in .env or provide it in Settings.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const contents = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  const responseStream = await ai.models.generateContentStream({
    model: settings.geminiModel || 'gemini-3.8-flash',
    contents,
    config: {
      systemInstruction,
      ...(callbacks.signal ? { abortSignal: callbacks.signal } : {})
    }
  });

  let fullText = '';
  for await (const chunk of responseStream) {
    if (callbacks.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    const delta = chunk.text ?? '';
    if (delta) {
      fullText += delta;
      callbacks.onToken(delta, fullText);
    }
  }

  if (!fullText) {
    const fallback = 'The coach is speechless.';
    callbacks.onToken(fallback, fallback);
    return fallback;
  }

  return fullText;
}

/**
 * Handles streaming communication with OpenAI
 */
async function callOpenAIStream(
  settings: AISettings,
  messages: ChatMessage[],
  systemInstruction: string,
  callbacks: StreamCoachCallbacks
): Promise<string> {
  const apiKey = settings.openaiApiKey;
  if (!apiKey) throw new Error('OpenAI API key is missing.');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal: callbacks.signal,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: settings.openaiModel || 'gpt-4o',
      messages: [
        { role: 'system', content: systemInstruction },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      temperature: 0.7,
      stream: true
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI Error: ${err}`);
  }

  return readOpenAICompatibleStream(response, callbacks, 'OpenAI');
}

/**
 * Handles streaming communication with Anthropic (SSE)
 */
async function callAnthropicStream(
  settings: AISettings,
  messages: ChatMessage[],
  systemInstruction: string,
  callbacks: StreamCoachCallbacks
): Promise<string> {
  const apiKey = settings.anthropicApiKey;
  if (!apiKey) throw new Error('Anthropic API key is missing.');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: callbacks.signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'dangerously-allow-browser': 'true' // In a production browser app, you should proxy this, but for a local/BYOK app it is common
    },
    body: JSON.stringify({
      model: settings.anthropicModel || 'claude-3-5-sonnet-20240620',
      system: systemInstruction,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: 1024,
      temperature: 0.7,
      stream: true
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic Error: ${err}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!response.body || (contentType.includes('application/json') && !contentType.includes('event-stream'))) {
    const data = await response.json();
    const text = data?.content?.[0]?.text || '';
    if (!text) throw new Error('Anthropic returned an empty response.');
    callbacks.onToken(text, text);
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let fullText = '';

  const processLine = (rawLine: string) => {
    const line = rawLine.trim();
    if (!line.startsWith('data:')) return;

    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') return;

    let parsed: any;
    try {
      parsed = JSON.parse(payload);
    } catch {
      return;
    }

    if (parsed?.type === 'error') {
      throw new Error(`Anthropic Error: ${parsed.error?.message || JSON.stringify(parsed.error)}`);
    }

    if (parsed?.type === 'content_block_delta' && parsed?.delta?.type === 'text_delta' && parsed.delta.text) {
      const delta: string = parsed.delta.text;
      fullText += delta;
      callbacks.onToken(delta, fullText);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      processLine(line);
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    for (const line of buffer.split(/\r?\n/)) {
      processLine(line);
    }
  }

  if (!fullText) {
    throw new Error('Anthropic returned an empty stream.');
  }

  return fullText;
}

/**
 * Handles streaming communication with Groq (OpenAI-compatible)
 */
async function callGroqStream(
  settings: AISettings,
  messages: ChatMessage[],
  systemInstruction: string,
  callbacks: StreamCoachCallbacks
): Promise<string> {
  const apiKey = settings.groqApiKey;
  if (!apiKey) throw new Error('Groq API key is missing.');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    signal: callbacks.signal,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: settings.groqModel || 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemInstruction },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      temperature: 0.7,
      stream: true
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq Error: ${err}`);
  }

  return readOpenAICompatibleStream(response, callbacks, 'Groq');
}

/**
 * Handles streaming communication with Local OpenAI-compatible APIs (Ollama / LM Studio / oMLX)
 */
async function callLocalAIStream(
  settings: AISettings,
  messages: ChatMessage[],
  systemInstruction: string,
  callbacks: StreamCoachCallbacks
): Promise<string> {
  const provider = settings.provider;
  const rawUrl =
    provider === 'ollama' ? settings.ollamaUrl :
    provider === 'omlx' ? (settings.omlxUrl || 'http://127.0.0.1:8000') :
    settings.lmStudioUrl;
  const model =
    provider === 'ollama' ? settings.ollamaModel :
    provider === 'omlx' ? (settings.omlxModel || 'mlx-community/gemma-3-4b-it-4bit') :
    settings.lmStudioModel;
  const hostName =
    provider === 'ollama' ? 'Ollama' :
    provider === 'omlx' ? 'oMLX' :
    'LM Studio';

  const baseUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
  const url = `${baseUrl}/v1/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (provider === 'omlx' && settings.omlxApiKey?.trim()) {
    headers['Authorization'] = `Bearer ${settings.omlxApiKey.trim()}`;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: callbacks.signal,
      headers,
      body: JSON.stringify({
        model: model || 'local-model',
        messages: [
          { role: 'system', content: systemInstruction },
          ...messages.map(m => ({ role: m.role, content: m.content }))
        ],
        temperature: 0.7,
        stream: true
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`${hostName} error (${response.status}): ${err}`);
    }

    return await readOpenAICompatibleStream(response, callbacks, hostName);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    if (err instanceof Error) {
      if (err.message.includes('Failed to fetch')) {
        throw new Error(`Could not connect to ${hostName} at ${rawUrl}. Ensure the server is running and CORS is enabled.`);
      }
      throw err;
    }
    throw new Error('An unknown error occurred while talking to the local coach.');
  }
}

/**
 * Streaming entry point for Velo Coach across all online and local providers.
 */
export async function streamCoachResponse(
  settings: AISettings,
  messages: ChatMessage[],
  context: string,
  callbacks: StreamCoachCallbacks
): Promise<string> {
  const systemInstruction = buildSystemInstructionWithContext(settings, context);

  try {
    switch (settings.provider) {
      case 'gemini':
        return await callGeminiStream(settings, messages, systemInstruction, callbacks);
      case 'openai':
        return await callOpenAIStream(settings, messages, systemInstruction, callbacks);
      case 'anthropic':
        return await callAnthropicStream(settings, messages, systemInstruction, callbacks);
      case 'groq':
        return await callGroqStream(settings, messages, systemInstruction, callbacks);
      case 'ollama':
      case 'lm-studio':
      case 'omlx':
        return await callLocalAIStream(settings, messages, systemInstruction, callbacks);
      default:
        throw new Error(`Unsupported AI provider: ${settings.provider}`);
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    console.error('Coach API Error:', error);
    throw error;
  }
}

/**
 * Convenience non-streaming wrapper preserved for callers expecting a resolved string.
 */
export async function getCoachResponse(
  settings: AISettings,
  messages: ChatMessage[],
  context: string
): Promise<string> {
  return streamCoachResponse(settings, messages, context, {
    onToken: () => {}
  });
}
