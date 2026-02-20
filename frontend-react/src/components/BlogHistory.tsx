import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, XCircle, Loader2, ExternalLink, FileText } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface BlogHistoryItem {
  job_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  blog_title: string;
  download_url?: string;
  created_at?: string;
}

export function BlogHistory({ onSelect }: { onSelect: (job_id: string) => void }) {
  const [blogs, setBlogs] = useState<BlogHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await axios.get(`${apiUrl}/api/v1/history`);
      setBlogs(res.data);
    } catch (e) {
      console.error("Failed to fetch history", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (blogs.length === 0) {
    return (
      <div className="text-center py-20">
        <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No History Yet</h3>
        <p className="text-slate-500">Your generated blogs will appear here.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-400" />
            Generation History
        </h2>
        <span className="text-sm text-slate-500">{blogs.length} articles generated</span>
      </div>

      <div className="grid gap-4">
        {blogs.map((blog) => (
          <motion.div
            key={blog.job_id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlassCard className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
              <div className="flex items-center gap-4 text-left">
                <div className={`p-3 rounded-xl ${
                    blog.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                    blog.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                    'bg-blue-500/10 text-blue-400'
                }`}>
                    {blog.status === 'completed' ? <CheckCircle className="w-6 h-6" /> :
                     blog.status === 'failed' ? <XCircle className="w-6 h-6" /> :
                     <Loader2 className="w-6 h-6 animate-spin" />}
                </div>
                
                <div>
                    <h4 className="font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                        {blog.blog_title}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1 uppercase tracking-wider font-bold">
                            {blog.status}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            ID: {blog.job_id.slice(0, 8)}...
                        </span>
                    </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {blog.status === 'completed' && (
                    <button 
                        onClick={() => onSelect(blog.job_id)}
                        className="flex items-center gap-2 bg-blue-600/20 text-blue-400 px-4 py-2 rounded-lg border border-blue-600/30 hover:bg-blue-600 hover:text-white transition-all text-sm font-semibold"
                    >
                        View Results
                        <ExternalLink className="w-4 h-4" />
                    </button>
                )}
                {blog.status === 'failed' && (
                     <div className="text-xs text-red-500 italic pr-4">Generation Error</div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
