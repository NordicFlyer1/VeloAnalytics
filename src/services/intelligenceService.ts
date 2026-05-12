import { GoogleGenAI } from '@google/genai';
import { AISettings, ActivitySummary, PMCDataPoint, ChatMessage, HistoricalActivity, SleepMetric, HRVMetric } from '../types';
import { calculateVeloReadiness } from './wellnessService';

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

  // Calculate Global Athlete Readiness (The "Interface" number)
  let athleteGlobalReadiness = null;
  if (latestSleep && athleteCurrentPMC) {
    // Aligned to latest sleep as per SummaryCards
    const alignedHRV = hrvHistory.find(h => h.date === latestSleep.date) || null;
    athleteGlobalReadiness = calculateVeloReadiness(
      latestSleep,
      alignedHRV,
      athleteCurrentPMC.sb,
      athleteCurrentPMC.sts,
      athleteCurrentPMC.bikeScore || 0
    );
  }

  // 3. Activity-Specific Readiness (Context for the selected ride)
  let activityReadiness = null;
  if (currentPMC && summary) {
    const activityDate = summary.startTime.toISOString().split('T')[0];
    const activitySleep = sleepHistory.find(s => s.date === activityDate) || null;
    const activityHRV = hrvHistory.find(h => h.date === activityDate) || null;
    
    activityReadiness = calculateVeloReadiness(
      activitySleep,
      activityHRV,
      currentPMC.sb,
      currentPMC.sts,
      summary.bikeScore || 0
    );
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
      readinessFormula: "Base = (Sleep*0.35 + Recovery*0.25 + HRV*0.20 + Load*0.20). Adjusted by WorstPillar suppression and debt/spike penalties."
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
 * Handles communication with Groq (OpenAI-compatible)
 */
async function callGroq(settings: AISettings, messages: ChatMessage[]): Promise<string> {
  const apiKey = settings.groqApiKey;
  if (!apiKey) throw new Error('Groq API key is missing.');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: settings.groqModel || 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: settings.systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      temperature: 0.7,
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq Error: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
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
      case 'groq':
        return await callGroq(settings, messagesWithContext);
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
