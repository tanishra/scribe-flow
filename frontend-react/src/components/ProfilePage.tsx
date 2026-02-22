import { useState, useRef, useEffect } from 'react';
import { useAuth, getApiUrl } from '../contexts/AuthContext';
import { GlassCard } from './GlassCard';
import { User, Mail, Camera, Save, ArrowLeft, ShieldCheck, Zap, Coins, Globe, Key, BookOpen } from 'lucide-react';
import axios from 'axios';

export function ProfilePage({ onBack }: { onBack: () => void }) {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiUrl = getApiUrl();
  
  const [data, setData] = useState({
    full_name: '',
    gender: '',
    profession: '',
    source: '',
    bio: '',
    devto_api_key: '',
    hashnode_api_key: '',
    hashnode_publication_id: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setData({
        full_name: user.full_name || '',
        gender: user.gender || '',
        profession: user.profession || '',
        source: user.source || '',
        bio: user.bio || '',
        devto_api_key: user.devto_api_key || '',
        hashnode_api_key: user.hashnode_api_key || '',
        hashnode_publication_id: user.hashnode_publication_id || '',
      });
    }
  }, [user]);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await axios.patch(`${apiUrl}/api/v1/auth/profile`, data);
      await refreshUser();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      alert("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post(`${apiUrl}/api/v1/auth/profile-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await refreshUser();
    } catch (e) {
      alert("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Dashboard
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-6">
          <GlassCard className="text-center p-8 text-left">
            <div className="relative inline-block group">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-blue-500/30 bg-black/40 mb-4 mx-auto relative">
                {user.profile_image ? <img src={`${apiUrl}${user.profile_image}?t=${Date.now()}`} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-600"><User className="w-16 h-16" /></div>}
                {uploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-2 right-2 p-2 bg-blue-600 rounded-full text-white shadow-lg hover:bg-blue-500 transition-all opacity-0 group-hover:opacity-100"><Camera className="w-4 h-4" /></button>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            </div>
            <h3 className="text-xl font-bold text-white line-clamp-1">{user.full_name || 'Creator'}</h3>
            <p className="text-slate-500 text-sm mb-6">{user.profession || 'Blog Writer'}</p>
            <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-400"><Coins className="w-4 h-4" /><span className="text-xs font-bold uppercase">Balance</span></div>
                <div className="text-white font-black">{user.credits_left} Credits</div>
            </div>
          </GlassCard>
          <GlassCard className="p-6 text-left">
            <div className="flex items-center gap-3 text-green-400 text-sm font-semibold mb-4"><ShieldCheck className="w-5 h-5" /> Verified Identity</div>
            <div className="flex items-center gap-3 text-slate-300"><Mail className="w-4 h-4 text-slate-500" /><span className="text-sm truncate">{user.email}</span></div>
          </GlassCard>
        </div>

        <div className="md:col-span-2 space-y-6 text-left">
          <GlassCard className="p-8">
            <h3 className="text-2xl font-bold text-white mb-8 border-b border-white/5 pb-4">Personal Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Full Name</label><input value={data.full_name} onChange={e => setData({...data, full_name: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" /></div>
              <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Profession</label><input value={data.profession} onChange={e => setData({...data, profession: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" /></div>
            </div>
            <div className="space-y-2 mb-8"><label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Bio</label><textarea value={data.bio} onChange={e => setData({...data, bio: e.target.value})} rows={3} className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none" /></div>

            <h3 className="text-2xl font-bold text-white mb-8 border-b border-white/5 pb-4 flex items-center gap-3"><Globe className="w-6 h-6 text-blue-400" /> Integrations Vault</h3>
            <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3"><div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center font-bold text-white text-xs border border-white/10">DEV</div><div><h4 className="font-bold text-white">Dev.to</h4><p className="text-[10px] text-slate-500 uppercase font-black">Publish live to Dev.to</p></div></div>
                        {user.devto_api_key ? <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded font-black">CONNECTED</span> : <span className="text-[10px] bg-white/5 text-slate-500 px-2 py-1 rounded font-black">DISCONNECTED</span>}
                    </div>
                    <div className="relative"><Key className="absolute left-3 top-3 w-4 h-4 text-slate-600" /><input type="password" placeholder="Enter Dev.to API Key" value={data.devto_api_key} onChange={e => setData({...data, devto_api_key: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" /></div>
                </div>

                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3"><div className="w-10 h-10 bg-[#2942FF] rounded-lg flex items-center justify-center font-bold text-white text-xs border border-white/10">H</div><div><h4 className="font-bold text-white">Hashnode</h4><p className="text-[10px] text-slate-500 uppercase font-black">Publish live to Hashnode</p></div></div>
                        {user.hashnode_api_key && user.hashnode_publication_id ? <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded font-black">CONNECTED</span> : <span className="text-[10px] bg-white/5 text-slate-500 px-2 py-1 rounded font-black">DISCONNECTED</span>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative"><Key className="absolute left-3 top-3 w-4 h-4 text-slate-600" /><input type="password" placeholder="Personal Access Token" value={data.hashnode_api_key} onChange={e => setData({...data, hashnode_api_key: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" /></div>
                        <div className="relative"><BookOpen className="absolute left-3 top-3 w-4 h-4 text-slate-600" /><input type="text" placeholder="Publication ID" value={data.hashnode_publication_id} onChange={e => setData({...data, hashnode_publication_id: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" /></div>
                    </div>
                    <p className="text-[9px] text-slate-600 mt-2 italic">Settings &gt; Developer &gt; Tokens | Publication &gt; Settings &gt; ID</p>
                </div>
            </div>

            <div className="flex items-center justify-between pt-8 mt-8 border-t border-white/5">
                <div className="text-slate-500 text-sm">{success && <span className="text-green-400 flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Vault updated!</span>}</div>
                <button onClick={handleUpdate} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50">
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                  Save All Changes
                </button>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
