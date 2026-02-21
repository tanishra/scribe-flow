import { useState } from 'react';
import { useAuth, getApiUrl } from '../contexts/AuthContext';
import { GlassCard } from './GlassCard';
import { Mail, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const apiUrl = getApiUrl();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.post(`${apiUrl}/api/v1/auth/send-otp`, { identifier: email });
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${apiUrl}/api/v1/auth/verify-otp`, {
        identifier: email,
        code: otp
      });
      login(res.data.access_token);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid OTP.');
    } finally {
      setLoading(false);
    }
  };

  // CUSTOM GOOGLE LOGIN HOOK
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        // Use the access_token from the response
        const res = await axios.post(`${apiUrl}/api/v1/auth/google-login`, {
          token: tokenResponse.access_token
        });
        login(res.data.access_token);
      } catch (err) {
        setError('Google Login failed.');
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError('Google Sign-In failed'),
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-500 mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-slate-400">Secure access to your AI writing studio</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {step === 'email' ? (
          <div className="space-y-6">
            {/* 100% CUSTOM GOOGLE BUTTON - NO WHITE BACKGROUND */}
            <button
              onClick={() => googleLogin()}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/images/branding/googleg/svg/google_g_logo.svg" className="w-5 h-5" alt="Google" />
              <span>Continue with Google</span>
            </button>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0a0a0a] px-4 text-slate-500 font-bold tracking-widest">Or login with Email</span></div>
            </div>

            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="space-y-2 text-left">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                  <input
                    required
                    type="email"
                    placeholder="name@example.com"
                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue with OTP'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Enter Verification Code</label>
              <input
                required
                type="text"
                placeholder="000000"
                maxLength={6}
                className="w-full bg-black/20 border border-white/10 rounded-xl py-4 text-center text-2xl font-bold tracking-[0.5em] text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <p className="text-xs text-slate-500 text-center mt-4">
                We sent a 6-digit code to <span className="text-white font-medium">{email}</span>
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Login'}
            </button>
            <button
              type="button"
              onClick={() => setStep('email')}
              className="w-full text-slate-500 hover:text-white text-sm font-medium transition-colors py-2"
            >
              Change Email
            </button>
          </form>
        )}
      </GlassCard>
    </div>
  );
}
