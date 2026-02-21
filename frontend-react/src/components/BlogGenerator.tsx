import { useState, useEffect } from "react";
import axios from "axios";
import JSZip from "jszip";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Send, Download, CheckCircle, AlertCircle, 
    RefreshCw, Archive, Edit3, Save, Share2, 
    ChevronDown, Sparkles, Search as SearchIcon, Globe, X, Loader2, Rocket, ExternalLink
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { LoadingScreen } from "./LoadingScreen";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { useAuth, getApiUrl } from "../contexts/AuthContext";

interface JobStatus {
  job_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  blog_title?: string;
  download_url?: string;
  images?: string[];
  plan?: any;
  evidence?: any[];
  error?: string;
  meta_description?: string;
  keywords?: string;
}

const TONES = [
    "Professional", "Conversational", "Witty", "Technical", "Storytelling", "Academic"
];

function safe_slug(title: string): string {
  const s = title.trim().toLowerCase();
  const slug = s.replace(/[^a-z0-9 _-]+/g, "").replace(/\s+/g, "_").trim();
  return slug || "blog";
}

export function BlogGenerator({ initialJobId, onReset }: { initialJobId?: string | null, onReset?: () => void }) {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("Professional");
  const [jobId, setJobId] = useState<string | null>(initialJobId || null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "plan" | "evidence" | "images" | "seo" | "publish">("preview");
  const [isBundling, setIsBundling] = useState(false);
  
  // Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Publishing State
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishUrl, setPublishUrl] = useState<string | null>(null);

  const { user, refreshUser } = useAuth();
  const apiUrl = getApiUrl();

  useEffect(() => {
    if (initialJobId) {
      setJobId(initialJobId);
      pollStatus(initialJobId);
    }
  }, [initialJobId]);

  const startGeneration = async () => {
    if (!topic.trim()) return;
    setError(null);
    setStatus(null);
    try {
      const res = await axios.post(`${apiUrl}/api/v1/generate`, { topic, tone });
      setJobId(res.data.job_id);
      refreshUser();
      pollStatus(res.data.job_id);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to start generation.");
    }
  };

  const pollStatus = async (id: string) => {
    try {
        const res = await axios.get(`${apiUrl}/api/v1/status/${id}`);
        setStatus(res.data);
        if (res.data.status === "completed" || res.data.status === "failed") {
            if (res.data.status === "completed") fetchMarkdownContent(res.data.download_url);
            return;
        }
    } catch (e) {}
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/v1/status/${id}`);
        const data = res.data;
        setStatus(data);
        if (data.status === "completed" || data.status === "failed") {
          clearInterval(interval);
          if (data.status === "completed") fetchMarkdownContent(data.download_url);
        }
      } catch (err) { }
    }, 3000);
  };

  const fetchMarkdownContent = async (url?: string) => {
    if (!url) return;
    try {
        const res = await axios.get(`${apiUrl}${url}`);
        setContent(res.data);
    } catch (e) { }
  };

  const handleSaveEdit = async () => {
    if (!jobId) return;
    setIsSaving(true);
    try {
        await axios.patch(`${apiUrl}/api/v1/blogs/${jobId}`, { content: editedContent });
        setIsEditing(false);
    } catch (e) {
        alert("Failed to save changes.");
    } finally {
        setIsSaving(false);
    }
  };

  const handlePublishDevTo = async () => {
    if (!jobId) return;
    setIsPublishing(true);
    setPublishUrl(null);
    try {
        const res = await axios.post(`${apiUrl}/api/v1/publish/devto/${jobId}`);
        setPublishUrl(res.data.url);
        alert(res.data.message);
    } catch (e: any) {
        alert(e.response?.data?.detail || "Failed to publish to Dev.to");
    } finally {
        setIsPublishing(false);
    }
  };

  const handleShare = () => {
    if (!jobId) return;
    const shareUrl = `${window.location.origin}/share/${jobId}`;
    navigator.clipboard.writeText(shareUrl);
    alert("Public share link copied to clipboard!");
  };

  const downloadBundle = async () => {
    if (!status?.download_url || !status?.images) return;
    setIsBundling(true);
    const zip = new JSZip();
    const slug = safe_slug(status.blog_title || "blog");
    try {
      zip.file(`${slug}.md`, editedContent);
      const imgFolder = zip.folder("images");
      if (imgFolder) {
        for (const imgUrl of status.images) {
          const filename = imgUrl.split("/").pop()?.split("?")[0] || "image.png";
          const imgRes = await axios.get(`${apiUrl}${imgUrl}`, { responseType: 'blob' });
          imgFolder.file(filename, imgRes.data);
        }
      }
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}_bundle.zip`;
      a.click();
    } catch (e) {
      alert("Failed to create ZIP bundle.");
    } finally {
      setIsBundling(false);
    }
  };

  const reset = () => {
    setTopic(""); setJobId(null); setStatus(null); setError(null); setIsEditing(false); setPublishUrl(null);
    if (onReset) onReset();
  };

  if (!jobId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <GlassCard className="w-full max-w-2xl p-8 text-center">
          <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">ScribeFlow <span className="text-blue-500">AI</span></h1>
          <p className="text-slate-400 mb-8">High-impact technical writing, powered by agents.</p>
          <div className="space-y-6">
            <textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What should the AI write about today?" className="w-full h-32 bg-black/40 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none transition-all" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                    <select value={tone} onChange={(e) => setTone(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                        {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
                <div className="flex items-center gap-2 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl text-blue-400 text-xs font-bold"><Globe className="w-4 h-4" /> Deep Research Enabled</div>
            </div>
            <button onClick={startGeneration} disabled={!topic.trim()} className="w-full group rounded-2xl bg-blue-600 p-4 font-bold text-white hover:bg-blue-500 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                Generate Article <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            </button>
            {error && <div className="text-red-400 text-xs bg-red-900/10 p-3 rounded-xl border border-red-900/20 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}
          </div>
        </GlassCard>
      </div>
    );
  }

  if (status?.status === "queued" || status?.status === "processing" || (jobId && !status)) return <LoadingScreen />;

  if (status?.status === "completed") {
    return (
      <div className="max-w-6xl mx-auto px-4 pb-20 space-y-6">
        <div className="flex flex-wrap gap-4 items-center justify-between bg-black/20 p-4 rounded-3xl border border-white/5">
          <div className="flex gap-2">
            <button onClick={reset} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-xl text-xs font-bold border border-white/5"><RefreshCw className="w-3 h-3" /> New</button>
            <button onClick={handleShare} className="flex items-center gap-2 text-blue-400 hover:text-white transition-colors bg-blue-500/10 px-4 py-2 rounded-xl text-xs font-bold border border-blue-500/10"><Share2 className="w-3 h-3" /> Share</button>
          </div>
          <div className="flex gap-1 bg-black/40 p-1 rounded-xl">
            {["preview", "plan", "evidence", "images", "seo", "publish"].map((tab) => (
              <button key={tab} onClick={() => { setActiveTab(tab as any); setIsEditing(false); }} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? "bg-white/10 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}>{tab}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsEditing(!isEditing)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${isEditing ? 'bg-orange-500/20 text-orange-400 border-orange-500/20' : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'}`}>{isEditing ? <X className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />} {isEditing ? "Cancel" : "Edit"}</button>
            <button onClick={downloadBundle} disabled={isBundling} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50"><Archive className="w-3 h-3" /> ZIP</button>
          </div>
        </div>

        <GlassCard className="min-h-[60vh] p-8">
          {activeTab === "preview" && (
            <div className="space-y-4 text-left">
              <div className="flex justify-between items-center mb-8">
                <div className="text-green-400 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2"><CheckCircle className="w-4 h-4" /> {tone} Tone</div>
                {isEditing && <button onClick={handleSaveEdit} disabled={isSaving} className="bg-green-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50">{isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save Changes</button>}
              </div>
              {isEditing ? <textarea value={editedContent} onChange={(e) => setContent(e.target.value)} className="w-full min-h-[70vh] bg-black/40 border border-white/10 rounded-2xl p-8 text-slate-300 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none" /> : <MarkdownRenderer content={editedContent} />}
            </div>
          )}

          {activeTab === "publish" && (
              <div className="py-12 max-w-2xl mx-auto text-center">
                  <div className="mb-12">
                    <Rocket className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Publishing Hub</h2>
                    <p className="text-slate-400 mt-2">Connect your favorite platforms and share your masterpiece with the world.</p>
                  </div>

                  <div className="space-y-4">
                      <div className="p-8 rounded-3xl bg-white/5 border border-white/10 text-left hover:border-blue-500/30 transition-all group">
                          <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center font-bold text-white border border-white/10">DEV</div>
                                  <div>
                                      <h4 className="text-xl font-bold text-white">Dev.to</h4>
                                      <p className="text-xs text-slate-500">Fastest-growing community for developers</p>
                                  </div>
                              </div>
                              {user?.devto_api_key ? (
                                  <span className="text-[10px] bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full font-black uppercase tracking-widest">Connected</span>
                              ) : (
                                  <span className="text-[10px] bg-red-500/10 text-red-400 px-3 py-1 rounded-full font-black uppercase tracking-widest">Key Missing</span>
                              )}
                          </div>

                          {!user?.devto_api_key ? (
                              <p className="text-sm text-slate-400 bg-black/20 p-4 rounded-2xl border border-white/5 italic">
                                  Go to your <span className="text-blue-400 font-bold">Profile Page</span> to add your Dev.to API key and enable one-click publishing.
                              </p>
                          ) : (
                              <div className="flex flex-col gap-4">
                                  <button 
                                    onClick={handlePublishDevTo}
                                    disabled={isPublishing}
                                    className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                  >
                                      {isPublishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
                                      {publishUrl ? "RE-POST AS DRAFT" : "POST AS DRAFT TO DEV.TO"}
                                  </button>
                                  {publishUrl && (
                                      <a href={publishUrl} target="_blank" className="flex items-center justify-center gap-2 text-blue-400 text-sm font-bold hover:underline">
                                          View Draft on Dev.to <ExternalLink className="w-4 h-4" />
                                      </a>
                                  )}
                              </div>
                          )}
                      </div>
                      <div className="p-8 rounded-3xl bg-white/5 border border-white/10 text-left opacity-40 grayscale pointer-events-none">
                          <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center font-bold text-white border border-white/10">HN</div>
                              <div>
                                  <h4 className="text-xl font-bold text-white">Hashnode</h4>
                                  <p className="text-xs text-slate-500 italic">Coming Soon...</p>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === "seo" && (
              <div className="space-y-12 text-left py-8">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><SearchIcon className="w-5 h-5 text-blue-400" /> Meta Description</h3>
                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl text-slate-300 italic leading-relaxed">"{status.meta_description || "Generating..."}"</div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-400" /> Keywords</h3>
                    <div className="flex flex-wrap gap-2">{status.keywords?.split(",").map((kw, i) => <span key={i} className="bg-purple-500/10 border border-purple-500/20 text-purple-400 px-4 py-2 rounded-full text-xs font-bold">#{kw.trim()}</span>)}</div>
                  </div>
              </div>
          )}

          {activeTab === "plan" && (
            <div className="space-y-6 text-left">
              <h3 className="text-xl font-bold text-white border-b border-white/10 pb-4">Strategic Architecture</h3>
              <div className="grid gap-4">{status.plan?.tasks?.map((task: any) => (<div key={task.id} className="bg-white/5 p-6 rounded-2xl border border-white/5"><div className="flex justify-between items-start mb-4"><h4 className="font-bold text-blue-300">#{task.id} {task.title}</h4><span className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full text-slate-400">{task.target_words} words</span></div><p className="text-slate-300 text-sm mb-4 leading-relaxed">{task.goal}</p></div>))}</div>
            </div>
          )}

          {activeTab === "images" && (
            <div className="space-y-6 text-left">
              <h3 className="text-xl font-bold text-white border-b border-white/10 pb-4">Visual Gallery</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">{status.images?.map((imgUrl: string, i: number) => (<div key={i} className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 shadow-2xl"><img src={`${apiUrl}${imgUrl}?t=${Date.now()}`} alt="Visual" className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105" /></div>))}</div>
            </div>
          )}
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <GlassCard className="max-w-md w-full text-center border-red-500/30 p-12">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
        <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Workflow Stalled</h3>
        <p className="text-red-300/80 mb-8">{status?.error || "The generation failed to complete."}</p>
        <button onClick={reset} className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-2xl font-bold transition-all uppercase tracking-widest text-xs">Restart Workflow</button>
      </GlassCard>
    </div>
  );
}
