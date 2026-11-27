import { GoogleGenAI } from '@google/genai';
import { Channel, invoke } from '@tauri-apps/api/core';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { AISettings, ActivitySummary, PMCDataPoint, ChatMessage, HistoricalActivity, SleepMetric, HRVMetric } from '../types';
import { calculateVeloReadiness, calculateStandardReadiness } from './wellnessService';
import { getEffectiveSystemPrompt } from './promptPresets';
import { isTauriEnvironment } from './garmin/garminFetchWrapper';

type RustLoopbackStreamEvent =
  | { event: 'meta'; data: { status: number; contentType: string } }
  | { event: 'chunk'; data: number[] };

function isLoopbackHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      (parsed.hostname === '127.0.0.1' ||
        parsed.hostname === 'localhost' ||
        parsed.hostname === '[::1]' ||
        parsed.hostname === '::1')
    );
  } catch {
    return false;
  }
}

/**
 * Streams an HTTP POST directly via the native Rust `local_ai_chat_stream` command
 * (reqwest with zero Origin/Referer/Sec-Fetch-* headers) and wraps it in a standard Response.
 */
async function fetchViaRustLoopback(
  url: string,
  body: string,
  apiKey?: string,
  signal?: AbortSignal
): Promise<Response> {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const requestId = `local-ai-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  let metaSettled = false;
  let streamClosed = false;
  let resolveMeta!: (res: Response) => void;
  let rejectMeta!: (err: unknown) => void;
  let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;

  const metaPromise = new Promise<Response>((resolve, reject) => {
    resolveMeta = resolve;
    rejectMeta = reject;
  });

  const bodyStream = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller;
    },
    cancel() {
      streamClosed = true;
      void invoke('cancel_local_ai_stream', { requestId }).catch(() => {});
    }
  });

  const onEvent = new Channel<RustLoopbackStreamEvent>();
  onEvent.onmessage = (msg) => {
    if (msg.event === 'meta') {
      if (!metaSettled) {
        metaSettled = true;
        const { status, contentType } = msg.data;
        const responseBody = [101, 103, 204, 205, 304].includes(status) ? null : bodyStream;
        const headers = new Headers();
        if (contentType) headers.set('Content-Type', contentType);
        resolveMeta(new Response(responseBody, { status, headers }));
      }
    } else if (msg.event === 'chunk') {
      if (!streamClosed && streamController) {
        try {
          streamController.enqueue(new Uint8Array(msg.data));
        } catch {
          // Stream already closed/cancelled
        }
      }
    }
  };

  const onAbort = () => {
    void invoke('cancel_local_ai_stream', { requestId }).catch(() => {});
    const abortErr = new DOMException('Aborted', 'AbortError');
    if (!metaSettled) {
      metaSettled = true;
      rejectMeta(abortErr);
    }
    if (!streamClosed && streamController) {
      streamClosed = true;
      try {
        streamController.error(abortErr);
      } catch {
        // Ignore if already closed
      }
    }
  };

  signal?.addEventListener('abort', onAbort, { once: true });

  invoke('local_ai_chat_stream', {
    requestId,
    url,
    body,
    apiKey: apiKey?.trim() ? apiKey.trim() : null,
    onEvent
  })
    .then(() => {
      signal?.removeEventListener('abort', onAbort);
      if (!metaSettled) {
        metaSettled = true;
        rejectMeta(new Error('Local AI server closed connection without sending HTTP headers.'));
        return;
      }
      if (!streamClosed && streamController) {
        streamClosed = true;
        try {
          streamController.close();
        } catch {
          // Ignore if already closed
        }
      }
    })
    .catch((err) => {
      signal?.removeEventListener('abort', onAbort);
      if (!metaSettled) {
        metaSettled = true;
        rejectMeta(err);
        return;
      }
      if (!streamClosed && streamController) {
        streamClosed = true;
        try {
          streamController.error(err);
        } catch {
          // Ignore if already closed
        }
      }
    });

  return metaPromise;
}

/**
 * Returns true when Velo Coach is targeting Apple's on-device Foundation Model (`system`),
 * which enforces a strict 4,096-token transcript limit.
 */
export function isCompactAppleFmSystem(aiSettings?: AISettings | null): boolean {
  if (!aiSettings || aiSettings.provider !== 'apple-fm') return false;
  const model = (aiSettings.appleFmModel || 'system').trim().toLowerCase();
  return model === 'system';
}

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
  const compactMode = isCompactAppleFmSystem(aiSettings);
  const effectiveLookbackDays = compactMode
    ? Math.min(wellnessContextDays, 3)
    : wellnessContextDays;

  // 1. Wellness Trends (Newest First)
  const sortedSleep = [...sleepHistory].sort((a, b) => b.date.localeCompare(a.date)).slice(0, effectiveLookbackDays);
  const sortedHRV = [...hrvHistory].sort((a, b) => b.date.localeCompare(a.date)).slice(0, effectiveLookbackDays);
  
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

  // 4. Rolling 7-Day & 28-Day Training Block Rollups (Pre-computed so smaller local models do zero math)
  const nowMs = Date.now();
  const msInDay = 86400000;
  const sevenDaysAgoMs = nowMs - 7 * msInDay;
  const twentyEightDaysAgoMs = nowMs - 28 * msInDay;

  let rides7d = 0;
  let dist7d = 0;
  let dur7d = 0;
  let bikeScore7d = 0;
  let ascent7d = 0;
  let work7d = 0;

  let rides28d = 0;
  let dist28d = 0;
  let dur28d = 0;
  let bikeScore28d = 0;
  let ascent28d = 0;
  let work28d = 0;

  for (const act of history) {
    if (!act?.date && !act?.startTime) continue;
    const actTime = act.startTime
      ? new Date(act.startTime).getTime()
      : new Date(`${act.date}T12:00:00`).getTime();
    if (isNaN(actTime)) continue;

    if (actTime >= sevenDaysAgoMs) {
      rides7d++;
      dist7d += act.distance || 0;
      dur7d += act.duration || 0;
      bikeScore7d += act.bikeScore || 0;
      ascent7d += act.totalAscent || 0;
      work7d += act.work || 0;
    }
    if (actTime >= twentyEightDaysAgoMs) {
      rides28d++;
      dist28d += act.distance || 0;
      dur28d += act.duration || 0;
      bikeScore28d += act.bikeScore || 0;
      ascent28d += act.totalAscent || 0;
      work28d += act.work || 0;
    }
  }

  const compactLatestSleep = latestSleep
    ? {
        date: latestSleep.date,
        score: latestSleep.score,
        durationMinutes: latestSleep.duration,
        sleepNeedMinutes: latestSleep.sleepNeed,
        restingHR: latestSleep.restingHeartRate
      }
    : null;

  const compactLatestHRV = sortedHRV[0]
    ? {
        date: sortedHRV[0].date,
        overnightHRV: sortedHRV[0].overnightHRV,
        baseline: `${sortedHRV[0].baselineMin}-${sortedHRV[0].baselineMax}ms`,
        sevenDayAvg: sortedHRV[0].sevenDayAvg
      }
    : null;

  const sortedHistory = [...history].sort((a, b) => b.date.localeCompare(a.date));

  const contextData = {
    system: {
      date: new Date().toISOString().split('T')[0],
      units: compactMode ? "Metric" : "Metric (KM, Watts, m, kg)",
      lookbackDays: effectiveLookbackDays,
      readinessModel: isExperimental
        ? "Velo Readiness (Experimental 4-Pillar)"
        : "Standard Readiness (Garmin-aligned 5-Pillar)",
      ...(compactMode
        ? { contextProfile: "compact-4k" }
        : {
            readinessFormula: isExperimental
              ? "Base = (Sleep*0.35 + Recovery*0.25 + HRV*0.20 + Load*0.20). Adjusted by WorstPillar suppression and debt/spike penalties."
              : "Composite = (SleepScore*0.30 + HRVStatus*0.25 + DurationNeed*0.15 + RestingHR*0.15 + FormTSB*0.15). Scale 0-100."
          })
    },
    athleteCurrentState: {
      readiness: athleteGlobalReadiness, // The "remarkably higher" UI number
      performance: athleteCurrentPMC ? {
        fitness: Math.round(athleteCurrentPMC.lts),
        fatigue: Math.round(athleteCurrentPMC.sts),
        form: Math.round(athleteCurrentPMC.sb)
      } : null,
      latestWellness: compactMode
        ? {
            sleep: compactLatestSleep,
            hrv: compactLatestHRV
          }
        : {
            sleep: latestSleep,
            hrv: sortedHRV[0] || null
          },
      sleepTrend: sortedSleep.map(s => ({
        date: s.date,
        score: s.score,
        durationMinutes: s.duration,
        ...(compactMode ? {} : { quality: s.quality }),
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
    trainingBlock7Days: {
      totalRides: rides7d,
      totalKm: Number((dist7d / 1000).toFixed(1)),
      totalHours: Number((dur7d / 3600).toFixed(1)),
      totalBikeScore: Math.round(bikeScore7d),
      totalAscentMeters: Math.round(ascent7d),
      totalWorkKJ: Math.round(work7d)
    },
    trainingBlock28Days: {
      totalRides: rides28d,
      totalKm: Number((dist28d / 1000).toFixed(1)),
      totalHours: Number((dur28d / 3600).toFixed(1)),
      totalBikeScore: Math.round(bikeScore28d),
      totalAscentMeters: Math.round(ascent28d),
      totalWorkKJ: Math.round(work28d),
      weeklyAvgKm: Number(((dist28d / 1000) / 4).toFixed(1)),
      weeklyAvgHours: Number(((dur28d / 3600) / 4).toFixed(1)),
      weeklyAvgBikeScore: Math.round(bikeScore28d / 4)
    },
    activityContext: summary ? {
      name: summary.name,
      date: summary.startTime.toISOString().split('T')[0],
      metrics: {
        xPower: compactMode ? Math.round(summary.xPower || 0) : summary.xPower,
        relativeIntensity: Number((summary.relativeIntensity || 0).toFixed(2)),
        bikeScore: Math.round(summary.bikeScore || 0),
        efficiencyFactor: efficiencyFactor,
        aerobicDecoupling: compactMode ? Number((summary.aerobicDecoupling || 0).toFixed(1)) : summary.aerobicDecoupling,
        workKJ: Math.round(summary.work || 0),
        totalAscent: Math.round(summary.totalAscent || 0),
        readinessOnDay: compactMode && activityReadiness
          ? { score: activityReadiness.score }
          : activityReadiness // How you felt GOING INTO this ride
      },
      performanceAtTime: currentPMC ? {
        fitness: Math.round(currentPMC.lts),
        fatigue: Math.round(currentPMC.sts),
        form: Math.round(currentPMC.sb)
      } : null,
      stats: {
        durationSeconds: Math.round(summary.duration || 0),
        distanceMeters: Math.round(summary.distance || 0),
        avgPower: Math.round(summary.avgPower || 0),
        maxPower: Math.round(summary.maxPower || 0),
        avgHR: Math.round(summary.avgHeartRate || 0),
        maxHR: Math.round(summary.maxHeartRate || 0),
        avgCadence: Math.round(summary.avgCadence || 0),
        avgSpeed: Number((summary.avgSpeed || 0).toFixed(1))
      }
    } : null,
    projections: predictedPMC ? {
      forecastDate: predictedPMC.date,
      fitness: Math.round(predictedPMC.lts),
      fatigue: Math.round(predictedPMC.sts),
      form: Math.round(predictedPMC.sb)
    } : null,
    history: (compactMode ? sortedHistory.slice(0, 5) : sortedHistory.slice(0, 40)).map((h, i) =>
      compactMode
        ? {
            name: h.name,
            date: h.date,
            bikeScore: Math.round(h.bikeScore || 0)
          }
        : {
            index: i + 1,
            name: h.name,
            date: h.date,
            bikeScore: Math.round(h.bikeScore || 0),
            fileName: h.originalFileName || 'N/A'
          }
    )
  };

  return compactMode ? JSON.stringify(contextData) : JSON.stringify(contextData, null, 2);
}


export interface StreamCoachCallbacks {
  onToken: (delta: string, fullText: string) => void;
  signal?: AbortSignal;
}

function buildSystemInstructionWithContext(settings: AISettings, context: string): string {
  const activePrompt = getEffectiveSystemPrompt(settings);
  if (!context) return activePrompt;
  return `${activePrompt}\n\nAthlete Telemetry Context (JSON):\n${context}`;
}

/**
 * Parses Server-Sent Events (SSE) / OpenAI-compatible streaming responses
 * (used by OpenAI, Groq, Ollama, LM Studio, oMLX, and Apple FM).
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
 * Handles streaming communication with Local OpenAI-compatible APIs (Ollama / LM Studio / oMLX / Apple FM)
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
    provider === 'apple-fm' ? (settings.appleFmUrl || 'http://127.0.0.1:1976') :
    settings.lmStudioUrl;
  const model =
    provider === 'ollama' ? settings.ollamaModel :
    provider === 'omlx' ? (settings.omlxModel || 'mlx-community/gemma-3-4b-it-4bit') :
    provider === 'apple-fm' ? (settings.appleFmModel || 'system') :
    settings.lmStudioModel;
  const hostName =
    provider === 'ollama' ? 'Ollama' :
    provider === 'omlx' ? 'oMLX' :
    provider === 'apple-fm' ? 'Apple FM' :
    'LM Studio';

  const baseUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
  const url = `${baseUrl}/v1/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (provider === 'omlx' && settings.omlxApiKey?.trim()) {
    headers['Authorization'] = `Bearer ${settings.omlxApiKey.trim()}`;
  }

  const compactMode = isCompactAppleFmSystem(settings);
  let scopedMessages = compactMode
    ? messages.slice(-4).map(m => ({ role: m.role, content: m.content }))
    : messages.map(m => ({ role: m.role, content: m.content }));

  // Guard Apple FM on-device 4,096-token limit by trimming older turns if cumulative chars grow too large
  if (compactMode) {
    const MAX_COMPACT_INPUT_CHARS = 9000;
    const totalChars = () =>
      systemInstruction.length + scopedMessages.reduce((acc, m) => acc + m.content.length, 0);
    while (scopedMessages.length > 1 && totalChars() > MAX_COMPACT_INPUT_CHARS) {
      scopedMessages = scopedMessages.slice(1);
    }
  }

  const inTauri = isTauriEnvironment();
  const payloadBody = JSON.stringify({
    model: model || 'local-model',
    messages: [
      { role: 'system', content: systemInstruction },
      ...scopedMessages
    ],
    temperature: 0.7,
    stream: true
  });
  const omlxBearerKey = provider === 'omlx' ? settings.omlxApiKey : undefined;

  try {
    let response: Response;
    if (inTauri && isLoopbackHttpUrl(url)) {
      try {
        response = await fetchViaRustLoopback(url, payloadBody, omlxBearerKey, callbacks.signal);
      } catch (rustErr) {
        const rustMsg =
          typeof rustErr === 'string'
            ? rustErr
            : rustErr instanceof Error
            ? rustErr.message
            : '';
        if (rustMsg.toLowerCase().includes('not found')) {
          response = await (tauriFetch as unknown as typeof fetch)(url, {
            method: 'POST',
            signal: callbacks.signal,
            headers,
            body: payloadBody
          });
        } else {
          throw rustErr;
        }
      }
    } else {
      const httpFetch: typeof fetch = inTauri
        ? (tauriFetch as unknown as typeof fetch)
        : fetch;
      response = await httpFetch(url, {
        method: 'POST',
        signal: callbacks.signal,
        headers,
        body: payloadBody
      });
    }

    if (!response.ok) {
      const err = await response.text();
      if (response.status === 403 && !inTauri && err.toLowerCase().includes('cross-site')) {
        throw new Error(
          `${hostName} blocked the browser's cross-site request (HTTP 403). Use the VeloAnalytics macOS Desktop (Tauri) app or route through a local CORS-stripping reverse proxy.`
        );
      }
      throw new Error(`${hostName} error (${response.status}): ${err}`);
    }

    return await readOpenAICompatibleStream(response, callbacks, hostName);
  } catch (err) {
    console.error(`[VeloAnalytics ${hostName}] Raw local coach error:`, err);
    const rawMessage =
      err instanceof Error
        ? err.message
        : typeof err === 'string'
        ? err
        : err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string'
        ? (err as any).message
        : (() => {
            try {
              return JSON.stringify(err);
            } catch {
              return String(err);
            }
          })();

    const lowerMsg = rawMessage.toLowerCase();

    if (
      callbacks.signal?.aborted ||
      (err instanceof DOMException && err.name === 'AbortError') ||
      (err instanceof Error && err.name === 'AbortError') ||
      lowerMsg.includes('aborted') ||
      lowerMsg.includes('request cancelled')
    ) {
      throw new DOMException('Aborted', 'AbortError');
    }

    if (compactMode && (lowerMsg.includes('exceeded the model\'s context size') || lowerMsg.includes('context size'))) {
      throw new Error(
        `Apple FM (system) exceeded its 4,096-token on-device limit. Clear the Coach chat, switch to the Local Analyst (8GB) prompt preset, or choose pcc (Apple Cloud) in Settings > Intelligence.`
      );
    }

    if (
      rawMessage.includes('Failed to fetch') ||
      lowerMsg.includes('connection refused') ||
      lowerMsg.includes('error sending request for url')
    ) {
      if (provider === 'apple-fm') {
        throw new Error(
          `Could not connect to Apple FM at ${rawUrl}. Ensure 'fm serve' is running on macOS 27+ (Apple Silicon). (${rawMessage})`
        );
      }
      throw new Error(`Could not connect to ${hostName} at ${rawUrl}. Ensure the server is running and accessible. (${rawMessage})`);
    }

    if (rawMessage && rawMessage !== '[object Object]' && rawMessage !== 'undefined' && rawMessage !== 'null') {
      throw new Error(rawMessage.startsWith(hostName) ? rawMessage : `${hostName}: ${rawMessage}`);
    }

    throw new Error(`An unknown error occurred while talking to ${hostName} at ${url}.`);
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
      case 'apple-fm':
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
