'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { 
  Instagram, 
  Github, 
  Linkedin, 
  Twitter, 
  Globe, 
  MessageCircle,
  Briefcase,
  ArrowUpRight,
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

const DEFAULT_PROFILE = {
  name: 'Elison Araújo',
  slug: 'elisons.araujo',
  bio: '💻 Criação de Sites Profissionais\n🚀 Link profissional para Instagram\n⚙️ Sistemas e automações para empresas',
  avatar_url: 'https://picsum.photos/seed/elison-premium/400/400',
  instagram: 'https://www.instagram.com/elisons.araujo',
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

const BACKGROUNDS = [
  {
    url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1920&auto=format&fit=crop',
    label: 'Academia'
  },
  {
    url: 'https://images.unsplash.com/photo-1493863641943-9b68992a8d07?q=80&w=1920&auto=format&fit=crop',
    label: 'Fotógrafo'
  },
  {
    url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=1920&auto=format&fit=crop',
    label: 'Advocacia'
  },
  {
    url: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=1920&auto=format&fit=crop',
    label: 'Estética'
  },
  {
    url: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=1920&auto=format&fit=crop',
    label: 'Loja Online'
  }
];

import { supabase } from '@/lib/supabase';
import { AnimatePresence } from 'motion/react';

export default function BioPage() {
  const [profile, setProfile] = useState<any>(DEFAULT_PROFILE);
  const [links, setLinks] = useState<any[]>([]);
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % BACKGROUNDS.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const initPage = async () => {
      if (supabase) {
        // Fetch profile by slug
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('slug', DEFAULT_PROFILE.slug)
          .single();
        
        if (profileData) {
          setProfile(profileData);
          
          // Fetch links for this profile
          const { data: linksData } = await supabase
            .from('links')
            .select('*')
            .eq('profile_id', profileData.id)
            .order('order', { ascending: true });
          
          if (linksData) {
            setLinks(linksData);
          }

          // Track visit
          fetch('/api/track/visit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              profile_id: profileData.id,
              page_url: window.location.href,
              referrer: document.referrer,
              user_agent: navigator.userAgent,
            }),
          }).catch(console.error);

          // Setup Presence
          const channel = supabase.channel('online-users', {
            config: { presence: { key: profileData.id } },
          });
          
          channel
            .on('presence', { event: 'sync' }, () => {})
            .subscribe(async (status) => {
              if (status === 'SUBSCRIBED') {
                await channel.track({
                  online_at: new Date().toISOString(),
                  device: /iPhone|Android/.test(navigator.userAgent) ? 'Mobile' : 'Desktop'
                });
              }
            });

          return () => { channel.unsubscribe(); };
        }
      }
    };

    initPage();
  }, []);

  const handleLinkClick = async (link: any) => {
    try {
      await fetch('/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profile.id,
          link_id: link.id,
          destination: link.url,
          page_url: window.location.href,
          referrer: document.referrer,
          user_agent: navigator.userAgent,
        }),
      });
    } catch (error) {
      console.error('Error tracking click:', error);
    }
    window.open(link.url, '_blank');
  };

  return (
    <main className="min-h-screen bg-[#020205] text-white selection:bg-blue-500 selection:text-white font-sans overflow-x-hidden relative">
      {/* Background Slider */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#020205]/80 via-transparent to-[#020205]/90 z-20" />
        
        <AnimatePresence mode="wait">
          <motion.div
            key={bgIndex}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 0.5, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <Image
              src={BACKGROUNDS[bgIndex].url}
              alt={BACKGROUNDS[bgIndex].label}
              fill
              className="object-cover"
              priority
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </AnimatePresence>

        <div className="absolute bottom-10 left-10 z-30">
          <motion.p 
            key={bgIndex}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 0.4, x: 0 }}
            className="text-[10px] font-mono uppercase tracking-[0.5em] text-white"
          >
            Tema: {BACKGROUNDS[bgIndex].label}
          </motion.p>
        </div>

        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse z-10" />
      </div>

      <div className="relative z-10 max-w-xl mx-auto px-6 pt-20 pb-24 flex flex-col items-center">
        {/* Profile Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center text-center space-y-8 mb-12 w-full"
        >
          <div className="relative group">
            <div className="absolute -inset-4 bg-blue-500/30 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition duration-700" />
            <div className="relative w-32 h-32 rounded-full p-[3px] bg-gradient-to-b from-blue-400 to-transparent shadow-[0_0_30px_rgba(59,130,246,0.5)]">
              <div className="w-full h-full rounded-full overflow-hidden border border-white/20 relative">
                <Image
                  src={profile.avatar_url || 'https://picsum.photos/seed/default/400/400'}
                  alt={profile.name || 'Avatar'}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            <div className="absolute bottom-1 right-1 bg-blue-500 rounded-full p-1.5 border-2 border-[#020205] shadow-lg">
              <Zap size={10} fill="white" className="text-white" />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400">
              {profile.name}
            </h1>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <p className="text-blue-400 font-mono text-[10px] tracking-[0.2em] uppercase font-bold">
                @{profile.slug}
              </p>
            </div>
          </div>

          <div className="space-y-2 max-w-sm">
            {profile.bio.split('\n').map((line: string, i: number) => (
              <p key={i} className="text-zinc-300 text-sm font-medium tracking-wide flex items-center justify-center gap-2">
                {line}
              </p>
            ))}
          </div>
        </motion.div>

        {/* Links Section */}
        <div className="w-full space-y-4 relative">
          <div className="absolute -inset-10 bg-blue-600/5 rounded-[3rem] blur-3xl pointer-events-none" />
          
          {links.map((link, index) => {
            const Icon = ICON_MAP[link.icon || 'Globe'] || Globe;
            return (
              <motion.button
                key={link.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + (0.1 * index), duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => handleLinkClick(link)}
                className="group relative w-full flex items-center p-1 bg-[#10101a]/60 backdrop-blur-3xl border border-white/5 rounded-2xl hover:border-blue-500/50 transition-all duration-500 ease-out overflow-hidden shadow-2xl"
              >
                <div className="relative z-10 w-full flex items-center justify-between p-3">
                  <div className="flex items-center space-x-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${link.color || 'from-zinc-700 to-zinc-900'} shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                      <Icon size={20} strokeWidth={2} />
                    </div>
                    <span className="font-bold text-sm tracking-tight text-zinc-200 group-hover:text-white transition-colors">{link.label}</span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all duration-500">
                    <ArrowUpRight size={14} className="transition-transform duration-500 group-hover:rotate-45" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-blue-500 group-hover:w-full transition-all duration-700" />
              </motion.button>
            );
          })}

          {links.length === 0 && (
            <div className="text-center py-12 text-zinc-500 text-xs uppercase tracking-widest font-mono opacity-50">
              Nenhum link disponível
            </div>
          )}
        </div>

        {/* Footer Socials */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-20 flex flex-col items-center space-y-8"
        >
          <div className="flex items-center space-x-8 text-zinc-500">
            <a href={`https://instagram.com/${profile.slug}`} target="_blank" className="hover:text-white transition-all duration-300 hover:scale-110"><Instagram size={20} /></a>
            <a href="#" className="hover:text-white transition-all duration-300 hover:scale-110"><Linkedin size={20} /></a>
            <a href="#" className="hover:text-white transition-all duration-300 hover:scale-110"><Github size={20} /></a>
            <a href="#" className="hover:text-white transition-all duration-300 hover:scale-110"><Twitter size={20} /></a>
          </div>

          <div className="flex flex-col items-center space-y-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
            <p className="text-zinc-700 text-[9px] uppercase tracking-[0.5em] font-mono">
              {profile.name} Bio Analytics &copy; 2026
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
