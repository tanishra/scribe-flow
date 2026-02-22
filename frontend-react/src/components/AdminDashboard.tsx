import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, FileText, MessageSquare, ShieldCheck, Zap, 
    Mail, Calendar, Search, ArrowLeft, Trash2, 
    TrendingUp, Coins, BarChart3, MoreVertical, UserX, UserCheck, ChevronRight,
    ExternalLink, Eye, X, Globe, Key, BookOpen
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { getApiUrl } from '../contexts/AuthContext';
import { MarkdownRenderer } from './MarkdownRenderer';

interface UserData {
  id: number;
  email: string;
  full_name: string;
  profession: string;
  credits_left: number;
  is_premium: boolean;
  is_active: boolean;
  devto_api_key?: string;
  hashnode_api_key?: string;
  created_at: string;
}

interface FeedbackData {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
}

interface BlogData {
    id: number;
    job_id: string;
    title: string;
    topic: string;
    status: string;
    devto_url?: string;
    hashnode_url?: string;
    user_id: number;
    user_name: string;
    user_email: string;
    created_at: string;
}

interface Stats {
  total_users: number;
  total_blogs: number;
  total_feedback: number;
  premium_users: number;
  estimated_revenue: number;
  devto_published: number;
  hashnode_published: number;
}

export function AdminDashboard({ onBack }: { onBack: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [blogs, setBlogs] = useState<BlogData[]>([]);
  const [feedback, setFeedback] = useState<FeedbackData[]>([]);
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'blogs' | 'feedback' | 'analytics'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Blog Detail Modal
  const [selectedBlog, setSelectedBlog] = useState<{blog: BlogData, content: string} | null>(null);
  const [loadingBlog, setLoadingBlog] = useState(false);

  const apiUrl = getApiUrl();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sRes, uRes, fRes, bRes, gRes] = await Promise.all([
        axios.get(`${apiUrl}/api/v1/admin/stats`),
        axios.get(`${apiUrl}/api/v1/admin/users`),
        axios.get(`${apiUrl}/api/v1/admin/feedback`),
        axios.get(`${apiUrl}/api/v1/admin/blogs`),
        axios.get(`${apiUrl}/api/v1/admin/analytics/growth`)
      ]);
      setStats(sRes.data);
      setUsers(uRes.data);
      setFeedback(fRes.data);
      setBlogs(bRes.data);
      setGrowthData(gRes.data);
    } catch (e) {
      console.error("Failed to fetch admin data", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchBlogDetail = async (jobId: string) => {
    setLoadingBlog(true);
    try {
        const res = await axios.get(`${apiUrl}/api/v1/admin/blogs/${jobId}`);
        setSelectedBlog(res.data);
    } catch (e) {
        alert("Failed to load blog content");
    } finally {
        setLoadingBlog(false);
    }
  };

  const handleUpdateCredits = async (userId: number, currentCredits: number) => {
    const newVal = prompt("Enter new credit amount:", currentCredits.toString());
    if (newVal === null) return;
    try {
        await axios.post(`${apiUrl}/api/v1/admin/users/${userId}/credits?credits=${newVal}`);
        fetchData();
    } catch (e) { alert("Failed to update credits"); }
  };

  const handleToggleStatus = async (userId: number, email: string, currentStatus: boolean) => {
    const action = currentStatus ? "DEACTIVATE" : "ACTIVATE";
    if (!confirm(`Are you sure you want to ${action} user ${email}?`)) return;
    try {
        await axios.delete(`${apiUrl}/api/v1/admin/users/${userId}`);
        fetchData();
    } catch (e) { alert("Failed to change user status"); }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="py-20 text-center text-blue-500 animate-pulse font-bold tracking-widest uppercase">Initializing Admin Engine...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>
        <div className="text-right">
            <h2 className="text-2xl font-black text-white flex items-center justify-end gap-3 tracking-tighter">
                <ShieldCheck className="w-6 h-6 text-blue-500" />
                SYSTEM CONTROL
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Platform Integrity & Insights</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: stats?.total_users, icon: Users, color: 'text-blue-400' },
          { label: 'Total Blogs', value: stats?.total_blogs, icon: FileText, color: 'text-green-400' },
          { label: 'Revenue', value: `₹${stats?.estimated_revenue}`, icon: Coins, color: 'text-yellow-400' },
          { label: 'Dev.to / Hashnode', value: `${stats?.devto_published} / ${stats?.hashnode_published}`, icon: Globe, color: 'text-purple-400' },
        ].map((s, i) => (
          <GlassCard key={i} className="p-6">
            <div className="flex flex-col gap-4">
              <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
                <p className="text-2xl font-black text-white">{s.value}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl w-fit">
        {[
            { id: 'users', label: 'Users', icon: Users },
            { id: 'blogs', label: 'Global Feed', icon: FileText },
            { id: 'feedback', label: 'Support', icon: MessageSquare },
            { id: 'analytics', label: 'Growth', icon: BarChart3 },
        ].map((tab) => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTab === tab.id 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
            >
                <tab.icon className="w-4 h-4" />
                {tab.label}
            </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
        >
            <GlassCard className="overflow-hidden min-h-[50vh]">
                {activeTab === 'users' && (
                    <>
                        <div className="p-4 border-b border-white/5 flex justify-end">
                            <div className="relative w-full md:w-72">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                                <input 
                                    placeholder="Search directory..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-slate-500 text-[10px] uppercase tracking-[0.2em] bg-white/5">
                                        <th className="p-4 font-bold">Creator</th>
                                        <th className="p-4 font-bold">Integrations</th>
                                        <th className="p-4 font-bold">Credits</th>
                                        <th className="p-4 font-bold">Joined</th>
                                        <th className="p-4 font-bold text-center">Security</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredUsers.map((u) => (
                                        <tr key={u.id} className={`hover:bg-white/[0.02] transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border ${u.is_active ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
                                                        {u.email.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white flex items-center gap-2">
                                                            {u.full_name || 'Anonymous'}
                                                            {!u.is_active && <span className="text-[8px] bg-red-500/20 text-red-400 px-1 rounded">DISABLED</span>}
                                                        </p>
                                                        <p className="text-[10px] text-slate-500">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    {u.devto_api_key && <span className="w-6 h-6 bg-black rounded flex items-center justify-center text-[8px] font-black text-white border border-white/10" title="Dev.to Connected">DEV</span>}
                                                    {u.hashnode_api_key && <span className="w-6 h-6 bg-[#2942FF] rounded flex items-center justify-center text-[8px] font-black text-white border border-white/10" title="Hashnode Connected">H</span>}
                                                    {!u.devto_api_key && !u.hashnode_api_key && <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">None</span>}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <button 
                                                    onClick={() => handleUpdateCredits(u.id, u.credits_left)}
                                                    className="flex items-center gap-2 hover:bg-white/5 px-2 py-1 rounded-lg transition-all group"
                                                >
                                                    <span className="text-sm font-mono text-blue-400 font-bold">{u.credits_left}</span>
                                                    <Coins className="w-3 h-3 text-slate-600 group-hover:text-yellow-500" />
                                                </button>
                                            </td>
                                            <td className="p-4 text-xs text-slate-500 font-medium">
                                                {new Date(u.created_at + "Z").toLocaleDateString('en-IN')}
                                            </td>
                                            <td className="p-4 text-center">
                                                <button 
                                                    onClick={() => handleToggleStatus(u.id, u.email, u.is_active)}
                                                    className={`p-2 rounded-lg transition-all ${u.is_active ? 'text-slate-600 hover:text-red-400 hover:bg-red-500/10' : 'text-green-500 bg-green-500/10'}`}
                                                    title={u.is_active ? "Deactivate Account" : "Activate Account"}
                                                >
                                                    {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {activeTab === 'blogs' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-slate-500 text-[10px] uppercase tracking-[0.2em] bg-white/5">
                                    <th className="p-4 font-bold">Article Title</th>
                                    <th className="p-4 font-bold">Author</th>
                                    <th className="p-4 font-bold">Live Status</th>
                                    <th className="p-4 font-bold text-center">Status</th>
                                    <th className="p-4 font-bold text-right pr-8 whitespace-nowrap">Generated At (IST)</th>
                                    <th className="p-4 font-bold text-right pr-8">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {blogs.map((b) => (
                                    <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-4 max-w-sm">
                                            <p className="text-sm font-bold text-white truncate">{b.title || b.topic}</p>
                                            <p className="text-[10px] text-slate-500 truncate italic">Topic: {b.topic}</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-xs font-bold text-blue-400">{b.user_name}</p>
                                            <p className="text-[9px] text-slate-600 font-mono uppercase tracking-tight">{b.user_email}</p>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                {b.devto_url ? <a href={b.devto_url} target="_blank" className="w-6 h-6 bg-black rounded flex items-center justify-center text-[8px] font-black text-white hover:bg-blue-600 transition-colors" title="View on Dev.to">DEV</a> : <span className="w-6 h-6 rounded border border-white/5 opacity-20"></span>}
                                                {b.hashnode_url ? <a href={b.hashnode_url} target="_blank" className="w-6 h-6 bg-[#2942FF] rounded flex items-center justify-center text-[8px] font-black text-white hover:bg-blue-600 transition-colors" title="View on Hashnode">H</a> : <span className="w-6 h-6 rounded border border-white/5 opacity-20"></span>}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase border ${
                                                b.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                b.status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                            }`}>
                                                {b.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-[10px] text-slate-500 font-mono text-right pr-8 whitespace-nowrap">
                                            {new Date(b.created_at + "Z").toLocaleString('en-IN', { 
                                                timeZone: 'Asia/Kolkata',
                                                dateStyle: 'medium', 
                                                timeStyle: 'short' 
                                            })}
                                        </td>
                                        <td className="p-4 text-right pr-8">
                                            <button 
                                                onClick={() => fetchBlogDetail(b.job_id)}
                                                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                                                title="View Full Content"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'feedback' && (
                    <div className="p-6 space-y-6 max-w-4xl">
                        {feedback.length === 0 ? (
                            <div className="text-center py-20">
                                <MessageSquare className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                <p className="text-slate-500 italic">No support messages received yet.</p>
                            </div>
                        ) : (
                            feedback.map((f) => (
                                <div key={f.id} className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-4 group hover:border-blue-500/30 transition-all">
                                    <div className="flex justify-between items-start">
                                        <div className="flex gap-4">
                                            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                                                <Mail className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white group-hover:text-blue-400 transition-colors">{f.subject}</h4>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{f.name} • {f.email}</p>
                                            </div>
                                        </div>
                                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{new Date(f.created_at + "Z").toLocaleDateString('en-IN')}</p>
                                    </div>
                                    <div className="bg-black/40 p-5 rounded-2xl text-sm text-slate-300 border border-white/5 leading-relaxed italic relative">
                                        "{f.message}"
                                    </div>
                                    <div className="flex justify-end">
                                        <a 
                                            href={`mailto:${f.email}?subject=Re: ${f.subject}`} 
                                            className="flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
                                        >
                                            Reply to Message <ChevronRight className="w-3 h-3" />
                                        </a>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'analytics' && (
                    <div className="p-12">
                        <div className="flex items-center gap-3 mb-12">
                            <div className="p-3 bg-green-500/20 rounded-2xl text-green-400">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tighter">Growth Metrics</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Acquisition over the last 7 days</p>
                            </div>
                        </div>
                        
                        <div className="flex items-end gap-4 h-80 border-b border-l border-white/10 px-8 pb-8 relative">
                            {/* Grid Lines */}
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5 px-8 pb-8">
                                {[1,2,3,4].map(i => <div key={i} className="w-full border-t border-white"></div>)}
                            </div>

                            {growthData.map((d, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-3 group z-10">
                                    <div className="text-[10px] text-blue-400 font-black opacity-0 group-hover:opacity-100 transition-all transform group-hover:-translate-y-1">{d.users}</div>
                                    <motion.div 
                                        initial={{ height: 0 }}
                                        animate={{ height: `${(d.users / (Math.max(...growthData.map(x=>x.users)) || 1)) * 100}%` }}
                                        className="w-full max-w-[50px] bg-gradient-to-t from-blue-600 via-blue-500 to-cyan-400 rounded-t-xl relative shadow-lg shadow-blue-500/20"
                                    >
                                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-xl"></div>
                                    </motion.div>
                                    <div className="text-[9px] text-slate-500 font-black tracking-widest rotate-[-45deg] origin-top-left mt-2">{d.date}</div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-20 flex justify-center gap-8">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">Total User Base</span>
                            </div>
                        </div>
                    </div>
                )}
            </GlassCard>
        </motion.div>
      </AnimatePresence>

      {/* Blog Content Modal */}
      <AnimatePresence>
        {selectedBlog && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-hidden">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="w-full max-w-5xl h-full max-h-[90vh] flex flex-col"
                >
                    <GlassCard className="relative flex flex-col p-0 border-blue-500/20 shadow-2xl h-full overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02] flex-shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-white line-clamp-1">{selectedBlog.blog.title}</h3>
                                <p className="text-xs text-slate-500 mt-1 uppercase font-black tracking-widest">By {selectedBlog.blog.user_name} • {selectedBlog.blog.user_email}</p>
                            </div>
                            <button onClick={() => setSelectedBlog(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="max-w-3xl mx-auto pb-12">
                                <MarkdownRenderer content={selectedBlog.content} />
                            </div>
                        </div>
                        <div className="p-4 border-t border-white/5 bg-white/[0.02] flex justify-end gap-4 flex-shrink-0">
                            {selectedBlog.blog.devto_url && <a href={selectedBlog.blog.devto_url} target="_blank" className="flex items-center gap-2 px-4 py-2 bg-black rounded-xl text-xs font-bold text-white hover:bg-slate-900 border border-white/10">View on Dev.to <ExternalLink className="w-3 h-3" /></a>}
                            {selectedBlog.blog.hashnode_url && <a href={selectedBlog.blog.hashnode_url} target="_blank" className="flex items-center gap-2 px-4 py-2 bg-[#2942FF] rounded-xl text-xs font-bold text-white hover:bg-blue-700 border border-white/10">View on Hashnode <ExternalLink className="w-3 h-3" /></a>}
                            <button onClick={() => setSelectedBlog(null)} className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl border border-white/10 transition-all">Close Viewer</button>
                        </div>
                    </GlassCard>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
}
