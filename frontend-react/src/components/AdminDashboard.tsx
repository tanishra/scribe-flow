import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Users, FileText, MessageSquare, ShieldCheck, Zap, Mail, Calendar, Search, ArrowLeft, MoreVertical } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface UserData {
  id: number;
  email: string;
  full_name: string;
  profession: string;
  credits_left: number;
  is_premium: boolean;
  created_at: string;
  source: string;
}

interface FeedbackData {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
}

interface Stats {
  total_users: number;
  total_blogs: number;
  total_feedback: number;
  premium_users: number;
}

export function AdminDashboard({ onBack }: { onBack: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [feedback, setFeedback] = useState<FeedbackData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'feedback'>('users');
  const [searchTerm, setSearchTerm] = useState('');

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sRes, uRes, fRes] = await Promise.all([
        axios.get(`${apiUrl}/api/v1/admin/stats`),
        axios.get(`${apiUrl}/api/v1/admin/users`),
        axios.get(`${apiUrl}/api/v1/admin/feedback`)
      ]);
      setStats(sRes.data);
      setUsers(uRes.data);
      setFeedback(fRes.data);
    } catch (e) {
      console.error("Failed to fetch admin data", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="py-20 text-center text-blue-500 animate-pulse font-bold">LOADING ADMIN PANEL...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-blue-500" />
            Control Center
        </h2>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: stats?.total_users, icon: Users, color: 'text-blue-400' },
          { label: 'Premium Accounts', value: stats?.premium_users, icon: Zap, color: 'text-purple-400' },
          { label: 'Blogs Generated', value: stats?.total_blogs, icon: FileText, color: 'text-green-400' },
          { label: 'Feedback Received', value: stats?.total_feedback, icon: MessageSquare, color: 'text-orange-400' },
        ].map((s, i) => (
          <GlassCard key={i} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
                <p className="text-3xl font-black text-white">{s.value}</p>
              </div>
              <div className={`p-3 rounded-2xl bg-white/5 ${s.color}`}>
                <s.icon className="w-6 h-6" />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Main Content Area */}
      <GlassCard className="overflow-hidden">
        <div className="border-b border-white/5 bg-white/5 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex bg-black/20 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('users')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              User Directory
            </button>
            <button 
              onClick={() => setActiveTab('feedback')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'feedback' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              Feedback Log
            </button>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input 
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'users' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-500 text-[10px] uppercase tracking-[0.2em] bg-white/5">
                  <th className="p-4 font-bold">User</th>
                  <th className="p-4 font-bold">Profession</th>
                  <th className="p-4 font-bold">Plan</th>
                  <th className="p-4 font-bold">Credits</th>
                  <th className="p-4 font-bold">Joined</th>
                  <th className="p-4 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold border border-blue-500/20">
                          {u.full_name?.charAt(0) || u.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{u.full_name || 'Anonymous'}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-400">{u.profession || '-'}</td>
                    <td className="p-4">
                      {u.is_premium ? (
                        <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-black uppercase border border-purple-500/20">Premium</span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-white/5 text-slate-500 text-[10px] font-black uppercase border border-white/10">Free</span>
                      )}
                    </td>
                    <td className="p-4 text-sm font-mono text-blue-400 font-bold">{u.credits_left}</td>
                    <td className="p-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(u.created_at).toLocaleDateString()}
                        </div>
                    </td>
                    <td className="p-4 text-center">
                        <button className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all">
                            <MoreVertical className="w-4 h-4" />
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-4 space-y-4">
                {feedback.map((f) => (
                    <div key={f.id} className="p-6 rounded-2xl bg-white/5 border border-white/10 text-left">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400">
                                    <MessageSquare className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">{f.subject}</h4>
                                    <p className="text-xs text-slate-500">From: {f.name} ({f.email})</p>
                                </div>
                            </div>
                            <span className="text-[10px] text-slate-600 font-bold">{new Date(f.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed bg-black/20 p-4 rounded-xl italic">"{f.message}"</p>
                    </div>
                ))}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
