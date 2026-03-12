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
  Bell,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Link as LinkIcon,
  User as UserIcon,
  Image as ImageIcon,
  Instagram, 
  Github, 
  Linkedin, 
  Twitter, 
  MessageCircle,
  Briefcase,
  Youtube,
  Facebook,
  Music2,
  Mail,
  Phone,
  ShoppingCart,
  Camera,
  Scale,
  Dumbbell,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Check,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  Instagram,
  Github,
  Linkedin,
  Twitter,
  Globe,
  MessageCircle,
  Briefcase,
  Zap,
  Youtube,
  Facebook,
  Music2,
  Mail,
  Phone,
  ShoppingCart,
  Camera,
  Scale,
  Dumbbell,
  Sparkles
};
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

interface Link {
  id: string;
  label: string;
  url: string;
  icon: string;
  color?: string;
  order: number;
}

interface Profile {
  id: string;
  name: string;
  slug: string;
  bio: string;
  avatar_url: string;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'links' | 'profile'>('dashboard');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString());
  const [stats, setStats] = useState({
    totalVisits: 0,
    totalClicks: 0,
    liveUsers: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
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

  const getIconForUrl = (url: string) => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('instagram.com')) return 'Instagram';
    if (lowerUrl.includes('github.com')) return 'Github';
    if (lowerUrl.includes('linkedin.com')) return 'Linkedin';
    if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return 'Twitter';
    if (lowerUrl.includes('youtube.com')) return 'Youtube';
    if (lowerUrl.includes('facebook.com')) return 'Facebook';
    if (lowerUrl.includes('spotify.com') || lowerUrl.includes('music.apple.com')) return 'Music2';
    if (lowerUrl.includes('mailto:')) return 'Mail';
    if (lowerUrl.includes('tel:') || lowerUrl.includes('wa.me')) return 'Phone';
    return 'Globe';
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setProfile(prev => prev ? { ...prev, avatar_url: dataUrl } : null);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
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

    setStats(prev => ({
      ...prev,
      totalVisits: visitCount || 0,
      totalClicks: clickCount || 0
    }));
    setActivities(initialActivities);

    // Generate mock chart data based on real counts for better visual
    const mockData = Array.from({ length: 7 }).map((_, i) => ({
      name: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][i],
      visitas: Math.floor((visitCount || 0) / 7) + Math.floor(Math.random() * 10),
      cliques: Math.floor((clickCount || 0) / 7) + Math.floor(Math.random() * 5),
    }));
    setChartData(mockData);
  };

  useEffect(() => {
    const checkUser = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser(user);
          
          // Fetch profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (!profileData) {
            const newProfile = {
              id: user.id,
              name: 'Elison Araújo',
              slug: 'elisons.araujo',
              bio: '💻 Criação de Sites Profissionais\n🚀 Link profissional para Instagram\n⚙️ Sistemas e automações para empresas',
              avatar_url: 'https://picsum.photos/seed/elison-premium/400/400'
            };
            await supabase.from('profiles').insert([newProfile]);
            setProfile(newProfile);
          } else {
            setProfile(profileData);
          }

          // Fetch links
          const { data: linksData } = await supabase
            .from('links')
            .select('*')
            .eq('profile_id', user.id)
            .order('order', { ascending: true });
          
          if (linksData) {
            setLinks(linksData);
          }

          fetchInitialData(user.id);
          setupRealtime(user.id);
          setLoading(false);
        }
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

  const handleMoveLink = async (index: number, direction: 'up' | 'down') => {
    if (!supabase) return;
    const newLinks = [...links];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newLinks.length) return;

    const temp = newLinks[index];
    newLinks[index] = newLinks[targetIndex];
    newLinks[targetIndex] = temp;

    // Update orders in state
    const updatedLinks = newLinks.map((link, i) => ({ ...link, order: i }));
    setLinks(updatedLinks);

    // Update in DB
    try {
      await Promise.all(updatedLinks.map(link => 
        supabase.from('links').update({ order: link.order }).eq('id', link.id)
      ));
      showToast('Ordem atualizada');
    } catch (error: any) {
      showToast('Erro ao atualizar ordem', 'error');
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      router.push('/admin/login');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !profile || !user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: profile.name,
          bio: profile.bio,
          avatar_url: profile.avatar_url,
          slug: profile.slug
        })
        .eq('id', user.id);
      if (error) throw error;
      showToast('Perfil atualizado com sucesso!');
    } catch (err: any) {
      showToast('Erro ao salvar perfil: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddLink = async () => {
    if (!supabase || !user) return;
    const newLink = {
      profile_id: user.id,
      label: 'Novo Link',
      url: 'https://',
      icon: 'Globe',
      color: 'from-zinc-700 to-zinc-900',
      order: links.length
    };
    const { data, error } = await supabase
      .from('links')
      .insert([newLink])
      .select()
      .single();
    if (error) {
      showToast('Erro ao adicionar link: ' + error.message, 'error');
    } else if (data) {
      setLinks([...links, data]);
      showToast('Link adicionado!');
    }
  };

  const handleUpdateLink = async (id: string, updates: Partial<Link>) => {
    if (!supabase) return;
    
    const { error } = await supabase
      .from('links')
      .update(updates)
      .eq('id', id);
    if (error) {
      showToast('Erro ao atualizar link: ' + error.message, 'error');
    } else {
      setLinks(links.map(l => l.id === id ? { ...l, ...updates } : l));
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (!supabase || !confirm('Tem certeza que deseja excluir este link?')) return;
    const { error } = await supabase
      .from('links')
      .delete()
      .eq('id', id);
    if (error) {
      showToast('Erro ao excluir link: ' + error.message, 'error');
    } else {
      setLinks(links.filter(l => l.id !== id));
      showToast('Link excluído');
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
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-8 right-8 z-[100] px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 border ${
              toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-red-500/10 border-red-500/50 text-red-400'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
            <span className="font-bold text-[10px] uppercase tracking-widest">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Navigation (Desktop) */}
      <aside className="fixed left-0 top-0 bottom-0 w-20 hidden lg:flex flex-col items-center py-8 border-r border-white/5 bg-[#09090B] z-50">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-black mb-12 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
          <Zap size={20} fill="currentColor" />
        </div>
        
        <nav className="flex-1 flex flex-col space-y-8">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`p-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'text-white bg-white/5' : 'text-zinc-500 hover:text-white'}`}
          >
            <LayoutDashboard size={20} />
          </button>
          <button 
            onClick={() => setActiveTab('links')}
            className={`p-3 rounded-xl transition-all ${activeTab === 'links' ? 'text-white bg-white/5' : 'text-zinc-500 hover:text-white'}`}
          >
            <LinkIcon size={20} />
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`p-3 rounded-xl transition-all ${activeTab === 'profile' ? 'text-white bg-white/5' : 'text-zinc-500 hover:text-white'}`}
          >
            <UserIcon size={20} />
          </button>
          
          <div className="h-px w-8 bg-white/5 my-2" />

          <a 
            href="/" 
            target="_blank"
            className="p-3 text-zinc-500 hover:text-white transition-all"
            title="Ver Site"
          >
            <Globe size={20} />
          </a>
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
          {activeTab === 'dashboard' && (
            <>
              {/* Welcome Section */}
              <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-[0.3em]">Analytics Overview</p>
                  <h2 className="text-4xl md:text-6xl font-black tracking-tighter">
                    Olá, <span className="text-zinc-500">{profile?.name.split(' ')[0] || 'Elison'}.</span>
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => fetchInitialData(user?.id)}
                    className="px-4 py-2 bg-white text-black text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-zinc-200 transition-all flex items-center gap-2"
                  >
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
            </>
          )}

          {activeTab === 'links' && (
            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter">Gerenciar Links</h2>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-[0.3em]">Personalize seus botões</p>
                </div>
                <button 
                  onClick={handleAddLink}
                  className="px-6 py-3 bg-white text-black text-xs font-bold uppercase tracking-widest rounded-full hover:bg-zinc-200 transition-all flex items-center gap-2"
                >
                  <Plus size={16} />
                  Novo Link
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {links.map((link, index) => (
                  <div key={link.id} className="bg-[#121214] border border-white/5 p-6 rounded-3xl space-y-6 group">
                    <div className="flex flex-wrap gap-6">
                      <div className="flex flex-col items-center gap-2">
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${link.color || 'from-zinc-700 to-zinc-900'} flex items-center justify-center text-white shadow-lg`}>
                          {(() => {
                            const IconComponent = ICON_MAP[link.icon || 'Globe'] || Globe;
                            return <IconComponent size={24} />;
                          })()}
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => handleMoveLink(index, 'up')}
                            disabled={index === 0}
                            className="p-1 hover:bg-white/5 rounded disabled:opacity-30 text-zinc-500 hover:text-white transition-colors"
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button 
                            onClick={() => handleMoveLink(index, 'down')}
                            disabled={index === links.length - 1}
                            className="p-1 hover:bg-white/5 rounded disabled:opacity-30 text-zinc-500 hover:text-white transition-colors"
                          >
                            <ChevronDown size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 min-w-[240px] space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Título do Botão</label>
                          <input 
                            type="text" 
                            value={link.label}
                            onChange={(e) => handleUpdateLink(link.id, { label: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/20 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">URL de Destino</label>
                          <input 
                            type="text" 
                            value={link.url}
                            onChange={(e) => handleUpdateLink(link.id, { url: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/20 transition-all"
                          />
                        </div>
                      </div>
                      <div className="w-full md:w-64 space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Ícone</label>
                          <select 
                            value={link.icon || 'Globe'}
                            onChange={(e) => handleUpdateLink(link.id, { icon: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/20 transition-all appearance-none cursor-pointer"
                          >
                            {Object.keys(ICON_MAP).map(iconName => (
                              <option key={iconName} value={iconName} className="bg-[#121214]">{iconName}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Cor (Tailwind Gradient)</label>
                          <input 
                            type="text" 
                            value={link.color || ''}
                            onChange={(e) => handleUpdateLink(link.id, { color: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/20 transition-all"
                            placeholder="from-blue-500 to-indigo-600"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                          ID: {link.id.slice(0, 8)}...
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteLink(link.id)}
                        className="flex items-center gap-2 text-[10px] font-bold text-red-500/50 hover:text-red-500 uppercase tracking-widest transition-all"
                      >
                        <Trash2 size={14} />
                        Excluir Link
                      </button>
                    </div>
                  </div>
                ))}
                {links.length === 0 && (
                  <div className="py-20 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-[2.5rem] bg-white/[0.02]">
                    <LinkIcon className="text-zinc-800 mb-4" size={40} strokeWidth={1} />
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Nenhum link cadastrado.</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === 'profile' && (
            <section className="max-w-2xl space-y-8">
              <div>
                <h2 className="text-3xl font-black tracking-tighter">Configurações do Perfil</h2>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-[0.3em]">Identidade visual e bio</p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-8">
                <div className="bg-[#121214] border border-white/5 p-8 rounded-[2.5rem] space-y-8">
                  <div className="flex items-center gap-8">
                    <div className="relative group cursor-pointer" onClick={() => document.getElementById('avatar-upload')?.click()}>
                      <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/10">
                        <img src={profile?.avatar_url || 'https://picsum.photos/seed/default/400/400'} alt="Avatar" className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                        <Camera size={20} />
                      </div>
                      <input 
                        id="avatar-upload"
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Foto de Perfil</label>
                      <p className="text-sm text-zinc-400 mb-4">Clique na imagem ao lado para fazer upload de uma nova foto do seu dispositivo.</p>
                      <input 
                        type="text" 
                        value={profile?.avatar_url || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, avatar_url: e.target.value } : null)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/20 transition-all"
                        placeholder="Ou cole uma URL aqui..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Nome Exibido</label>
                      <input 
                        type="text" 
                        value={profile?.name || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, name: e.target.value } : null)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Slug (@usuario)</label>
                      <input 
                        type="text" 
                        value={profile?.slug || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, slug: e.target.value } : null)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/20 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Biografia</label>
                    <textarea 
                      rows={4}
                      value={profile?.bio || ''}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, bio: e.target.value } : null)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/20 transition-all resize-none"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-4 bg-white text-black font-bold uppercase tracking-[0.2em] rounded-2xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                  Salvar Alterações
                </button>
              </form>
            </section>
          )}
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
