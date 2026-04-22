import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, TrendingUp, Activity, BookOpen, Scale, HelpCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import methodologyContent from '../../../docs/METHODOLOGY.md?raw';
import licenseContent from '../../../LICENSE?raw';
import { FAQSection } from './FAQSection';
import { cn } from '../../lib/utils';

interface AboutModalProps {
  showAboutModal: boolean;
  setShowAboutModal: (show: boolean) => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({
  showAboutModal,
  setShowAboutModal
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'methodology' | 'faq' | 'license'>('overview');

  return (
    <AnimatePresence>
      {showAboutModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center px-4 sm:px-6"
        >
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setShowAboutModal(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-app-card border border-app-border rounded-3xl w-full max-w-3xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="p-5 sm:p-8 border-b border-app-border flex flex-col gap-4 sm:gap-6 bg-app-card/50 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2 sm:gap-3">
                  <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
                  Performance Insights
                </h2>
                <button 
                  onClick={() => setShowAboutModal(false)}
                  className="text-app-muted hover:text-app-text transition-colors text-[10px] font-bold uppercase tracking-widest px-2 py-1"
                >
                  Close
                </button>
              </div>

              {/* Capsule Tab Switcher */}
              <div className="flex bg-app-bg/50 p-1 rounded-full border border-app-border self-start overflow-x-auto max-w-full no-scrollbar">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={cn(
                    "px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                    activeTab === 'overview' 
                      ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" 
                      : "text-app-muted hover:text-app-text"
                  )}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('methodology')}
                  className={cn(
                    "px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                    activeTab === 'methodology' 
                      ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" 
                      : "text-app-muted hover:text-app-text"
                  )}
                >
                  Method
                </button>
                <button
                  onClick={() => setActiveTab('faq')}
                  className={cn(
                    "px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                    activeTab === 'faq' 
                      ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" 
                      : "text-app-muted hover:text-app-text"
                  )}
                >
                  FAQ
                </button>
                <button
                  onClick={() => setActiveTab('license')}
                  className={cn(
                    "px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                    activeTab === 'license' 
                      ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" 
                      : "text-app-muted hover:text-app-text"
                  )}
                >
                  Legal
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-8 custom-scrollbar no-scrollbar scroll-smooth">
              <AnimatePresence mode="wait">
                {activeTab === 'overview' ? (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-8 sm:space-y-12"
                  >
                    <section className="space-y-3 sm:space-y-4">
                      <h3 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-orange-500">Mission</h3>
                      <p className="text-xs sm:text-sm text-app-text/80 leading-relaxed">
                        VeloAnalytics is built on the principle of <span className="text-app-text font-semibold">algorithmic transparency</span>. 
                        We believe that athletes should own their data and understand the math that defines their fitness.
                      </p>
                    </section>

                    <section className="space-y-4 sm:space-y-6">
                      <h3 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-orange-500 text-center sm:text-left">Key Performance Indicators</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div className="bg-app-bg/50 p-4 sm:p-5 rounded-2xl border border-app-border/50">
                          <h4 className="text-xs font-bold mb-1.5 flex items-center gap-2">
                            <Zap className="w-3 h-3 text-orange-500" />
                            Critical Power (CP)
                          </h4>
                          <p className="text-[10px] sm:text-[11px] text-app-muted leading-relaxed">
                            The highest power output maintainable without fatigue. Estimated using the Monod & Scherrer model.
                          </p>
                        </div>
                        <div className="bg-app-bg/50 p-4 sm:p-5 rounded-2xl border border-app-border/50">
                          <h4 className="text-xs font-bold mb-1.5 flex items-center gap-2">
                            <TrendingUp className="w-3 h-3 text-purple-500" />
                            xPower & BikeScore
                          </h4>
                          <p className="text-[10px] sm:text-[11px] text-app-muted leading-relaxed">
                            Reflects physiological strain and total training dose using weighted averages and intensity weighting.
                          </p>
                        </div>
                        <div className="bg-app-bg/50 p-4 sm:p-5 rounded-2xl border border-app-border/50">
                          <h4 className="text-xs font-bold mb-1.5 flex items-center gap-2">
                            <Activity className="w-3 h-3 text-blue-500" />
                            Fitness / Fatigue
                          </h4>
                          <p className="text-[10px] sm:text-[11px] text-app-muted leading-relaxed">
                            LTS (Chronic) and STS (Acute) loads derived from daily BikeScore to monitor your training form.
                          </p>
                        </div>
                        <div className="bg-app-bg/50 p-4 sm:p-5 rounded-2xl border border-app-border/50">
                          <h4 className="text-xs font-bold mb-1.5 flex items-center gap-2">
                            <Scale className="w-3 h-3 text-cyan-500" />
                            Open Governance
                          </h4>
                          <p className="text-[10px] sm:text-[11px] text-app-muted leading-relaxed">
                            Shared under non-commercial terms to ensure the community retains the right to analyze and audit.
                          </p>
                        </div>
                      </div>
                    </section>
                    
                    <section className="space-y-3 sm:space-y-4">
                      <h3 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-orange-500">Getting Help</h3>
                      <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4 sm:p-6 flex gap-3 sm:gap-4">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-500 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
                          <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                        </div>
                        <div className="space-y-1 sm:space-y-2">
                          <h4 className="text-xs sm:text-sm font-bold text-app-text">Contextual Help</h4>
                          <p className="text-[10px] sm:text-xs text-app-muted leading-relaxed">
                            Look for the small <span className="text-orange-500 font-bold italic">i</span> icons next to section headers. 
                            Clicking them will show a quick explainer for that block.
                          </p>
                        </div>
                      </div>
                    </section>

                    <div className="pt-6 sm:pt-8 border-t border-app-border/50 text-center">
                      <p className="text-[9px] sm:text-[10px] text-app-muted italic">
                        Explore the tabs above for full documentation.
                      </p>
                    </div>
                  </motion.div>
                ) : activeTab === 'methodology' ? (
                  <motion.div
                    key="methodology"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="markdown-body">
                      <ReactMarkdown>{methodologyContent}</ReactMarkdown>
                    </div>
                  </motion.div>
                ) : activeTab === 'faq' ? (
                  <motion.div
                    key="faq"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FAQSection />
                  </motion.div>
                ) : (
                  <motion.div
                    key="license"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="markdown-body">
                      <ReactMarkdown>{licenseContent}</ReactMarkdown>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
