import { useState, useEffect } from "react";
import axios from "axios";
import JSZip from "jszip";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Download, CheckCircle, AlertCircle, RefreshCw, Archive } from "lucide-react";
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
}

function safe_slug(title: string): string {
  const s = title.trim().toLowerCase();
  const slug = s.replace(/[^a-z0-9 _-]+/g, "").replace(/\s+/g, "_").trim();
  return slug || "blog";
}

export function BlogGenerator({ initialJobId, onReset }: { initialJobId?: string | null, onReset?: () => void }) {
  const [topic, setTopic] = useState("");
  const [jobId, setJobId] = useState<string | null>(initialJobId || null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "plan" | "evidence" | "images">("preview");
  const [isBundling, setIsBundling] = useState(false);

  const { refreshUser } = useAuth();
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
      const res = await axios.post(`${apiUrl}/api/v1/generate`, { topic });
      setJobId(res.data.job_id);
      // Refresh user credits immediately
      refreshUser();
      pollStatus(res.data.job_id);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to start generation. Is the backend running?");
    }
  };

  const pollStatus = async (id: string) => {
    // Immediate first fetch
    try {
        const res = await axios.get(`${apiUrl}/api/v1/status/${id}`);
        setStatus(res.data);
        if (res.data.status === "completed" || res.data.status === "failed") return;
    } catch (e) {}

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/v1/status/${id}`);
        const data = res.data;
        setStatus(data);

        if (data.status === "completed" || data.status === "failed") {
          clearInterval(interval);
        }
      } catch (err) {
        // Continue polling
      }
    }, 3000);
  };

  const downloadMarkdown = async () => {
    if (!status?.download_url) return;
    try {
      const res = await axios.get(`${apiUrl}${status.download_url}`);
      const blob = new Blob([res.data], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${status.blog_title || "blog"}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download failed", e);
    }
  };

  const downloadBundle = async () => {
    if (!status?.download_url || !status?.images) return;
    setIsBundling(true);
    const zip = new JSZip();
    const slug = safe_slug(status.blog_title || "blog");

    try {
      const mdRes = await axios.get(`${apiUrl}${status.download_url}`);
      zip.file(`${slug}.md`, mdRes.data);

      const imgFolder = zip.folder("images");
      if (imgFolder) {
        for (const imgUrl of status.images) {
          const filename = imgUrl.split("/").pop() || "image.png";
          const imgRes = await axios.get(`${apiUrl}${imgUrl}`, { responseType: 'blob' });
          imgFolder.file(filename, imgRes.data);
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}_bundle.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Bundling failed", e);
      alert("Failed to create ZIP bundle.");
    } finally {
      setIsBundling(false);
    }
  };

  const downloadImagesOnly = async () => {
    if (!status?.images || status.images.length === 0) return;
    setIsBundling(true);
    const zip = new JSZip();
    const slug = safe_slug(status.blog_title || "blog");

    try {
      for (const imgUrl of status.images) {
        const filename = imgUrl.split("/").pop() || "image.png";
        const imgRes = await axios.get(`${apiUrl}${imgUrl}`, { responseType: 'blob' });
        zip.file(filename, imgRes.data);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}_images_only.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Image bundling failed", e);
      alert("Failed to bundle images.");
    } finally {
      setIsBundling(false);
    }
  };

  const reset = () => {
    setTopic("");
    setJobId(null);
    setStatus(null);
    setError(null);
    if (onReset) onReset();
  };

  if (!jobId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <GlassCard className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
              ScribeFlow AI
            </h1>
            <p className="text-slate-400">Transform your ideas into high-impact articles.</p>
          </div>

          <div className="space-y-4">
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What do you want to write about today? (e.g. The Future of AI Agents in 2030)"
              className="w-full h-32 bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none transition-all"
            />
            
            <button
              onClick={startGeneration}
              disabled={!topic.trim()}
              className="w-full group relative overflow-hidden rounded-xl bg-blue-600/80 p-4 font-semibold text-white transition-all hover:bg-blue-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-center gap-2">
                <span>Start Generation</span>
                <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
            
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/10 p-3 rounded-lg border border-red-900/20">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    );
  }

  if (status?.status === "queued" || status?.status === "processing") {
    return <LoadingScreen />;
  }

  if (status?.status === "completed") {
    return (
      <div className="max-w-5xl mx-auto px-4 pb-20 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <button 
            onClick={reset}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Create New
          </button>
          
          <div className="flex gap-2">
            {["preview", "plan", "evidence", "images"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === tab 
                    ? "bg-white/10 text-white border border-white/20 shadow-lg" 
                    : "text-slate-400 hover:bg-white/5"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={downloadMarkdown}
              className="flex items-center gap-2 bg-white/5 text-slate-300 px-4 py-2 rounded-full border border-white/10 hover:bg-white/10 transition-colors"
            >
              <Download className="w-4 h-4" />
              Markdown
            </button>
            <button
              onClick={downloadImagesOnly}
              disabled={isBundling || !status.images || status.images.length === 0}
              className="flex items-center gap-2 bg-purple-600/20 text-purple-400 px-4 py-2 rounded-full border border-purple-600/30 hover:bg-purple-600/30 transition-colors disabled:opacity-50"
            >
              {isBundling ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
              Images (ZIP)
            </button>
            <button
              onClick={downloadBundle}
              disabled={isBundling}
              className="flex items-center gap-2 bg-blue-600/20 text-blue-400 px-4 py-2 rounded-full border border-blue-600/30 hover:bg-blue-600/30 transition-colors disabled:opacity-50"
            >
              {isBundling ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
              {isBundling ? "Bundling..." : "Bundle (ZIP)"}
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <GlassCard className="min-h-[60vh]">
              {activeTab === "preview" && (
                <div className="space-y-4 text-left">
                  <div className="flex items-center gap-2 text-green-400 mb-4 text-sm font-medium uppercase tracking-wider">
                    <CheckCircle className="w-4 h-4" />
                    Premium Content Ready
                  </div>
                  <FetchAndRenderMarkdown url={status.download_url!} />
                </div>
              )}

              {activeTab === "plan" && (
                <div className="space-y-6 text-left">
                  <h3 className="text-xl font-bold text-white border-b border-white/10 pb-2">Strategic Architecture</h3>
                  <div className="grid gap-4">
                    {status.plan?.tasks?.map((task: any) => (
                      <div key={task.id} className="bg-white/5 p-4 rounded-xl border border-white/5">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-blue-300">#{task.id} {task.title}</h4>
                          <span className="text-xs bg-white/10 px-2 py-1 rounded">{task.target_words} words</span>
                        </div>
                        <p className="text-slate-300 text-sm mb-3">{task.goal}</p>
                        <ul className="list-disc list-inside text-slate-400 text-sm space-y-1">
                          {task.bullets.map((b: string, i: number) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "evidence" && (
                <div className="space-y-6 text-left">
                  <h3 className="text-xl font-bold text-white border-b border-white/10 pb-2">Research Evidence</h3>
                  {status.evidence && status.evidence.length > 0 ? (
                    <div className="grid gap-4">
                      {status.evidence.map((item: any, i: number) => (
                        <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-colors text-left">
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 font-medium hover:underline block mb-1">
                            {item.title}
                          </a>
                          <div className="flex gap-3 text-xs text-slate-500 mb-2">
                            <span>{item.source || "Web"}</span>
                            <span>•</span>
                            <span>{item.published_at || "Unknown Date"}</span>
                          </div>
                          <p className="text-slate-300 text-sm italic">"{item.snippet}"</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500">No external research was required for this topic.</p>
                  )}
                </div>
              )}

              {activeTab === "images" && (
                <div className="space-y-6 text-left">
                  <h3 className="text-xl font-bold text-white border-b border-white/10 pb-2">Visual Gallery</h3>
                  {status.images && status.images.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {status.images.map((imgUrl: string, i: number) => (
                        <div key={i} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                          <img 
                            src={`${apiUrl}${imgUrl}?t=${Date.now()}`} 
                            alt={`Generated visual ${i+1}`}
                            className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                            <p className="text-xs text-slate-300">Generated Asset #{i+1}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-20">No unique images were generated for this post.</p>
                  )}
                </div>
              )}
            </GlassCard>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <GlassCard className="max-w-md w-full text-center border-red-500/30">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Generation Failed</h3>
        <p className="text-red-300/80 mb-6">{status?.error || "An unexpected error occurred."}</p>
        <button onClick={reset} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-full transition-colors">
          Try Again
        </button>
      </GlassCard>
    </div>
  );
}

function FetchAndRenderMarkdown({ url }: { url: string }) {
  const [content, setContent] = useState<string | null>(null);
  const apiUrl = getApiUrl();

  useEffect(() => {
    axios.get(`${apiUrl}${url}`).then(res => setContent(res.data));
  }, [url, apiUrl]);

  if (!content) return <div className="animate-pulse h-96 bg-white/5 rounded-xl" />;
  
  return <MarkdownRenderer content={content} />;
}
