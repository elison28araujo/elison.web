'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  MousePointer2, 
  LogOut,
  RefreshCw,
  LayoutDashboard,
  Activity,
  Globe,
  Smartphone,
  Monitor
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
  const [stats, setStats] = useState({
    totalVisits: 0,
    totalClicks: 0,
    liveUsers: 0
  });
  const router = useRouter();

  const addActivity = (event: ActivityEvent) => {
    setActivities(prev => [event, ...prev].slice(0, 10));
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
      <div className="min-h-screen bg-[#f8f8f8] flex items-center justify-center">
        <RefreshCw className="animate-spin text-zinc-400" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans p-8 md:p-12">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Info & Stats */}
          <div className="lg:col-span-4 space-y-12">
            <header>
              <h1 className="text-4xl font-black tracking-tighter mb-2">Elison Bio Analytics</h1>
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest">Monitoramento em Tempo Real</p>
              </div>
            </header>

            <button 
              onClick={handleLogout}
              className="w-12 h-12 border border-zinc-200 rounded-xl flex items-center justify-center hover:bg-zinc-50 transition-colors text-zinc-400 hover:text-red-600"
            >
              <LogOut size={20} />
            </button>

            <div className="space-y-10">
              {[
                { label: 'Visitas Totais', value: stats.totalVisits, icon: Users, color: 'text-blue-600' },
                { label: 'Cliques Totais', value: stats.totalClicks, icon: MousePointer2, color: 'text-emerald-600' },
                { label: 'Usuários Online', value: stats.liveUsers, icon: Globe, color: 'text-orange-600' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-start">
                  <div className={`${item.color} mb-3`}>
                    <item.icon size={32} strokeWidth={1.5} />
                  </div>
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mb-1">{item.label}</p>
                  <h3 className="text-5xl font-black tracking-tighter">{item.value}</h3>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Live Visualization Placeholder */}
          <div className="lg:col-span-8">
            <div className="w-full aspect-video md:aspect-square lg:aspect-auto lg:h-full border-2 border-blue-500 rounded-lg flex items-center justify-center bg-blue-50/10">
              <div className="text-blue-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                Live Visualization Area
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Activity Feed */}
        <div className="mt-24 space-y-8">
          <div className="border-t border-zinc-100 pt-12">
            <h2 className="text-2xl font-black tracking-tighter mb-1">Fluxo de Atividade</h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Live Feed</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence initial={false}>
              {activities.length > 0 ? (
                activities.map((event) => (
                  <motion.div 
                    key={event.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 border border-zinc-100 rounded-2xl flex items-center justify-between hover:border-zinc-200 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${event.type === 'Visita' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {event.type === 'Visita' ? <Users size={16} /> : <MousePointer2 size={16} />}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm tracking-tight">{event.type}</span>
                          <span className="text-zinc-300">•</span>
                          <span className="text-xs text-zinc-500">{event.target}</span>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono">{event.time}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-zinc-300">
                      {event.device === 'Mobile' ? <Smartphone size={14} /> : <Monitor size={14} />}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-100 rounded-3xl">
                  <p className="text-sm text-zinc-400 font-medium">Aguardando atividade...</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
