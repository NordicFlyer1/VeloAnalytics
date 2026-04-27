import { GoogleGenAI } from '@google/genai';
import { AISettings, ActivitySummary, PMCDataPoint, ChatMessage, HistoricalActivity } from '../types';

/**
 * Distills complex activity and performance data into a concise text format for the LLM.
 */
export function buildCoachContext(
  summary: ActivitySummary | null,
  currentPMC: PMCDataPoint | null,
  history: HistoricalActivity[],
  cp: number,
  wPrime: number
): string {
  let context = `Athlete's Physiological Profile & Context:\n`;
  context += `- Critical Power (CP): ${cp}W\n`;
  context += `- W' Balance (Anaerobic Capacity): ${wPrime}J\n`;
  
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
  } else {
    context += `\n- No specific activity currently loaded for deep analysis.\n`;
  }

  if (currentPMC) {
    context += `\nPerformance Management (Long Term):
- Fitness (CTL/LTS): ${Math.round(currentPMC.lts)} (6-week average load)
- Fatigue (ATL/STS): ${Math.round(currentPMC.sts)} (7-day average load)
- Form (TSB/SB): ${Math.round(currentPMC.sb)} (Freshness index)\n`;
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
