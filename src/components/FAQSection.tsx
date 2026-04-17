import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  name: string;
  items: FAQItem[];
}

const FAQ_DATA: FAQCategory[] = [
  {
    name: "General",
    items: [
      {
        question: "How do I upload activities?",
        answer: "Click the 'Upload' button in the header and select your ride files (Garmin, Wahoo, etc.) from your device. You can select multiple files at once to bulk-upload your history."
      },
      {
        question: "What file formats are supported?",
        answer: "Currently, VeloAnalytics supports the industry-standard .fit format. Support for .tcx and .gpx is coming soon."
      },
      {
        question: "Is my data stored securely?",
        answer: "VeloAnalytics is a client-side focused application. Your data is stored locally in your browser's IndexedDB. We do not sell or analyze your ride data for commercial purposes."
      }
    ]
  },
  {
    name: "Metrics",
    items: [
      {
        question: "What is Critical Power (CP)?",
        answer: "Critical Power represents the highest power output you can maintain for a long duration (typically 30-60 minutes) without fatiguing. It is the boundary between the heavy and severe exercise intensity domains."
      },
      {
        question: "How is CP estimated?",
        answer: "If not set manually, we use the Monod & Scherrer linear model based on your best efforts (MMP) from the last 90 days. We look at specific time durations (usually 3m to 20m) to calculate the slope of your work-over-time curve."
      },
      {
        question: "What does W' Balance represent?",
        answer: "Think of W' as your anaerobic 'battery'. It depletes when you go above Critical Power and recovers when you drop below it. Our model is fatigue-aware, meaning it recovers slower as the ride gets longer."
      }
    ]
  },
  {
    name: "Navigation",
    items: [
      {
        question: "How do I sync the charts with the map?",
        answer: "Simply hover over any chart or move your mouse along the activity map. The cursor will stay synchronized across all analysis sections, allowing you to see exactly where peak efforts occurred."
      },
      {
        question: "Can I compare multiple rides?",
        answer: "Yes. In the Power Curve section, you can select other rides from your sidebar history to overlay their performance data, allowing for direct progress tracking."
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
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" />
        <input 
          type="text"
          placeholder="Search for questions or keywords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-app-bg/50 border border-app-border rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-orange-500/50 transition-all"
        />
      </div>

      {!searchQuery && (
        <div className="flex bg-app-bg/50 p-1 rounded-full border border-app-border self-start w-fit">
          {FAQ_DATA.map(category => (
            <button
              key={category.name}
              onClick={() => setActiveCategory(category.name)}
              className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
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
            {searchQuery && (
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
                      <div className="p-4 pt-0 text-sm text-app-muted leading-relaxed">
                        {item.answer}
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
