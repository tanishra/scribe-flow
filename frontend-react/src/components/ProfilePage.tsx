import { useState, useRef, useEffect } from 'react';
import { useAuth, getApiUrl } from '../contexts/AuthContext';
import { GlassCard } from './GlassCard';
import { User, Mail, Camera, Save, ArrowLeft, ShieldCheck, Zap, Coins, Globe, Key, BookOpen, HelpCircle, ExternalLink, Code, AlertCircle, Linkedin, PlusCircle, CheckCircle2, PlayCircle, Info } from 'lucide-react';
import axios from 'axios';

// Custom Brand Icons
const HashnodeIcon = ({ size = "w-5 h-5" }: { size?: string }) => (
  <svg viewBox="0 0 24 24" className={`${size} fill-current`} xmlns="http://www.w3.org/2000/svg">
    <path d="M22.351 8.019l-6.37-6.37a5.63 5.63 0 00-7.962 0l-6.37 6.37a5.63 5.63 0 000 7.962l6.37 6.37a5.63 5.63 0 007.962 0l6.37-6.37a5.63 5.63 0 000-7.962zM12 15.953a3.953 3.953 0 110-7.906 3.953 3.953 0 010 7.906z" />
  </svg>
);

const MediumIcon = ({ size = "w-5 h-5" }: { size?: string }) => (
  <svg viewBox="0 0 24 24" className={`${size} fill-current`} xmlns="http://www.w3.org/2000/svg">
    <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.41-3.38 6.41s-3.38-2.87-3.38-6.41 1.51-6.41 3.38-6.41 3.38 2.87 3.38 6.41zM24 12c0 3.17-.53 5.75-1.19 5.75s-1.19-2.58-1.19-5.75.53-5.75 1.19-5.75S24 8.83 24 12z" />
  </svg>
);

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
    medium_token: '',
    linkedin_access_token: '',
    linkedin_urn: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHashnodeGuide, setShowHashnodeGuide] = useState(false);
  const [showLinkedinGuide, setShowLinkedinGuide] = useState(false);

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
        medium_token: user.medium_token || '',
        linkedin_access_token: user.linkedin_access_token || '',
        linkedin_urn: user.linkedin_urn || '',
      });
    }
  }, [user]);

  const handleUpdate = async () => {
    setLoading(true);
    setError(null);
    try {
      await axios.patch(`${apiUrl}/api/v1/auth/profile`, data);
      await refreshUser();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post(`${apiUrl}/api/v1/auth/profile-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await refreshUser();
    } catch (e) {
      setError("Failed to upload image.");
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
                {/* LinkedIn */}
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#0077B5] rounded-lg flex items-center justify-center text-white border border-white/10"><Linkedin className="w-5 h-5" /></div>
                          <div><h4 className="font-bold text-white">LinkedIn</h4><p className="text-[10px] text-slate-500 uppercase font-black">Viral Social Teasers</p></div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button 
                              onClick={() => setShowLinkedinGuide(!showLinkedinGuide)}
                              className="flex items-center gap-1.5 text-[10px] font-black text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider"
                            >
                              <HelpCircle className="w-3 h-3" />
                              {showLinkedinGuide ? "Hide Guide" : "Setup Tutorial"}
                            </button>
                            {user.linkedin_access_token && user.linkedin_urn ? (
                                <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded font-black">CONNECTED</span>
                            ) : (user.linkedin_access_token || user.linkedin_urn) ? (
                                <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-1 rounded font-black">PARTIAL SETUP</span>
                            ) : (
                                <span className="text-[10px] bg-white/5 text-slate-500 px-2 py-1 rounded font-black">DISCONNECTED</span>
                            )}
                        </div>
                    </div>

                    {showLinkedinGuide && (
                      <div className="mb-6 p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500 overflow-hidden">
                        <div className="space-y-5">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">1</div>
                            <div>
                              <p className="text-[11px] font-black text-white uppercase tracking-wider mb-1">Create Developer App</p>
                              <p className="text-xs text-slate-400 leading-relaxed">
                                Create an app at <a href="https://www.linkedin.com/developers/apps" target="_blank" className="text-blue-400 underline inline-flex items-center gap-1">LinkedIn Developers <ExternalLink className="w-3 h-3" /></a>. Associate it with any Company Page you have.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">2</div>
                            <div>
                              <p className="text-[11px] font-black text-white uppercase tracking-wider mb-1">Get Access Token</p>
                              <p className="text-xs text-slate-400 leading-relaxed mb-2">
                                Open the <a href="https://www.linkedin.com/developers/tools/oauth/token-generator" target="_blank" className="text-blue-400 underline inline-flex items-center gap-1">Token Generator <ExternalLink className="w-3 h-3" /></a>.
                              </p>
                              <ul className="text-[11px] text-slate-500 space-y-1 list-disc ml-4 italic">
                                <li>Select your App.</li>
                                <li>Check <code className="text-blue-300 font-bold">w_member_social</code> scope.</li>
                                <li>Click <b>"Request Token"</b> and follow the popup to authorize. Copy the long <b>Access Token</b> below.</li>
                              </ul>
                            </div>
                          </div>

                          <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-4">
                            <div className="flex items-center gap-3 border-b border-white/5 pb-2">
                                <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-black flex-shrink-0">3</div>
                                <p className="text-[11px] font-black text-white uppercase tracking-wider">How to find your "Person ID" (Visual Guide)</p>
                            </div>
                            <div className="space-y-3">
                                <p className="text-xs text-slate-400">On the <b>same</b> Token Generator page, scroll down to <span className="text-white font-bold">Step 2: Use your token</span>.</p>
                                <div className="bg-black/40 p-4 rounded-xl border border-white/10 space-y-3">
                                    <p className="text-[10px] text-slate-500 uppercase font-black">Action:</p>
                                    <div className="flex items-center justify-between bg-white/5 p-2 rounded-lg border border-white/5">
                                        <code className="text-xs text-blue-300">GET /me</code>
                                        <span className="text-[10px] bg-blue-600 text-white px-3 py-1 rounded font-bold">RUN</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 uppercase font-black mt-2">The Result will look like this:</p>
                                    <div className="text-[10px] text-green-400 font-mono bg-black/20 p-2 rounded-lg leading-tight">
                                        {'{'}<br />
                                        &nbsp;&nbsp;"localizedLastName": "User",<br />
                                        &nbsp;&nbsp;<span className="bg-yellow-500/30">"id": "ABC123XYZ"</span>,  &lt;-- COPY THIS VALUE<br />
                                        &nbsp;&nbsp;"localizedFirstName": "John"<br />
                                        {'}'}
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                    Your <b>Person ID</b> is that code (e.g. <code className="text-orange-300">ABC123XYZ</code>). Copy it and paste it in the field below.
                                </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-3 text-[10px] text-blue-300 italic">
                          <Info className="w-4 h-4 flex-shrink-0" />
                          Tip: You can save just the Access Token now and add the ID later if you're stuck!
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                          <Key className="absolute left-3 top-3 w-4 h-4 text-slate-600" />
                          <input 
                            type="password" 
                            name="li_token_unique" 
                            autoComplete="new-password" 
                            placeholder="Paste Access Token here" 
                            value={data.linkedin_access_token} 
                            onChange={e => setData({...data, linkedin_access_token: e.target.value})} 
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" 
                          />
                        </div>
                        <div className="relative">
                          <User className="absolute left-3 top-3 w-4 h-4 text-slate-600" />
                          <input 
                            type="text" 
                            name="li_urn_unique" 
                            autoComplete="new-password" 
                            placeholder="Paste Person ID here" 
                            value={data.linkedin_urn} 
                            onChange={e => setData({...data, linkedin_urn: e.target.value})} 
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" 
                          />
                        </div>
                    </div>
                </div>

                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3"><div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center font-bold text-white text-xs border border-white/10">DEV</div><div><h4 className="font-bold text-white">Dev.to</h4><p className="text-[10px] text-slate-500 uppercase font-black">Publish live to Dev.to</p></div></div>
                        {user.devto_api_key ? <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded font-black">CONNECTED</span> : <span className="text-[10px] bg-white/5 text-slate-500 px-2 py-1 rounded font-black">DISCONNECTED</span>}
                    </div>
                    <div className="relative"><Key className="absolute left-3 top-3 w-4 h-4 text-slate-600" /><input type="password" name="devto_key" autoComplete="off" placeholder="Enter Dev.to API Key" value={data.devto_api_key} onChange={e => setData({...data, devto_api_key: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" /></div>
                </div>

                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#2942FF] rounded-lg flex items-center justify-center text-white border border-white/10"><HashnodeIcon /></div>
                          <div><h4 className="font-bold text-white">Hashnode</h4><p className="text-[10px] text-slate-500 uppercase font-black">Publish live to Hashnode</p></div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button 
                              onClick={() => setShowHashnodeGuide(!showHashnodeGuide)}
                              className="flex items-center gap-1.5 text-[10px] font-black text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider"
                            >
                              <HelpCircle className="w-3 h-3" />
                              {showHashnodeGuide ? "Close Guide" : "How to find?"}
                            </button>
                            {user.hashnode_api_key && user.hashnode_publication_id ? <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded font-black">CONNECTED</span> : <span className="text-[10px] bg-white/5 text-slate-500 px-2 py-1 rounded font-black">DISCONNECTED</span>}
                        </div>
                    </div>

                    {showHashnodeGuide && (
                      <div className="mb-6 p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="pb-3 border-b border-white/5">
                          <p className="text-[10px] font-black text-blue-400 uppercase mb-1 flex items-center gap-2"><Key className="w-3 h-3" /> 1. Personal Access Token</p>
                          <p className="text-xs text-slate-400 leading-relaxed">Go to <a href="https://hashnode.com/settings/developer" target="_blank" className="text-slate-200 underline">Settings &gt; Developer</a>. Click "Generate New Token" and copy the key.</p>
                        </div>
                        
                        <div>
                          <p className="text-[10px] font-black text-blue-400 uppercase mb-1 flex items-center gap-2"><BookOpen className="w-3 h-3" /> 2. Publication ID (Standard)</p>
                          <p className="text-xs text-slate-400 leading-relaxed">Go to your <span className="text-slate-200">Blog Dashboard</span>. The ID is in your URL: <code className="bg-black/40 px-1 py-0.5 rounded text-[10px] text-blue-300">hashnode.com/<b>[ID-HERE]</b>/dashboard</code></p>
                        </div>

                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                          <p className="text-[10px] font-black text-white uppercase mb-2 flex items-center gap-2"><Code className="w-3 h-3 text-orange-400" /> Advanced Method (If URL fails)</p>
                          <ol className="text-[11px] text-slate-400 space-y-2 list-decimal ml-4">
                            <li>Open <a href="https://gql.hashnode.com/" target="_blank" className="text-blue-400 underline">Hashnode Playground</a></li>
                            <li>In <b>Headers</b>, add: <code className="text-[10px] text-slate-300">{"{"}"Authorization": "YOUR_TOKEN"{"}"}</code></li>
                            <li>Run this query:
                              <pre className="mt-1 bg-black/40 p-2 rounded text-[9px] text-blue-200 overflow-x-auto">
                                {"query { me { publications(first: 5) { edges { node { id title } } } } }"}
                              </pre>
                            </li>
                            <li>Copy the <code className="text-orange-300">id</code> from the result.</li>
                          </ol>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative"><Key className="absolute left-3 top-3 w-4 h-4 text-slate-600" /><input type="password" name="hashnode_token" autoComplete="off" placeholder="Personal Access Token" value={data.hashnode_api_key} onChange={e => setData({...data, hashnode_api_key: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" /></div>
                        <div className="relative"><BookOpen className="absolute left-3 top-3 w-4 h-4 text-slate-600" /><input type="text" name="hashnode_pub" autoComplete="off" placeholder="Publication ID" value={data.hashnode_publication_id} onChange={e => setData({...data, hashnode_publication_id: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" /></div>
                    </div>
                </div>

                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center text-white border border-white/10"><MediumIcon /></div>
                          <div><h4 className="font-bold text-white">Medium</h4><p className="text-[10px] text-slate-500 uppercase font-black">Publish live to Medium</p></div>
                        </div>
                        {user.medium_token ? <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded font-black">CONNECTED</span> : <span className="text-[10px] bg-white/5 text-slate-500 px-2 py-1 rounded font-black">DISCONNECTED</span>}
                    </div>
                    <div className="relative"><Key className="absolute left-3 top-3 w-4 h-4 text-slate-600" /><input type="password" name="medium_token" autoComplete="off" placeholder="Enter Medium Integration Token" value={data.medium_token} onChange={e => setData({...data, medium_token: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" /></div>
                </div>
            </div>

            <div className="flex items-center justify-between pt-8 mt-8 border-t border-white/5">
                <div className="text-slate-500 text-sm">
                    {success && <span className="text-green-400 flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Vault updated!</span>}
                    {error && <span className="text-red-400 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {error}</span>}
                </div>
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
