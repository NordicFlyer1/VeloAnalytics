import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, TrendingUp, Activity, BookOpen } from 'lucide-react';

interface AboutModalProps {
  showAboutModal: boolean;
  setShowAboutModal: (show: boolean) => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({
  showAboutModal,
  setShowAboutModal
}) => {
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
            className="relative bg-app-card border border-app-border rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="p-8 border-b border-app-border flex items-center justify-between bg-app-card/50 backdrop-blur-md">
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-orange-500" />
                About & Methodology
              </h2>
              <button 
                onClick={() => setShowAboutModal(false)}
                className="text-app-muted hover:text-app-text transition-colors text-xs font-bold uppercase tracking-widest"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
              <section className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-500">Mission</h3>
                <p className="text-sm text-app-text/80 leading-relaxed">
                  VeloAnalytics is built on the principle of <span className="text-app-text font-semibold">algorithmic transparency</span>. 
                  Most cycling platforms hide their calculations behind proprietary trademarks. We believe that athletes should own their data 
                  and understand the math that defines their fitness.
                </p>
              </section>

              <section className="space-y-6">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-500">Core Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-app-bg/50 p-5 rounded-2xl border border-app-border/50">
                    <h4 className="text-xs font-bold mb-2 flex items-center gap-2">
                      <Zap className="w-3 h-3 text-orange-500" />
                      Critical Power (CP)
                    </h4>
                    <p className="text-[11px] text-app-muted leading-relaxed">
                      The highest power output maintainable without fatigue. We use the Monod & Scherrer 2-parameter linear model 
                      to estimate this from your best efforts.
                    </p>
                  </div>
                  <div className="bg-app-bg/50 p-5 rounded-2xl border border-app-border/50">
                    <h4 className="text-xs font-bold mb-2 flex items-center gap-2">
                      <TrendingUp className="w-3 h-3 text-purple-500" />
                      xPower & BikeScore
                    </h4>
                    <p className="text-[11px] text-app-muted leading-relaxed">
                      Developed by Dr. Philip Skiba. xPower uses a 25s EWMA to reflect physiological strain, while BikeScore 
                      quantifies the total "dose" of the workout.
                    </p>
                  </div>
                  <div className="bg-app-bg/50 p-5 rounded-2xl border border-app-border/50">
                    <h4 className="text-xs font-bold mb-2 flex items-center gap-2">
                      <Activity className="w-3 h-3 text-blue-500" />
                      LTS / STS / SB
                    </h4>
                    <p className="text-[11px] text-app-muted leading-relaxed">
                      Based on the Banister model. LTS (42-day) represents Fitness, STS (7-day) represents Fatigue, 
                      and SB is the balance (Form) between them.
                    </p>
                  </div>
                  <div className="bg-app-bg/50 p-5 rounded-2xl border border-app-border/50">
                    <h4 className="text-xs font-bold mb-2 flex items-center gap-2">
                      <Zap className="w-3 h-3 text-cyan-500" />
                      W' Balance
                    </h4>
                    <p className="text-[11px] text-app-muted leading-relaxed">
                      A real-time model of your anaerobic reserve. It tracks depletion above CP and exponential 
                      recovery below CP.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-500">Attribution</h3>
                <div className="space-y-4 text-[11px] text-app-muted">
                  <p>
                    <span className="text-app-text font-semibold">Dr. Philip Friere Skiba (PhysFarm)</span>: 
                    Creator of the BikeScore™, xPower, and W' Balance algorithms.
                  </p>
                  <p>
                    <span className="text-app-text font-semibold">Dr. Eric Banister</span>: 
                    Developer of the original TRIMP model, the mathematical ancestor of modern training load metrics.
                  </p>
                  <p>
                    <span className="text-app-text font-semibold">GoldenCheetah Project</span>: 
                    For their leadership in open-source cycling analytics standards.
                  </p>
                </div>
              </section>

              <div className="pt-8 border-t border-app-border/50">
                <p className="text-[10px] text-app-muted text-center italic">
                  For a full technical breakdown, see the METHODOLOGY.md file in the project root.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
