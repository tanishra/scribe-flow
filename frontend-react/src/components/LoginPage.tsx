import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GlassCard } from './GlassCard';
import { Mail, ArrowRight, Loader2, Globe, AlertCircle } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';

export function LoginPage() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const handleRequestOtp = async () => {
    if (!validateEmail(identifier)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await axios.post('http://localhost:8000/api/v1/auth/send-otp', { identifier });
      setStep('verify');
    } catch (e: any) {
      const msg = e.response?.data?.detail;
      const valErr = e.response?.data?.detail?.[0]?.msg;
      setError(valErr || msg || "Failed to send OTP. Please check your email format.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post('http://localhost:8000/api/v1/auth/verify-otp', { identifier, code: otp });
      login(res.data.access_token);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:8000/api/v1/auth/google-login', { 
        token: credentialResponse.credential 
      });
      login(res.data.access_token);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Google Login Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <GlassCard className="w-full max-w-md p-8">
        <h2 className="text-3xl font-bold text-white mb-2 text-center">Welcome Back</h2>
        <p className="text-slate-400 text-center mb-8">Sign in to create amazing content.</p>

        {/* Google Login */}
        <div className="mb-8 flex justify-center">
            <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google Login Failed")}
                theme="filled_black"
                shape="pill"
            />
        </div>

        <div className="flex items-center gap-4 mb-6">
            <div className="h-px bg-white/10 flex-1" />
            <span className="text-slate-500 text-sm">OR</span>
            <div className="h-px bg-white/10 flex-1" />
        </div>

        {/* Input Form (Email Only) */}
        <div className="space-y-4">
          {step === 'request' ? (
            <>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter your email"
                  className={`w-full bg-black/20 border ${error ? 'border-red-500/50' : 'border-white/10'} rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                />
              </div>
              <button
                onClick={handleRequestOtp}
                disabled={loading || !identifier}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Send OTP <ArrowRight className="w-4 h-4" /></>}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-400 text-center">
                Enter the code sent to <span className="text-white">{identifier}</span>
              </p>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="######"
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-center text-2xl tracking-widest text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                maxLength={6}
              />
              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Verify & Login"}
              </button>
              <button 
                onClick={() => { setStep('request'); setError(null); }}
                className="w-full text-slate-500 text-sm hover:text-white transition-colors"
              >
                Change Email
              </button>
            </>
          )}
          
          {error && (
            <div className="flex items-start gap-2 text-red-400 text-sm bg-red-900/10 p-3 rounded-lg border border-red-900/20">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
        
        <div className="mt-8 pt-4 border-t border-white/5 text-center text-xs text-slate-600">
           Dev Mode: Check backend console for Mock OTP codes.
        </div>
      </GlassCard>
    </div>
  );
}
