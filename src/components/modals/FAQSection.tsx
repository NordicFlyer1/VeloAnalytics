import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface FAQItem {
  question: string;
  beginnerAnswer: string;
  technicalAnswer: string;
  keywords?: string[];
}

interface FAQCategory {
  name: string;
  items: FAQItem[];
}

const FAQ_DATA: FAQCategory[] = [
  {
    name: "Cycling Glossary: Basics",
    items: [
      {
        question: "What are Watts (W)?",
        beginnerAnswer: "Think of Watts as how hard you are pushing the pedals right now. It is your immediate 'energy output'—the intensity of your effort.",
        technicalAnswer: "Watts (W) are units measurement within the International System of Units (SI), representing the rate of energy expenditure (1 Joule per second). In cycling, it is calculated as Torque (how hard you push) × Cadence (how fast you spin).",
        keywords: ["power", "effort", "pushing", "intensity"]
      },
      {
        question: "What are Kilojoules (KJ)?",
        beginnerAnswer: "This is the total 'gas' you burned during the ride. It is the total amount of work you did. Due to human body inefficiency, it's roughly equal to the calories you burned.",
        technicalAnswer: "Kilojoules (KJ) represent mechanical work performed. Since the human body is roughly 20-25% efficient at converting energy to mechanical work, 1 KJ of work on the bike is approximately 1 Kcal of metabolic energy burned.",
        keywords: ["work", "calories", "energy", "burned", "gas"]
      },
      {
        question: "What does Ascent mean?",
        beginnerAnswer: "The total height you climbed, like walking up a giant set of stairs over the course of the whole ride.",
        technicalAnswer: "Total Ascent (Cumulative Elevation Gain) is the sum of every upward vertical gain in meters. It is distinct from 'Elevation' (your current height above sea level).",
        keywords: ["climbing", "uphill", "height", "stairs", "elevation"]
      },
      {
        question: "What is Heart Rate (HR)?",
        beginnerAnswer: "How fast your heart is beating in Beats Per Minute (BPM). It tells you how hard your internal 'engine' is working to keep up with your effort.",
        technicalAnswer: "Heart Rate (measured in Beats Per Minute) is a physiological response to exercise intensity. It is affected by stroke volume, oxygen demand, temperature, and fatigue.",
        keywords: ["pulse", "bpm", "engine", "cardio", "effort"]
      },
      {
        question: "What is Cadence (Revolutions Per Minute - RPM)?",
        beginnerAnswer: "How fast your legs are spinning the pedals. Like the 'revolutions' in a car engine.",
        technicalAnswer: "Cadence is the number of full revolutions of the crank per minute. Higher cadences (85-95) generally shift the load to the cardiovascular system, while lower cadences (60-70) put more strain on the muscular system.",
        keywords: ["spinning", "pedaling", "legs", "fast", "rpm"]
      }
    ]
  },
  {
    name: "Performance Modeling",
    items: [
      {
        question: "What is Critical Power (CP)?",
        beginnerAnswer: "Think of this as your personal speed limit for long efforts. It's the hardest you can push for about 45-60 minutes without blowing up.",
        technicalAnswer: "Critical Power (CP) represents the highest power output that can be maintained for a quasi-steady state without exhaustion. We calculate it using the 2-parameter linear model: Work = CP × t + W', where 'Work' is the total anaerobic work performed and 't' is time. It is the asymptote of the power-duration relationship.",
        keywords: ["fitness", "ftp", "limit", "threshold", "exhaustion", "calculation", "formula", "model"]
      },
      {
        question: "What does W' Balance represent?",
        beginnerAnswer: "This is your anaerobic 'battery'. It drops when you go really hard (above your speed limit/CP) and recharges when you back off.",
        technicalAnswer: "W' (pronounced 'W-prime') represents the finite amount of work that can be performed above Critical Power. W' Balance is a dynamic model (integrating discharge and recovery) of your remaining anaerobic capacity.",
        keywords: ["battery", "anaerobic", "matchbook", "capacity", "sprint"]
      },
      {
        question: "What is xPower?",
        beginnerAnswer: "A way of measuring how hard the ride 'felt'. It gives more credit for hard sprints than for coasting, which captures the physical cost better than a simple average.",
        technicalAnswer: "xPower (developed by Dr. Philip Skiba) accounts for the metabolic cost of highly variable efforts. It uses a 30-second rolling average raised to the 4th power to emphasize the exponentially higher cost of high-intensity efforts.",
        keywords: ["normalized", "actual cost", "effort", "physiological cost"]
      },
      {
        question: "What is BikeScore™?",
        beginnerAnswer: "A single number that tells you how stressful your ride was. A bigger number means you need more rest!",
        technicalAnswer: "BikeScore™ is a training load metric that combines duration, intensity (Relative Intensity), and xPower to quantify total physiological stress. 100 points represents roughly 1 hour of maximal effort.",
        keywords: ["stress", "load", "score", "recovery", "training stress"]
      }
    ]
  },
  {
    name: "Training Load & Progress",
    items: [
      {
        question: "What is Fitness (LTS)?",
        beginnerAnswer: "Your long-term 'base'. It represents how much training you've done over the last 6 weeks. Higher fitness means you can handle harder rides.",
        technicalAnswer: "Long Term Stress (LTS) is an exponentially weighted moving average of your daily BikeScore, typically with a 42-day time constant. It reflects your long-term fitness base and training history.",
        keywords: ["lts", "fitness", "base", "long term"]
      },
      {
        question: "What is Fatigue (Short Term Stress - STS)?",
        beginnerAnswer: "How tired you are right now from your recent rides (last week or so).",
        technicalAnswer: "Short Term Stress (STS) is an exponentially weighted moving average of your daily BikeScore, typically with a 7-day time constant. It represents your current workload and recent efforts.",
        keywords: ["sts", "fatigue", "tired", "short term"]
      },
      {
        question: "What is Form (SB)?",
        beginnerAnswer: "Your 'freshness'. If it's a positive number, you're rested and ready to race. If it's deeply negative, you're very tired and need a break.",
        technicalAnswer: "Stress Balance (SB) is the difference between Fitness (LTS) and Fatigue (STS). A negative balance indicates a state of overload, while a positive balance indicates 'tapering', freshness, and recovery.",
        keywords: ["sb", "form", "freshness", "rested", "ready"]
      }
    ]
  },
  {
    name: "Physics & Equipment",
    items: [
      {
        question: "What is CdA (Aero Drag)?",
        beginnerAnswer: "CdA describes how 'slippery' you are in the wind. A smaller number means you are more aerodynamic and can go faster for the same effort. It's why riding in the 'drops' is faster than sitting upright on the 'tops'.",
        technicalAnswer: "CdA is the product of the Drag Coefficient (Cd) and Projected Frontal Area (A). It represents the effective aerodynamic area of the rider and bike. In our model, changing your Riding Position (Tops, Hoods, Drops) adjusts this constant to estimate power losses due to air density and velocity.",
        keywords: ["cda", "drag", "aero", "wind", "aerodynamics", "position", "drops", "hoods"]
      },
      {
        question: "What is Crr (Rolling Resistance)?",
        beginnerAnswer: "Crr is how much your tires 'stick' to the ground. Rougher surfaces or knobby tires have higher resistance, making you work harder to maintain speed.",
        technicalAnswer: "The Coefficient of Rolling Resistance (Crr) quantifies the energy lost as a tire deforms while rolling. We adjust this based on your selected Surface Type (Road, Gravel, MTB) to account for varying friction and vibration losses in the virtual power engine.",
        keywords: ["crr", "tires", "resistance", "friction", "road", "gravel", "surface"]
      },
      {
        question: "How does Equipment weight affect speed?",
        beginnerAnswer: "Heavier bikes require more energy to accelerate and to pull uphill against gravity. On flat roads, weight matters much less than aerodynamics.",
        technicalAnswer: "Mass directly affects the Force of Gravity (Fg = m · g · sin(θ)) and the Force of Acceleration (Fa = m · a). By defining your Bike Weight and Body Weight in settings, we can accurately calculate the power required to overcome gravitational potential energy on gradients.",
        keywords: ["weight", "gravity", "climbing", "mass", "acceleration"]
      }
    ]
  },
  {
    name: "AI Intelligence",
    items: [
      {
        question: "What can the Velo Coach see?",
        beginnerAnswer: "The coach has a complete view of your fitness 'engine'. It sees your Critical Power, anaerobic battery (W'), and every major stat from your rides like power, heart rate, cadence, speed, and climbing. It also knows your 6-week fitness trends and can search your history.",
        technicalAnswer: "The coach context includes CP, W' Balance, and full ActivitySummary metrics (NP, RI, BikeScore, KJ, Aerobic Decoupling). It also receives sensor statistical aggregates (Avg/Max Power, HR, Cadence, Speed), PMC indices (LTS, STS, SB), and a searchable index of historical ride metadata.",
        keywords: ["intelligence", "coach", "data", "access", "privacy", "metrics", "cp", "wprime", "xpower", "kj", "ascent"]
      },
      {
        question: "Is my performance data sent to AI companies?",
        beginnerAnswer: "Only when you use the 'Velo Coach' feature. Your raw ride files are never sent; only a text summary of your stats is shared with the AI provider (like Google or OpenAI) to generate your coaching response.",
        technicalAnswer: "Data is processed locally. When a chat message is sent, a distilled text summary is generated and sent via a direct client-side HTTPS request to the selected AI vendor (Gemini/OpenAI/Anthropic). Your raw binary .fit files and full sensor data never leave your browser.",
        keywords: ["security", "privacy", "sharing", "google", "openai"]
      },
      {
        question: "Can I use my own local LLM (Ollama/LM Studio)?",
        beginnerAnswer: "Yes! If you run AI on your own computer, you can connect VeloAnalytics to it. This keeps 100% of your data on your own machine.",
        technicalAnswer: "VeloAnalytics supports OpenAI-compatible local APIs. By setting the Provider to Local LLM and pointing the URL to your local instance (e.g. http://localhost:11434), the app communicates with your local hardware using the fetch API with CORS headers.",
        keywords: ["ollama", "lm-studio", "local", "privacy", "offline"]
      },
      {
        question: "How do I ask about a specific ride from the past?",
        beginnerAnswer: "Just tell the coach which ride you mean! You can say 'Analyze my MyWhoosh ride' or use the date like 'How was my ride on 2026_04_13?'.",
        technicalAnswer: "The coach context includes an index of historical rides with their 'originalFileName'. Because the app follows a YYYY_MM_DD naming convention, the AI can correlate your text query to specific data summaries in the context index.",
        keywords: ["search", "history", "naming", "whoosh", "date"]
      }
    ]
  },
  {
    name: "Platform",
    items: [
      {
        question: "How do I upload activities?",
        beginnerAnswer: "Just click the 'Upload' button in the top bar and pick your ride files from your computer or phone.",
        technicalAnswer: "Select industry-standard .fit files via the Upload screen. Our parser extracts Global Positioning System (GPS), Power, Heart Rate, and Cadence data for local browser storage.",
        keywords: ["import", "files", "fit", "uploading"]
      },
      {
        question: "What is the Activity History search syntax?",
        beginnerAnswer: "You can find specific rides instantly using prefixes! Try typing 'score:100' to see only rides with that stress score, 'watts:250' for specific power efforts, or 'time:1h' for ride length. You can also search by 'date:2026' or 'file:Lunch'.",
        technicalAnswer: "The history search engine uses strict field-mapping. Supported prefixes include: score: (BikeScore), watts: (Avg Power), time: (Duration), date: (Activity Date), file: (Original Filename), and name: (Activity Name). Combinations like 'MyWhoosh score:120' are supported using AND logic.",
        keywords: ["search", "filter", "syntax", "how to", "commands", "prefix", "format", "find", "score", "watts", "time", "date"]
      },
      {
        question: "How do I find a specific ride in my long history?",
        beginnerAnswer: "Use the search bar in the Activity History panel! You can search generally by name, or use strict commands like 'score:90', 'watts:250', or 'time:1h' to be more precise.",
        technicalAnswer: "The search supports a tokenized syntax. You can use prefixes like score:, bikescore:, watts:, p:, w:, date:, name:, file:, and time: to filter specific data fields without ambiguity.",
        keywords: ["search", "filter", "find", "history", "bikescore", "power", "wattage", "duration", "time", "syntax"]
      },
      {
        question: "Can I search for metrics like BikeScore or Power?",
        beginnerAnswer: "Yes! High-performance search is built-in. If you want to find all rides where you hit a certain stress level or power average, just type the number into the history search bar.",
        technicalAnswer: "The activity filter performs string-based matching across numerical fields (BikeScore, AvgPower) and temporal fields. This allows users to cross-reference performance peaks without manually scrolling through months of data.",
        keywords: ["bikescore", "power", "search", "filter", "metrics", "stats"]
      },
      {
        question: "Is my data stored securely?",
        beginnerAnswer: "Yes. Your data stays on your device in your browser's private storage. We do not see, store, or sell your ride data.",
        technicalAnswer: "VeloAnalytics uses a local-first architecture. Data is persisted in your browser's IndexedDB storage (a secure, browser-based database). No Personally Identifiable Information (PII) or ride telemetry is transmitted to our servers beyond the initial application load.",
        keywords: ["privacy", "security", "database", "storage"]
      }
    ]
  }
];

export const FAQSection: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>("General");
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleItem = (question: string) => {
    setExpandedItems(prev => 
      prev.includes(question) 
        ? prev.filter(q => q !== question) 
        : [...prev, question]
    );
  };

  const filteredCategories = FAQ_DATA.map(category => ({
    ...category,
    items: category.items.filter(item => 
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.beginnerAnswer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.technicalAnswer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.keywords?.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })).filter(category => category.items.length > 0);

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" />
        <input 
          type="text"
          placeholder="Try 'climbing', 'stress', or 'battery'..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-app-bg/50 border border-app-border rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-orange-500/50 transition-all"
        />
      </div>

      {!searchQuery && (
        <div className="flex bg-app-bg/50 p-1 rounded-full border border-app-border self-start w-fit overflow-x-auto max-w-full no-scrollbar">
          {FAQ_DATA.map(category => (
            <button
              key={category.name}
              onClick={() => setActiveCategory(category.name)}
              className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                activeCategory === category.name 
                  ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" 
                  : "text-app-muted hover:text-app-text"
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {filteredCategories.map(category => (
          <div key={category.name} className="space-y-3">
            {(searchQuery || activeCategory === category.name) && (
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-orange-500 mt-6 ml-2">
                {category.name}
              </h4>
            )}
            {(searchQuery || activeCategory === category.name) && category.items.map((item, idx) => (
              <div 
                key={idx}
                className="bg-app-bg/30 border border-app-border rounded-2xl overflow-hidden transition-all hover:border-app-border/80"
              >
                <button
                  onClick={() => toggleItem(item.question)}
                  className="w-full flex items-center justify-between p-4 text-left group"
                >
                  <span className="text-sm font-semibold text-app-text group-hover:text-orange-500 transition-colors">
                    {item.question}
                  </span>
                  {expandedItems.includes(item.question) ? (
                    <ChevronDown className="w-4 h-4 text-orange-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-app-muted group-hover:text-orange-500" />
                  )}
                </button>
                <AnimatePresence>
                  {expandedItems.includes(item.question) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 pt-0 space-y-4">
                        <div className="flex gap-4">
                          <div className="flex-1 space-y-2">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-orange-500/60">Plain English</span>
                            <p className="text-sm text-app-text leading-relaxed">
                              {item.beginnerAnswer}
                            </p>
                          </div>
                        </div>

                        <div className="bg-app-bg/40 border border-app-border/50 rounded-xl p-4 space-y-2">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-app-muted">Technical Deep Dive</span>
                          <p className="text-xs text-app-muted leading-relaxed font-mono">
                            {item.technicalAnswer}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        ))}

        {filteredCategories.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-app-muted">No results found for "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
};
