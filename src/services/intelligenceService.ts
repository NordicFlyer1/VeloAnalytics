import { GoogleGenAI } from '@google/genai';
import { AISettings, ActivitySummary, PMCDataPoint, ChatMessage, HistoricalActivity, SleepMetric, HRVMetric } from '../types';
import { calculateVeloReadiness } from './wellnessService';

/**
 * Distills complex activity and performance data into a concise text format for the LLM.
 */
export function buildCoachContext(
  summary: ActivitySummary | null,
  currentPMC: PMCDataPoint | null,
  predictedPMC: PMCDataPoint | null,
  history: HistoricalActivity[],
  sleepHistory: SleepMetric[],
  hrvHistory: HRVMetric[],
  cp: number,
  wPrime: number,
  aiSettings: AISettings,
  wellnessContextDays: number = 7
): string {
  let context = `Athlete's Physiological Profile & Context:\n`;
  context += `- Current System Date: ${new Date().toISOString().split('T')[0]}\n`;
  context += `- Critical Power (CP): ${cp}W\n`;
  context += `- W' Balance (Anaerobic Capacity): ${wPrime}J\n`;
  context += `- Wellness Lookback Window: ${wellnessContextDays} days\n`;

  // Calculate and add Readiness context
  const latestHRV = hrvHistory.length > 0 ? [...hrvHistory].sort((a, b) => b.date.localeCompare(a.date))[0] : null;
  const latestSleep = sleepHistory.length > 0 ? [...sleepHistory].sort((a, b) => b.date.localeCompare(a.date))[0] : null;
  
  if (currentPMC) {
    const rawReadiness = latestSleep?.readinessScore;
    const veloReadiness = calculateVeloReadiness(
      latestSleep,
      latestHRV,
      currentPMC.sb,
      currentPMC.sts,
      summary?.bikeScore || 0
    );

    context += `\nReadiness & Recovery Status (Targeting Latest Date: ${currentPMC.date}):\n`;
    if (rawReadiness !== undefined) {
      context += `- Source Readiness (from ${latestSleep?.date || 'N/A'}): ${rawReadiness}/100\n`;
    }
    context += `- Current Velo-Readiness (as of ${currentPMC.date}): ${veloReadiness.score}/100\n`;
    if (veloReadiness.penalties.length > 0) {
      context += `- Active Recovery Penalties: ${veloReadiness.penalties.join(', ')}\n`;
    }
  }

  // Add Wellness/Recovery trends
  if (sleepHistory.length > 0 || hrvHistory.length > 0) {
    context += `\nWellness & Recovery (${wellnessContextDays}-Day Trends - NEWEST/LATEST DATA POINT FIRST):\n`;
    
    if (sleepHistory.length > 0) {
      const recentSleep = [...sleepHistory].sort((a, b) => b.date.localeCompare(a.date)).slice(0, wellnessContextDays);
      context += `- Recent Sleep Sequence (Newest First, starting ${recentSleep[0]?.date}): ${recentSleep.map(s => `${s.score} (${s.quality})`).join(', ')}\n`;
      const avgDuration = recentSleep.reduce((acc, s) => acc + s.duration, 0) / recentSleep.length;
      context += `- Avg Duration (${wellnessContextDays}d): ${(avgDuration / 60).toFixed(1)} hours\n`;
    }

    if (hrvHistory.length > 0) {
      const recentHRV = [...hrvHistory].sort((a, b) => b.date.localeCompare(a.date)).slice(0, wellnessContextDays);
      context += `- Recent HRV Sequence (Newest First, starting ${recentHRV[0]?.date}): ${recentHRV.map(h => `${h.overnightHRV}ms`).join(', ')}\n`;
      const latest = recentHRV[0];
      context += `- Latest Baseline Range: ${latest.baselineMin}-${latest.baselineMax}ms\n`;
    }
  }
  
  if (summary) {
    context += `\nLatest Activity Details (${summary.name}):\n`;
    context += `- Core: ${(summary.distance / 1000).toFixed(1)}km, ${Math.round(summary.duration / 60)}min duration\n`;
    context += `- Intensity: xPower ${Math.round(summary.xPower || 0)}W, RI ${summary.relativeIntensity?.toFixed(2)}, BikeScore ${Math.round(summary.bikeScore || 0)}\n`;
    context += `- Work: ${summary.work?.toFixed(0)} KJ total energy expenditure\n`;
    
    context += `- Power: Avg ${Math.round(summary.avgPower || 0)}W, Max ${Math.round(summary.maxPower || 0)}W\n`;
    if (summary.avgHeartRate) {
      context += `- Heart Rate: Avg ${Math.round(summary.avgHeartRate)} BPM, Max ${Math.round(summary.maxHeartRate || 0)} BPM\n`;
    }
    if (summary.avgCadence) {
      context += `- Cadence: Avg ${Math.round(summary.avgCadence)} RPM, Max ${Math.round(summary.maxCadence || 0)} RPM\n`;
    }
    if (summary.avgSpeed) {
      context += `- Speed: Avg ${summary.avgSpeed.toFixed(1)} km/h, Max ${(summary.maxSpeed || 0).toFixed(1)} km/h\n`;
    }
    if (summary.totalAscent !== undefined) {
      context += `- Elevation: Total Ascent ${Math.round(summary.totalAscent)}m\n`;
    }
    if (summary.aerobicDecoupling !== undefined) {
      context += `- Efficiency: Aerobic Decoupling (Pw:HR) ${summary.aerobicDecoupling.toFixed(1)}%\n`;
    }
    
    // Add Efficiency Factor (EF)
    if (summary.xPower && summary.avgHeartRate && summary.avgHeartRate > 0) {
      const ef = (summary.xPower / summary.avgHeartRate).toFixed(2);
      context += `- Efficiency Factor (EF): ${ef} (xPower per BPM)\n`;
    }
  } else {
    context += `\n- No specific activity currently loaded for deep analysis.\n`;
  }

  if (currentPMC) {
    context += `\nPerformance Management (PMC Status):
- Fitness (CTL/LTS): ${Math.round(currentPMC.lts)} (6-week average load)
- Fatigue (ATL/STS): ${Math.round(currentPMC.sts)} (7-day average load)
- Form (TSB/SB): ${Math.round(currentPMC.sb)} (Freshness index)\n`;
    
    if (predictedPMC && predictedPMC.date !== currentPMC.date) {
      context += `\nProjected Status (in 14 days with zero load):
- Fitness Decay: ${Math.round(predictedPMC.lts)}
- Fatigue Decay: ${Math.round(predictedPMC.sts)}
- Form Gain: ${Math.round(predictedPMC.sb)}\n`;
    }
  }

  context += `\nHistorical Ride Library (Recent 20):\n`;
  // Limit to most recent 20 for context length safety
  const recentHistory = [...history].slice(0, 20);
  recentHistory.forEach((item, idx) => {
    // Note the user's naming scheme in the context
    context += `${idx + 1}. Name: "${item.name}", File: "${item.originalFileName || 'N/A'}", Date: ${item.date}, BikeScore: ${Math.round(item.bikeScore)}\n`;
  });

  if (history.length > 20) {
    context += `... and ${history.length - 20} more archived activities.\n`;
  }

  context += `\nNote: If the user asks about a specific file or name (e.g., "MyWhoosh" or a date like "2026_04_13"), use the index above to identify it. All summaries represent real physical data.\n`;
  
  return context;
}

/**
 * Handles communication with Cloud-based Gemini
 */
async function callGemini(settings: AISettings, messages: ChatMessage[]): Promise<string> {
  // Check settings first, then import.meta.env, then process.env (for NodeJS/Build time)
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

  const result = await ai.models.generateContent({
    model: settings.geminiModel || 'gemini-3-flash-preview',
    contents: contents,
    config: {
      systemInstruction: settings.systemPrompt
    }
  });

  return result.text || 'The coach is speechless.';
}

/**
 * Handles communication with OpenAI
 */
async function callOpenAI(settings: AISettings, messages: ChatMessage[]): Promise<string> {
  const apiKey = settings.openaiApiKey;
  if (!apiKey) throw new Error('OpenAI API key is missing.');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: settings.openaiModel || 'gpt-4o',
      messages: [
        { role: 'system', content: settings.systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      temperature: 0.7,
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI Error: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Handles communication with Anthropic
 */
async function callAnthropic(settings: AISettings, messages: ChatMessage[]): Promise<string> {
  const apiKey = settings.anthropicApiKey;
  if (!apiKey) throw new Error('Anthropic API key is missing.');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'dangerously-allow-browser': 'true' // In a production browser app, you should proxy this, but for a local/BYOK app it is common
    },
    body: JSON.stringify({
      model: settings.anthropicModel || 'claude-3-5-sonnet-20240620',
      system: settings.systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: 1024,
      temperature: 0.7,
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic Error: ${err}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

/**
 * Handles communication with Local OpenAI-compatible APIs (Ollama / LM Studio)
 */
async function callLocalAI(settings: AISettings, messages: ChatMessage[]): Promise<string> {
  const provider = settings.provider;
  const rawUrl = provider === 'ollama' ? settings.ollamaUrl : settings.lmStudioUrl;
  const model = provider === 'ollama' ? settings.ollamaModel : settings.lmStudioModel;
  
  const baseUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
  const url = `${baseUrl}/v1/chat/completions`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'local-model',
        messages: [
          { role: 'system', content: settings.systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content }))
        ],
        temperature: 0.7,
        stream: false, // Ensure we get a single JSON object back
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Local AI error (${response.status}): ${err}`);
    }

    const data = await response.json();
    
    if (!data || !data.choices || !data.choices[0]?.message?.content) {
      console.error('Unexpected Local AI Response:', data);
      const hostName = provider === 'ollama' ? 'Ollama' : 'LM Studio';
      throw new Error(`${hostName} returned an empty or malformed response. Check if the model is loaded.`);
    }

    return data.choices[0].message.content;
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('Failed to fetch')) {
        const hostName = provider === 'ollama' ? 'Ollama' : 'LM Studio';
        throw new Error(`Could not connect to ${hostName} at ${rawUrl}. Ensure the server is started and "CORS" is enabled.`);
      }
      throw err;
    }
    throw new Error('An unknown error occurred while talking to the local coach.');
  }
}

/**
 * Main entry point for the coach
 */
export async function getCoachResponse(
  settings: AISettings, 
  messages: ChatMessage[],
  context: string
): Promise<string> {
  // Inject context into the last user message
  const messagesWithContext = [...messages];
  if (messages.length > 0) {
    const lastMsgIdx = messagesWithContext.length - 1;
    const lastMsg = { ...messagesWithContext[lastMsgIdx] };
    if (lastMsg.role === 'user') {
      lastMsg.content = `Context Info:\n${context}\n\nUser Question: ${lastMsg.content}`;
      messagesWithContext[lastMsgIdx] = lastMsg;
    }
  }

  try {
    switch (settings.provider) {
      case 'gemini':
        return await callGemini(settings, messagesWithContext);
      case 'openai':
        return await callOpenAI(settings, messagesWithContext);
      case 'anthropic':
        return await callAnthropic(settings, messagesWithContext);
      case 'ollama':
      case 'lm-studio':
        return await callLocalAI(settings, messagesWithContext);
      default:
        throw new Error(`Unsupported AI provider: ${settings.provider}`);
    }
  } catch (error) {
    console.error('Coach API Error:', error);
    throw error;
  }
}
