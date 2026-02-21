import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { GlassCard } from './GlassCard';
import { getApiUrl } from '../contexts/AuthContext';

export function PublicBlogViewer() {
  const { jobId } = useParams<{ jobId: string }>();
  const [blog, setBlog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = getApiUrl();

  useEffect(() => {
    if (jobId) {
      fetchBlog();
    }
  }, [jobId]);

  const fetchBlog = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/v1/public/blogs/${jobId}`);
      setBlog(res.data);
    } catch (e) {
      setError("Blog not found or not available.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white p-4">
        <GlassCard className="max-w-md w-full text-center border-red-500/30">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Error</h3>
          <p className="text-red-300/80">{error}</p>
          <Link to="/" className="mt-6 inline-flex items-center gap-2 text-blue-400 hover:text-white transition-colors font-bold uppercase text-xs tracking-widest">
            <ArrowLeft className="w-4 h-4" /> Go to App
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-200 selection:bg-cyan-500/30 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex justify-start">
            <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors font-bold uppercase text-[10px] tracking-widest group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                ScribeFlow Home
            </Link>
        </div>

        <GlassCard className="mb-8 p-8 text-center">
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">{blog.title}</h1>
            {blog.meta_description && (
                <p className="text-slate-400 text-lg italic max-w-2xl mx-auto">
                    {blog.meta_description}
                </p>
            )}
        </GlassCard>

        <GlassCard className="min-h-[60vh] p-8">
            <MarkdownRenderer content={blog.content} />
        </GlassCard>
        
        <div className="mt-12 text-center border-t border-white/5 pt-8">
            <p className="text-slate-500 text-xs uppercase tracking-[0.3em] font-bold mb-4">Crafted with intelligence</p>
            <Link to="/" className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all font-black text-xs">
                GENERATE YOUR OWN BLOG WITH SCRIBEFLOW AI
            </Link>
        </div>
      </div>
    </div>
  );
}
