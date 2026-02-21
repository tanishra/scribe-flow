import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, FileText, MessageSquare, ShieldCheck, Zap, 
    Mail, Calendar, Search, ArrowLeft, Trash2, 
    TrendingUp, Coins, BarChart3, ChevronRight, X
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { getApiUrl } from '../contexts/AuthContext';

interface UserData {
  id: number;
  email: string;
  full_name: string;
  profession: string;
  credits_left: number;
  is_premium: boolean;
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
    title: string;
    topic: string;
    status: string;
    user_id: number;
    created_at: string;
}

interface Stats {
  total_users: number;
  total_blogs: number;
  total_feedback: number;
  premium_users: number;
  estimated_revenue: number;
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

  const handleUpdateCredits = async (userId: number, currentCredits: number) => {
    const newVal = prompt("Enter new credit amount:", currentCredits.toString());
    if (newVal === null) return;
    try {
        await axios.post(`${apiUrl}/api/v1/admin/users/${userId}/credits?credits=${newVal}`);
        fetchData();
    } catch (e) { alert("Failed to update credits"); }
  };

  const handleDeleteUser = async (userId: number, email: string) => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete user ${email}? This cannot be undone.`)) return;
    try {
        await axios.delete(`${apiUrl}/api/v1/admin/users/${userId}`);
        fetchData();
    } catch (e) { alert("Failed to delete user"); }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="py-20 text-center text-blue-500 animate-pulse font-bold tracking-widest">INITIALIZING CONTROL CENTER...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>
        <div className="text-right">
            <h2 className="text-2xl font-black text-white flex items-center justify-end gap-3">
                <ShieldCheck className="w-6 h-6 text-blue-500" />
                Admin Panel
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Platform Monitoring & Control</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Users', value: stats?.total_users, icon: Users, color: 'text-blue-400' },
          { label: 'Premium', value: stats?.premium_users, icon: Zap, color: 'text-purple-400' },
          { label: 'Total Blogs', value: stats?.total_blogs, icon: FileText, color: 'text-green-400' },
          { label: 'Revenue', value: `₹${stats?.estimated_revenue}`, icon: Coins, color: 'text-yellow-400' },
          { label: 'Feedback', value: stats?.total_feedback, icon: MessageSquare, color: 'text-orange-400' },
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
            { id: 'blogs', label: 'Global Blogs', icon: FileText },
            { id: 'feedback', label: 'Support', icon: MessageSquare },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
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
            <GlassCard className="overflow-hidden">
                {activeTab === 'users' && (
                    <>
                        <div className="p-4 border-b border-white/5 flex justify-end">
                            <div className="relative w-full md:w-72">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                                <input 
                                    placeholder="Search users..."
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
                                        <th className="p-4 font-bold">Identity</th>
                                        <th className="p-4 font-bold">Status</th>
                                        <th className="p-4 font-bold">Credits</th>
                                        <th className="p-4 font-bold">Registered</th>
                                        <th className="p-4 font-bold text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredUsers.map((u) => (
                                        <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold border border-blue-500/20">
                                                        {u.email.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white">{u.full_name || 'Anonymous'}</p>
                                                        <p className="text-[10px] text-slate-500">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {u.is_premium ? (
                                                    <span className="px-2 py-1 rounded-md bg-purple-500/10 text-purple-400 text-[9px] font-black uppercase border border-purple-500/20">Pro</span>
                                                ) : (
                                                    <span className="px-2 py-1 rounded-md bg-white/5 text-slate-500 text-[9px] font-black uppercase border border-white/10">Free</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <button 
                                                    onClick={() => handleUpdateCredits(u.id, u.credits_left)}
                                                    className="flex items-center gap-2 hover:bg-white/5 px-2 py-1 rounded-lg transition-all"
                                                >
                                                    <span className="text-sm font-mono text-blue-400 font-bold">{u.credits_left}</span>
                                                    <Coins className="w-3 h-3 text-slate-600" />
                                                </button>
                                            </td>
                                            <td className="p-4 text-xs text-slate-500 font-medium">
                                                {new Date(u.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button 
                                                        onClick={() => handleDeleteUser(u.id, u.email)}
                                                        className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
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
                                    <th className="p-4 font-bold">Title / Topic</th>
                                    <th className="p-4 font-bold">Status</th>
                                    <th className="p-4 font-bold">Created At</th>
                                    <th className="p-4 font-bold">User ID</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {blogs.map((b) => (
                                    <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-4 max-w-xs">
                                            <p className="text-sm font-bold text-white truncate">{b.title || b.topic}</p>
                                            <p className="text-[10px] text-slate-500 truncate italic">{b.topic}</p>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase border ${
                                                b.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                b.status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                            }`}>
                                                {b.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-xs text-slate-500">
                                            {new Date(b.created_at).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-xs font-mono text-slate-400">#{b.user_id}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'feedback' && (
                    <div className="p-6 space-y-6">
                        {feedback.length === 0 ? (
                            <p className="text-center py-20 text-slate-500 italic">No support messages received yet.</p>
                        ) : (
                            feedback.map((f) => (
                                <div key={f.id} className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex gap-4">
                                            <div className="p-3 bg-orange-500/10 rounded-xl text-orange-400">
                                                <MessageSquare className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white">{f.subject}</h4>
                                                <p className="text-xs text-slate-500">From: {f.name} ({f.email})</p>
                                            </div>
                                        </div>
                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{new Date(f.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="bg-black/20 p-4 rounded-xl text-sm text-slate-300 border border-white/5 leading-relaxed italic">
                                        "{f.message}"
                                    </div>
                                    <a href={`mailto:${f.email}`} className="text-blue-400 text-xs font-bold hover:underline w-fit">Reply via Email</a>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'analytics' && (
                    <div className="p-8">
                        <div className="flex items-center gap-3 mb-8">
                            <TrendingUp className="w-6 h-6 text-green-400" />
                            <h3 className="text-xl font-bold text-white">Platform Growth</h3>
                        </div>
                        
                        <div className="flex items-end gap-2 h-64 border-b border-l border-white/10 px-4 pb-4">
                            {growthData.map((d, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                    <div className="text-[10px] text-slate-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">{d.users}</div>
                                    <motion.div 
                                        initial={{ height: 0 }}
                                        animate={{ height: `${(d.users / (stats?.total_users || 1)) * 100}%` }}
                                        className="w-full max-w-[40px] bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t-lg relative"
                                    >
                                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg"></div>
                                    </motion.div>
                                    <div className="text-[10px] text-slate-600 font-bold rotate-45 mt-2">{d.date}</div>
                                </div>
                            ))}
                        </div>
                        <p className="text-center text-xs text-slate-500 mt-12 italic">User growth over the last 7 days</p>
                    </div>
                )}
            </GlassCard>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
