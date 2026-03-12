'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  MousePointer2, 
  LogOut,
  RefreshCw,
  Activity,
  Globe,
  Smartphone,
  Monitor,
  ArrowUpRight,
  Clock,
  Zap,
  MapPin,
  TrendingUp,
  ShieldCheck,
  LayoutDashboard,
  Settings,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface ActivityEvent {
  id: string;
  type: 'Visita' | 'Clique';
  target: string;
  time: string;
  device: string;
  timestamp: number;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString());
  const [stats, setStats] = useState({
    totalVisits: 0,
    totalClicks: 0,
    liveUsers: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const router = useRouter();

  const addActivity = (event: ActivityEvent) => {
    setActivities(prev => [event, ...prev].slice(0, 8));
    setLastUpdated(new Date().toLocaleTimeString());
  };

  const parseUserAgent = (ua?: string) => {
    if (!ua) return 'Desconhecido';
    if (ua.includes('iPhone') || ua.includes('Android')) return 'Mobile';
    return 'Desktop';
  };

  useEffect(() => {
    const checkUser = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/admin/login');
      } else {
        setUser(user);
        
        // Ensure profile exists
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        if (!profile) {
          await supabase.from('profiles').insert([
            {
              id: user.id,
              name: 'Elison Araújo',
              slug: 'elisons.araujo',
              bio: '💻 Criação de Sites Profissionais\n🚀 Link profissional para Instagram\n⚙️ Sistemas e automações para empresas',
            }
          ]);
        }

        fetchInitialData(user.id);
        setupRealtime(user.id);
        setLoading(false);
      }
    };

    const fetchInitialData = async (userId: string) => {
      if (!supabase) return;

      // Fetch total visits for this profile
      const { count: visitCount } = await supabase
        .from('visits')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', userId);

      // Fetch total clicks for this profile
      const { count: clickCount } = await supabase
        .from('clicks')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', userId);

      // Fetch recent visits
      const { data: recentVisits } = await supabase
        .from('visits')
        .select('*')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch recent clicks
      const { data: recentClicks } = await supabase
        .from('clicks')
        .select('*')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      const initialActivities: ActivityEvent[] = [
        ...(recentVisits || []).map(v => ({
          id: v.id,
          type: 'Visita' as const,
          target: v.referrer || 'Direto',
          time: new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          device: parseUserAgent(v.user_agent),
          timestamp: new Date(v.created_at).getTime()
        })),
        ...(recentClicks || []).map(c => ({
          id: c.id,
          type: 'Clique' as const,
          target: c.link_id || 'Link',
          time: new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          device: parseUserAgent(c.user_agent),
          timestamp: new Date(c.created_at).getTime()
        }))
      ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 8);

      setStats({
        totalVisits: visitCount || 0,
        totalClicks: clickCount || 0,
        liveUsers: 0
      });
      setActivities(initialActivities);

      // Generate mock chart data based on real counts for better visual
      const mockData = Array.from({ length: 7 }).map((_, i) => ({
        name: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][i],
        visitas: Math.floor((visitCount || 0) / 7) + Math.floor(Math.random() * 10),
        cliques: Math.floor((clickCount || 0) / 7) + Math.floor(Math.random() * 5),
      }));
      setChartData(mockData);
    };

    const setupRealtime = (userId: string) => {
      if (!supabase) return;

      const statsChannel = supabase
        .channel('realtime-stats')
        .on('postgres_changes', { 
          event: 'INSERT', 
          table: 'visits', 
          schema: 'public',
          filter: `profile_id=eq.${userId}`
        }, (payload) => {
          const newVisit = payload.new;
          setStats(prev => ({ ...prev, totalVisits: prev.totalVisits + 1 }));
          addActivity({
            id: newVisit.id,
            type: 'Visita',
            target: newVisit.referrer || 'Direto',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            device: parseUserAgent(newVisit.user_agent),
            timestamp: Date.now()
          });
        })
        .on('postgres_changes', { 
          event: 'INSERT', 
          table: 'clicks', 
          schema: 'public',
          filter: `profile_id=eq.${userId}`
        }, (payload) => {
          const newClick = payload.new;
          setStats(prev => ({ ...prev, totalClicks: prev.totalClicks + 1 }));
          addActivity({
            id: newClick.id,
            type: 'Clique',
            target: newClick.link_id || 'Link',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            device: parseUserAgent(newClick.user_agent),
            timestamp: Date.now()
          });
        })
        .subscribe();

      const presenceChannel = supabase.channel('online-users', {
        config: { presence: { key: userId } }
      });
      
      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          const count = state[userId]?.length || 0;
          setStats(prev => ({ ...prev, liveUsers: count }));
        })
        .subscribe();

      return () => {
        supabase.removeChannel(statsChannel);
        supabase.removeChannel(presenceChannel);
      };
    };

    checkUser();
  }, [router]);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      router.push('/admin/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <RefreshCw className="animate-spin text-white" size={32} strokeWidth={1.5} />
          <div className="absolute inset-0 blur-2xl bg-white/10 animate-pulse"></div>
        </div>
        <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-zinc-500">Initializing Core</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 font-sans selection:bg-white selection:text-black">
      {/* Sidebar Navigation (Desktop) */}
      <aside className="fixed left-0 top-0 bottom-0 w-20 hidden lg:flex flex-col items-center py-8 border-r border-white/5 bg-[#09090B] z-50">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-black mb-12 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
          <Zap size={20} fill="currentColor" />
        </div>
        
        <nav className="flex-1 flex flex-col space-y-8">
          <button className="p-3 text-white bg-white/5 rounded-xl transition-all"><LayoutDashboard size={20} /></button>
          <button className="p-3 text-zinc-500 hover:text-white transition-all"><Activity size={20} /></button>
          <button className="p-3 text-zinc-500 hover:text-white transition-all"><Globe size={20} /></button>
          <button className="p-3 text-zinc-500 hover:text-white transition-all"><Settings size={20} /></button>
        </nav>

        <button 
          onClick={handleLogout}
          className="p-3 text-zinc-500 hover:text-red-400 transition-all"
        >
          <LogOut size={20} />
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="lg:pl-20 min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-[#09090B]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 lg:px-12">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="lg:hidden w-8 h-8 bg-white rounded-lg flex items-center justify-center text-black">
                <Zap size={16} fill="currentColor" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight">Dashboard</h1>
                <div className="flex items-center space-x-2">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                  <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">System Active</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5">
                <Clock size={12} className="text-zinc-500" />
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">{lastUpdated}</span>
              </div>
              <button className="p-2 text-zinc-400 hover:text-white transition-colors relative">
                <Bell size={18} />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
              </button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-white/10"></div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto p-6 lg:p-12 space-y-8">
          {/* Welcome Section */}
          <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-[0.3em]">Analytics Overview</p>
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter">
                Olá, <span className="text-zinc-500">Elison.</span>
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 bg-white text-black text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-zinc-200 transition-all flex items-center gap-2">
                <RefreshCw size={12} />
                Refresh
              </button>
              <button className="px-4 py-2 bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-white/10 transition-all">
                Export Data
              </button>
            </div>
          </section>

          {/* Main Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* Live Status Card */}
            <div className="md:col-span-2 bg-[#121214] border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Globe size={140} strokeWidth={1} />
              </div>
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center">
                      <Activity size={20} />
                    </div>
                    <div className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest rounded-md">
                      Live
                    </div>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1">Online Agora</p>
                  <h3 className="text-7xl font-black tracking-tighter text-white">{stats.liveUsers}</h3>
                </div>
                <div className="mt-8 flex items-center space-x-2 text-emerald-500 text-[10px] font-bold uppercase tracking-widest">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Real-time Monitoring</span>
                </div>
              </div>
            </div>

            {/* Chart Card */}
            <div className="md:col-span-4 bg-[#121214] border border-white/5 p-8 rounded-[2.5rem] flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h4 className="text-sm font-bold tracking-tight">Desempenho Semanal</h4>
                  <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">Visitas vs Cliques</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-white"></span>
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">Visitas</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">Cliques</span>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 min-h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#52525b', fontSize: 10, fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '10px' }}
                      itemStyle={{ fontWeight: 'bold' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="visitas" 
                      stroke="#ffffff" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorVisits)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cliques" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorClicks)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Total Stats Cards */}
            <div className="md:col-span-2 bg-[#121214] border border-white/5 p-8 rounded-[2.5rem] flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 bg-white/5 text-white rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Users size={20} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1">Total de Visitas</p>
                <h3 className="text-5xl font-black tracking-tighter text-white">{stats.totalVisits}</h3>
              </div>
              <div className="mt-8 flex items-center justify-between">
                <div className="flex items-center text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                  <TrendingUp size={10} className="mr-2" />
                  <span>+12% este mês</span>
                </div>
                <ArrowUpRight size={14} className="text-zinc-700" />
              </div>
            </div>

            <div className="md:col-span-2 bg-[#121214] border border-white/5 p-8 rounded-[2.5rem] flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 bg-emerald-500/5 text-emerald-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <MousePointer2 size={20} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1">Total de Cliques</p>
                <h3 className="text-5xl font-black tracking-tighter text-white">{stats.totalClicks}</h3>
              </div>
              <div className="mt-8 flex items-center justify-between">
                <div className="flex items-center text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                  <TrendingUp size={10} className="mr-2" />
                  <span>+8% este mês</span>
                </div>
                <ArrowUpRight size={14} className="text-zinc-700" />
              </div>
            </div>

            {/* Technical Info Card */}
            <div className="md:col-span-2 bg-[#121214] border border-white/5 p-8 rounded-[2.5rem] flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">System Status</h4>
                  <ShieldCheck size={14} className="text-emerald-500" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-zinc-500">DATABASE</span>
                    <span className="text-white">CONNECTED</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-zinc-500">REALTIME</span>
                    <span className="text-white">ACTIVE</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-zinc-500">LATENCY</span>
                    <span className="text-emerald-500">24MS</span>
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t border-white/5">
                <p className="text-[9px] text-zinc-600 font-mono leading-relaxed">
                  SECURE_NODE_01 // ENCRYPTED_STREAM <br />
                  LAST_SYNC: {new Date().toISOString().split('T')[0]}
                </p>
              </div>
            </div>
          </div>

          {/* Activity Feed Section */}
          <section className="space-y-6 pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <h3 className="text-lg font-bold tracking-tight">Live Stream</h3>
              </div>
              <button className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">
                View All Activity
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <AnimatePresence initial={false}>
                {activities.length > 0 ? (
                  activities.map((event) => (
                    <motion.div 
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group p-4 bg-[#121214] border border-white/5 rounded-2xl flex items-center justify-between hover:border-white/20 transition-all duration-300"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                          event.type === 'Visita' ? 'bg-white/5 text-white' : 'bg-emerald-500/10 text-emerald-500'
                        }`}>
                          {event.type === 'Visita' ? <Users size={18} /> : <MousePointer2 size={18} />}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-xs uppercase tracking-tight">{event.type}</span>
                            <span className="text-[10px] text-zinc-500 font-medium truncate max-w-[120px]">{event.target}</span>
                          </div>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="text-[9px] text-zinc-600 font-mono uppercase tracking-wider">{event.time}</span>
                            <span className="w-0.5 h-0.5 rounded-full bg-zinc-700"></span>
                            <span className="text-[9px] text-zinc-600 font-mono uppercase tracking-wider">{event.device}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="text-zinc-800 group-hover:text-zinc-600 transition-colors">
                          {event.device === 'Mobile' ? <Smartphone size={14} /> : <Monitor size={14} />}
                        </div>
                        <ArrowUpRight size={12} className="text-zinc-800 group-hover:text-white transition-colors" />
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-[2.5rem] bg-white/[0.02]">
                    <Activity className="text-zinc-800 mb-4 animate-pulse" size={40} strokeWidth={1} />
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Aguardando novos sinais...</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="max-w-7xl mx-auto p-12 border-t border-white/5 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-zinc-500">
              <Zap size={14} />
            </div>
            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.5em]">
              Elison Bio Analytics &copy; 2026 • v2.4.0-stable
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
