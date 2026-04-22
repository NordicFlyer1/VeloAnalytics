import { GoogleGenAI } from '@google/genai';
import { AISettings, ActivitySummary, PMCDataPoint, ChatMessage } from '../types';

/**
 * Distills complex activity and performance data into a concise text format for the LLM.
 */
export function buildCoachContext(
  summary: ActivitySummary | null,
  currentPMC: PMCDataPoint | null,
  historyCount: number
): string {
  let context = `Athlete's Current Context:\n`;
  
  if (summary) {
    context += `- Latest Ride (${summary.name}): ${summary.startTime.toLocaleDateString()}\n`;
    context += `  - Distance: ${(summary.distance / 1000).toFixed(1)}km, Duration: ${Math.round(summary.duration / 60)}min\n`;
    context += `  - Intensity: NP ${Math.round(summary.xPower || 0)}W, RI ${summary.relativeIntensity?.toFixed(2)}, BikeScore ${Math.round(summary.bikeScore || 0)}\n`;
    if (summary.aerobicDecoupling !== undefined) {
      context += `  - Aerobic Decoupling: ${summary.aerobicDecoupling.toFixed(1)}% (Pw:HR)\n`;
    }
  } else {
    context += `- No latest ride loaded.\n`;
  }

  if (currentPMC) {
    context += `- Performance Indices: Fitness (CTL/LTS): ${Math.round(currentPMC.lts)}, Fatigue (ATL/STS): ${Math.round(currentPMC.sts)}, Form (TSB/SB): ${Math.round(currentPMC.sb)}\n`;
  }

  context += `- Activity History Count: ${historyCount} sessions.\n`;
  
  return context;
}

/**
 * Handles communication with Cloud-based Gemini
 */
async function callGemini(settings: AISettings, messages: ChatMessage[]): Promise<string> {
  // Check priority: 1. Manual setting in UI, 2. Vite Env Var, 3. Process Env (for AI Studio)
  const apiKey = 
    settings.geminiApiKey || 
    (import.meta as any).env?.VITE_GEMINI_API_KEY || 
    (process.env.GEMINI_API_KEY as string);
  
  if (!apiKey) {
    throw new Error('Gemini API key is required. Please set VITE_GEMINI_API_KEY in .env or provide it in Settings.');
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Convert messages to content format
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
 * Handles communication with Local OpenAI-compatible APIs (Ollama / LM Studio)
 */
async function callLocalAI(settings: AISettings, messages: ChatMessage[]): Promise<string> {
  const baseUrl = settings.localUrl.endsWith('/') ? settings.localUrl.slice(0, -1) : settings.localUrl;
  const url = `${baseUrl}/v1/chat/completions`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: settings.localModel || 'local-model',
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
      throw new Error('Local AI returned an empty or malformed response. Check if the model is loaded in LM Studio.');
    }

    return data.choices[0].message.content;
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('Failed to fetch')) {
        throw new Error(`Could not connect to LM Studio at ${settings.localUrl}. Ensure the server is started and "CORS" is enabled.`);
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
      lastMsg.content = `[Context: ${context.replace(/\n/g, ' ')}]\n\nQuestion: ${lastMsg.content}`;
      messagesWithContext[lastMsgIdx] = lastMsg;
    }
  }

  try {
    if (settings.provider === 'gemini') {
      return await callGemini(settings, messagesWithContext);
    } else {
      return await callLocalAI(settings, messagesWithContext);
    }
  } catch (error) {
    console.error('Coach API Error:', error);
    throw error;
  }
}
