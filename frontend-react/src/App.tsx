import { Background } from "./components/Background";
import { BlogGenerator } from "./components/BlogGenerator";
import { LoginPage } from "./components/LoginPage";
import { OnboardingWizard } from "./components/OnboardingWizard";
import { ProfilePage } from "./components/ProfilePage";
import { BlogHistory } from "./components/BlogHistory";
import { SupportModal } from "./components/SupportModal";
import { AdminDashboard } from "./components/AdminDashboard";
import { PublicBlogViewer } from "./components/PublicBlogViewer";
import { AuthProvider, useAuth, getApiUrl } from "./contexts/AuthContext";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { LogOut, Zap, User as UserIcon, Clock, LayoutDashboard, HelpCircle, ShieldCheck, X, Check, AlertCircle } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "./components/GlassCard";
import axios from "axios";
import { Routes, Route } from "react-router-dom";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function MainLayout() {
  const { user, logout, refreshUser } = useAuth();
  const [view, setView] = useState<'dashboard' | 'profile' | 'history' | 'admin'>('dashboard');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const apiUrl = getApiUrl();

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleUpgrade = async (plan: 'basic' | 'pro') => {
    try {
        const res = await axios.post(`${apiUrl}/api/v1/payment/create-order`, { plan });
        const order = res.data;

        if (order.mock) {
            await axios.post(`${apiUrl}/api/v1/payment/verify`, {
                razorpay_order_id: order.order_id,
                razorpay_payment_id: "pay_mock_123",
                razorpay_signature: "sig_mock_123",
                plan: plan
            });
            await refreshUser();
            setIsPricingOpen(false);
            showNotification('success', "Credits Added Successfully!");
            return;
        }

        const options = {
            key: order.key,
            amount: order.amount,
            currency: "INR",
            name: "ScribeFlow AI",
            description: plan === 'basic' ? "20 Blog Credits" : "50 Blog Credits",
            order_id: order.order_id,
            handler: async function (response: any) {
                try {
                    await axios.post(`${apiUrl}/api/v1/payment/verify`, {
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        plan: plan
                    });
                    await refreshUser();
                    setIsPricingOpen(false);
                    showNotification('success', "Payment Successful! Credits added.");
                } catch (err) {
                    showNotification('error', "Verification failed. Please contact support.");
                }
            },
            prefill: {
                name: user?.full_name || "",
                email: user?.email || "",
            },
            theme: { color: "#2563eb" },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();

    } catch (e) {
        showNotification('error', "Could not initiate payment.");
    }
  };

  const handleViewHistoryItem = (jobId: string) => {
    setSelectedJobId(jobId);
    setView('dashboard');
  };

  if (!user) return <LoginPage />;
  if (!user.onboarding_completed) return <OnboardingWizard />;

  return (
    <>
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
            <motion.div 
                initial={{ opacity: 0, y: -20, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, y: -20, x: '-50%' }}
                className="fixed top-20 left-1/2 z-[300] w-fit min-w-[300px]"
            >
                <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl ${
                    notification.type === 'success' 
                    ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                    {notification.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="text-sm font-bold">{notification.message}</span>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <button 
                onClick={() => { setView('dashboard'); setSelectedJobId(null); }}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 font-bold text-white shadow-lg shadow-cyan-500/20">
                AI
                </div>
                <span className="text-lg font-bold tracking-tight text-white">ScribeFlow</span>
            </button>

            <nav className="hidden md:flex items-center gap-1">
                <button 
                    onClick={() => { setView('dashboard'); setSelectedJobId(null); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'dashboard' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                </button>
                <button 
                    onClick={() => setView('history')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'history' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    <Clock className="w-4 h-4" />
                    History
                </button>
                {user.is_admin && (
                    <button 
                        onClick={() => setView('admin')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'admin' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-white'}`}
                    >
                        <ShieldCheck className="w-4 h-4" />
                        Admin
                    </button>
                )}
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
                <span>Credits: {user.credits_left}</span>
                <button onClick={() => setIsPricingOpen(true)} className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 border-l border-white/10 pl-4">
                    <Zap className="w-3 h-3" /> Get Credits
                </button>
            </div>

            <button onClick={() => setIsSupportOpen(true)} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
                <HelpCircle className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                <button onClick={() => setView('profile')} className="flex items-center gap-3 group text-left">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm text-white font-medium group-hover:text-blue-400 transition-colors">
                            {user.full_name || 'My Profile'}
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                            {user.credits_left} Credits Left
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 overflow-hidden group-hover:border-blue-500/50 transition-all">
                        {user.profile_image ? (
                            <img src={`${apiUrl}${user.profile_image}?t=${Date.now()}`} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                                <UserIcon className="w-5 h-5" />
                            </div>
                        )}
                    </div>
                </button>

                <button onClick={logout} className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors">
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
          </div>
        </div>
      </header>

      <div className="pt-24 pb-12">
        {view === 'dashboard' && <BlogGenerator initialJobId={selectedJobId} onReset={() => setSelectedJobId(null)} />}
        {view === 'history' && <BlogHistory onSelect={handleViewHistoryItem} />}
        {view === 'profile' && <ProfilePage onBack={() => setView('dashboard')} />}
        {view === 'admin' && <AdminDashboard onBack={() => setView('dashboard')} />}
      </div>

      <AnimatePresence>
        {isPricingOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full max-w-4xl">
              <GlassCard className="relative overflow-hidden p-8">
                <button onClick={() => setIsPricingOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg">
                  <X className="w-6 h-6" />
                </button>
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-black text-white mb-2">Get More Credits</h2>
                  <p className="text-slate-400">Choose a pack to keep generating high-quality blogs.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 flex flex-col">
                    <h3 className="text-xl font-bold text-white mb-2">Essential Pack</h3>
                    <div className="text-4xl font-black text-white mb-8">₹499 <span className="text-slate-500 text-sm">/ 20 Credits</span></div>
                    <button onClick={() => handleUpgrade('basic')} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all">Buy 20 Credits</button>
                  </div>
                  <div className="bg-[#0a0a0a] border border-blue-500/30 rounded-3xl p-8 flex flex-col">
                    <h3 className="text-xl font-bold text-white mb-2">Ultimate Pack</h3>
                    <div className="text-4xl font-black text-white mb-8">₹999 <span className="text-slate-500 text-sm">/ 50 Credits</span></div>
                    <button onClick={() => handleUpgrade('pro')} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 rounded-2xl transition-all">Buy 50 Credits</button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
    </>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Background />
        <main className="relative z-10 min-h-screen text-slate-200 selection:bg-cyan-500/30">
          <Routes>
            <Route path="/" element={<MainLayout />} />
            <Route path="/share/:jobId" element={<PublicBlogViewer />} />
          </Routes>
        </main>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
