import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { GlassCard } from './GlassCard';
import { User, Briefcase, Info, ArrowRight, CheckCircle, MapPin, Loader2 } from 'lucide-react';
import axios from 'axios';

const steps = [
  { id: 'full_name', title: 'What should we call you?', icon: User, placeholder: 'Your full name' },
  { id: 'gender', title: 'Your gender?', icon: Info, options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'] },
  { id: 'profession', title: 'What is your profession?', icon: Briefcase, placeholder: 'e.g. Software Engineer, Student' },
  { id: 'source', title: 'How did you hear about us?', icon: MapPin, options: ['Twitter/X', 'LinkedIn', 'Friend', 'Search Engine', 'Other'] },
];

export function OnboardingWizard() {
  const { user, refreshUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<any>({
    full_name: user?.full_name || '',
    gender: '',
    profession: '',
    source: '',
  });
  const [loading, setLoading] = useState(false);

  const handleNext = (val?: string) => {
    const fieldId = steps[currentStep].id;
    const newData = { ...data };
    if (val) newData[fieldId] = val;
    
    setData(newData);

    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      finish(newData);
    }
  };

  const finish = async (finalData: any) => {
    setLoading(true);
    try {
      await axios.patch('http://localhost:8000/api/v1/auth/profile', {
        ...finalData,
        onboarding_completed: true
      });
      await refreshUser();
    } catch (e) {
      console.error("Failed to finish onboarding", e);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const stepInfo = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <GlassCard className="w-full max-w-lg overflow-hidden relative">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
          <motion.div 
            className="h-full bg-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {loading && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-white">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                <p className="font-bold tracking-widest text-sm uppercase">Setting up your profile...</p>
            </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
                <stepInfo.icon className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] mb-1">Step {currentStep + 1} of {steps.length}</p>
                <h2 className="text-2xl font-bold text-white leading-tight">{stepInfo.title}</h2>
              </div>
            </div>

            <div className="space-y-4">
              {stepInfo.options ? (
                <div className="grid grid-cols-1 gap-2">
                  {stepInfo.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleNext(opt)}
                      className="w-full p-4 rounded-xl text-left transition-all border border-white/10 bg-white/5 text-slate-300 hover:bg-blue-600 hover:border-blue-500 hover:text-white"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  <input
                    type="text"
                    autoFocus
                    value={data[stepInfo.id]}
                    onChange={(e) => setData({ ...data, [stepInfo.id]: e.target.value })}
                    placeholder={stepInfo.placeholder}
                    className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white text-lg placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    onKeyDown={(e) => e.key === 'Enter' && data[stepInfo.id] && handleNext()}
                  />
                  <button
                    disabled={!data[stepInfo.id]}
                    onClick={() => handleNext()}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                  >
                    Continue <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </GlassCard>
    </div>
  );
}
