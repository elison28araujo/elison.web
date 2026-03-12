'use client';

import { useEffect, useState } from 'react';
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
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  const router = useRouter();

  const addActivity = (event: ActivityEvent) => {
    setActivities(prev => [event, ...prev].slice(0, 10));
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
        fetchInitialData();
        setupRealtime();
        setLoading(false);
      }
    };

    const fetchInitialData = async () => {
      if (!supabase) return;

      // Fetch total visits
      const { count: visitCount } = await supabase
        .from('visits')
        .select('*', { count: 'exact', head: true });

      // Fetch total clicks
      const { count: clickCount } = await supabase
        .from('clicks')
        .select('*', { count: 'exact', head: true });

      // Fetch recent visits
      const { data: recentVisits } = await supabase
        .from('visits')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch recent clicks
      const { data: recentClicks } = await supabase
        .from('clicks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      const initialActivities: ActivityEvent[] = [
        ...(recentVisits || []).map(v => ({
          id: v.id,
          type: 'Visita' as const,
          target: v.referrer || 'Direto',
          time: new Date(v.created_at).toLocaleTimeString(),
          device: parseUserAgent(v.user_agent),
          timestamp: new Date(v.created_at).getTime()
        })),
        ...(recentClicks || []).map(c => ({
          id: c.id,
          type: 'Clique' as const,
          target: c.link_id || 'Link',
          time: new Date(c.created_at).toLocaleTimeString(),
          device: parseUserAgent(c.user_agent),
          timestamp: new Date(c.created_at).getTime()
        }))
      ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);

      setStats({
        totalVisits: visitCount || 0,
        totalClicks: clickCount || 0,
        liveUsers: 0 // Start with 0, will be updated by presence
      });
      setActivities(initialActivities);
    };

    const setupRealtime = () => {
      if (!supabase) return;

      // Stats and Activity Feed
      const statsChannel = supabase
        .channel('realtime-stats')
        .on('postgres_changes', { event: 'INSERT', table: 'visits', schema: 'public' }, (payload) => {
          const newVisit = payload.new;
          setStats(prev => ({ ...prev, totalVisits: prev.totalVisits + 1 }));
          addActivity({
            id: newVisit.id,
            type: 'Visita',
            target: newVisit.referrer || 'Direto',
            time: new Date().toLocaleTimeString(),
            device: parseUserAgent(newVisit.user_agent),
            timestamp: Date.now()
          });
        })
        .on('postgres_changes', { event: 'INSERT', table: 'clicks', schema: 'public' }, (payload) => {
          const newClick = payload.new;
          setStats(prev => ({ ...prev, totalClicks: prev.totalClicks + 1 }));
          addActivity({
            id: newClick.id,
            type: 'Clique',
            target: newClick.link_id || 'Link',
            time: new Date().toLocaleTimeString(),
            device: parseUserAgent(newClick.user_agent),
            timestamp: Date.now()
          });
        })
        .subscribe();

      // Presence for Online Users
      const presenceChannel = supabase.channel('online-users');
      
      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          // Count total presence entries across all keys
          const count = Object.values(state).flat().length;
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
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <RefreshCw className="animate-spin text-zinc-900" size={40} strokeWidth={1} />
          <div className="absolute inset-0 blur-xl bg-zinc-400/20 animate-pulse"></div>
        </div>
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-zinc-400">Iniciando Dashboard</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-100 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center text-white">
              <Zap size={16} fill="currentColor" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">Elison Bio Analytics</h1>
              <div className="flex items-center space-x-2">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest">Live System</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center space-x-2 text-zinc-400">
              <Clock size={12} />
              <span className="text-[10px] font-mono uppercase tracking-wider">Último sinal: {lastUpdated}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="group flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-red-600 transition-colors"
            >
              <span>Sair</span>
              <LogOut size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 md:p-12 space-y-12">
        {/* Hero Section */}
        <section className="space-y-2">
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">
            Visão Geral <br />
            <span className="text-zinc-300">do seu Tráfego.</span>
          </h2>
        </section>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* Main Stat: Live Users */}
          <div className="md:col-span-2 lg:col-span-2 bg-zinc-900 text-white p-8 rounded-[2rem] flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Globe size={120} strokeWidth={1} />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1">Online Agora</p>
              <h3 className="text-7xl font-black tracking-tighter">{stats.liveUsers}</h3>
            </div>
            <div className="relative z-10 flex items-center space-x-2 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Usuários Ativos</span>
            </div>
          </div>

          {/* Stat: Total Visits */}
          <div className="md:col-span-2 lg:col-span-2 bg-white border border-zinc-100 p-8 rounded-[2rem] flex flex-col justify-between hover:border-zinc-200 transition-colors">
            <div>
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Users size={20} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-1">Visitas Totais</p>
              <h3 className="text-5xl font-black tracking-tighter">{stats.totalVisits}</h3>
            </div>
            <div className="mt-4 flex items-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              <RefreshCw size={10} className="mr-2" />
              <span>Sincronizado</span>
            </div>
          </div>

          {/* Stat: Total Clicks */}
          <div className="md:col-span-2 lg:col-span-2 bg-white border border-zinc-100 p-8 rounded-[2rem] flex flex-col justify-between hover:border-zinc-200 transition-colors">
            <div>
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
                <MousePointer2 size={20} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-1">Cliques Totais</p>
              <h3 className="text-5xl font-black tracking-tighter">{stats.totalClicks}</h3>
            </div>
            <div className="mt-4 flex items-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              <ArrowUpRight size={10} className="mr-2" />
              <span>Taxa de Conversão</span>
            </div>
          </div>

          {/* Visualization Area (Placeholder for Map/Chart) */}
          <div className="md:col-span-4 lg:col-span-4 bg-zinc-100/50 border border-zinc-100 rounded-[2rem] relative overflow-hidden min-h-[300px] group">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto text-zinc-300 group-hover:text-zinc-900 transition-colors">
                  <MapPin size={24} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">Distribuição Geográfica</p>
              </div>
            </div>
            {/* Decorative Grid */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          </div>

          {/* Quick Actions / Info */}
          <div className="md:col-span-2 lg:col-span-2 bg-white border border-zinc-100 p-8 rounded-[2rem] space-y-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Configurações Rápidas</h4>
            <div className="space-y-3">
              <button className="w-full py-3 px-4 bg-zinc-50 hover:bg-zinc-100 rounded-xl text-xs font-bold text-zinc-600 transition-colors flex items-center justify-between">
                <span>Editar Perfil</span>
                <ArrowUpRight size={14} />
              </button>
              <button className="w-full py-3 px-4 bg-zinc-50 hover:bg-zinc-100 rounded-xl text-xs font-bold text-zinc-600 transition-colors flex items-center justify-between">
                <span>Gerenciar Links</span>
                <ArrowUpRight size={14} />
              </button>
              <button className="w-full py-3 px-4 bg-zinc-50 hover:bg-zinc-100 rounded-xl text-xs font-bold text-zinc-600 transition-colors flex items-center justify-between">
                <span>Exportar Dados</span>
                <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Activity Feed Section */}
        <section className="space-y-8 pt-12">
          <div className="flex items-end justify-between border-b border-zinc-100 pb-6">
            <div>
              <h3 className="text-3xl font-black tracking-tighter">Atividade Recente</h3>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-1">Eventos em Tempo Real</p>
            </div>
            <div className="hidden md:block">
              <div className="px-4 py-2 bg-zinc-900 text-white rounded-full text-[10px] font-bold uppercase tracking-widest">
                Live Feed
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AnimatePresence initial={false}>
              {activities.length > 0 ? (
                activities.map((event) => (
                  <motion.div 
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="group p-6 bg-white border border-zinc-100 rounded-3xl flex items-center justify-between hover:border-zinc-900 transition-all duration-500"
                  >
                    <div className="flex items-center space-x-5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                        event.type === 'Visita' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {event.type === 'Visita' ? <Users size={20} /> : <MousePointer2 size={20} />}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-sm uppercase tracking-tight">{event.type}</span>
                          <span className="w-1 h-1 rounded-full bg-zinc-200"></span>
                          <span className="text-xs text-zinc-400 font-medium truncate max-w-[150px]">{event.target}</span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Clock size={10} className="text-zinc-300" />
                          <span className="text-[10px] text-zinc-400 font-mono">{event.time}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-1">
                      <div className="flex items-center space-x-2 text-zinc-300 group-hover:text-zinc-900 transition-colors">
                        {event.device === 'Mobile' ? <Smartphone size={14} /> : <Monitor size={14} />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{event.device}</span>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-32 flex flex-col items-center justify-center border-2 border-dashed border-zinc-100 rounded-[3rem] bg-zinc-50/50">
                  <Activity className="text-zinc-200 mb-4 animate-pulse" size={48} strokeWidth={1} />
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Aguardando novos sinais...</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto p-12 border-t border-zinc-100 text-center">
        <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-[0.5em]">
          Elison Bio Analytics &copy; 2026 • Powered by Real-time Engine
        </p>
      </footer>
    </div>
  );
}
