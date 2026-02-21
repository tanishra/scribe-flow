import { Background } from "./components/Background";
import { BlogGenerator } from "./components/BlogGenerator";
import { LoginPage } from "./components/LoginPage";
import { OnboardingWizard } from "./components/OnboardingWizard";
import { ProfilePage } from "./components/ProfilePage";
import { BlogHistory } from "./components/BlogHistory";
import { SupportModal } from "./components/SupportModal";
import { AdminDashboard } from "./components/AdminDashboard";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { LogOut, Zap, User as UserIcon, Clock, LayoutDashboard, HelpCircle, ShieldCheck } from "lucide-react";
import { useState } from "react";
import axios from "axios";

// ============================================================
// CONFIGURATION: Fetched from environment variables
// ============================================================
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function MainLayout() {
  const { user, logout, refreshUser } = useAuth();
  const [view, setView] = useState<'dashboard' | 'profile' | 'history' | 'admin'>('dashboard');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  const handleUpgrade = async () => {
    try {
        const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "" : 'http://localhost:8000');
        // 1. Create Order on Backend
        const res = await axios.post(`${apiUrl}/api/v1/payment/create-order`);
        const order = res.data;

        if (order.mock) {
            // Instant success for Dev mode
            await axios.post(`${apiUrl}/api/v1/payment/verify`, {
                razorpay_order_id: order.order_id,
                razorpay_payment_id: "pay_mock_123",
                razorpay_signature: "sig_mock_123"
            });
            await refreshUser();
            alert("Upgrade Successful (Mock Mode)!");
            return;
        }

        // 2. Open Razorpay Checkout Modal
        const options = {
            key: order.key,
            amount: order.amount,
            currency: "INR",
            name: "ScribeFlow AI",
            description: "Premium Pro Upgrade",
            order_id: order.order_id,
            handler: async function (response: any) {
                // 3. Verify Payment on Backend
                try {
                    await axios.post(`${apiUrl}/api/v1/payment/verify`, {
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature
                    });
                    await refreshUser();
                    alert("Payment Successful! You are now a Premium user.");
                } catch (err) {
                    alert("Verification failed. Please contact support.");
                }
            },
            prefill: {
                name: user?.full_name || "",
                email: user?.email || "",
            },
            theme: {
                color: "#2563eb",
            },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();

    } catch (e) {
        alert("Could not initiate payment.");
        console.error(e);
    }
  };

  const handleViewHistoryItem = (jobId: string) => {
    setSelectedJobId(jobId);
    setView('dashboard');
  };

  if (!user) return <LoginPage />;

  if (!user.onboarding_completed) {
    return <OnboardingWizard />;
  }

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  return (
    <>
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
            {!user.is_premium && (
               <div className="hidden md:flex items-center gap-4 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
                  <span>Credits: {user.credits_left}/3</span>
                  <button onClick={handleUpgrade} className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 border-l border-white/10 pl-4">
                     <Zap className="w-3 h-3" /> Upgrade
                  </button>
               </div>
            )}

            <button 
                onClick={() => setIsSupportOpen(true)}
                className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                title="Help & Feedback"
            >
                <HelpCircle className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                <button 
                    onClick={() => setView('profile')}
                    className="flex items-center gap-3 group text-left"
                >
                    <div className="text-right hidden sm:block">
                        <p className="text-sm text-white font-medium group-hover:text-blue-400 transition-colors">
                            {user.full_name || 'My Profile'}
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                            {user.is_premium ? 'Premium Pro' : 'Free Tier'}
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

                <button 
                    onClick={logout}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
          </div>
        </div>
      </header>

      <div className="pt-24 pb-12">
        {view === 'dashboard' && (
          <BlogGenerator initialJobId={selectedJobId} onReset={() => setSelectedJobId(null)} />
        )}
        {view === 'history' && (
          <BlogHistory onSelect={handleViewHistoryItem} />
        )}
        {view === 'profile' && (
          <ProfilePage onBack={() => setView('dashboard')} />
        )}
        {view === 'admin' && (
          <AdminDashboard onBack={() => setView('dashboard')} />
        )}
      </div>

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
          <MainLayout />
        </main>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
