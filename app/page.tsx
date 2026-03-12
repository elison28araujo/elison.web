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
  ArrowUpRight
} from 'lucide-react';

const PROFILE = {
  id: null, // No longer using a non-UUID placeholder
  name: 'Elison Araújo',
  slug: 'elisons.araujo',
  bio: '💻 Criação de Sites Profissionais\n🚀 Link profissional para Instagram\n⚙️ Sistemas e automações para empresas',
  avatar_url: 'https://picsum.photos/seed/elison-premium/400/400',
  background_url: 'https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?q=80&w=1920&auto=format&fit=crop',
  instagram: 'https://www.instagram.com/elisons.araujo',
};

const LINKS = [
  {
    id: 'whatsapp',
    label: 'Falar no WhatsApp',
    url: 'https://wa.me/5594991014378',
    icon: MessageCircle,
    color: 'from-[#25D366] to-[#128C7E]',
  },
  {
    id: 'instagram',
    label: 'Meu Instagram',
    url: 'https://www.instagram.com/elisons.araujo',
    icon: Instagram,
    color: 'from-[#833ab4] via-[#fd1d1d] to-[#fcb045]',
  },
  {
    id: 'esa-play',
    label: 'Conhecer ESA Play',
    url: '#',
    icon: Zap,
    color: 'from-blue-600 to-indigo-700',
  },
  {
    id: 'create-site',
    label: 'Criar um Site Profissional',
    url: '#',
    icon: Globe,
    color: 'from-emerald-500 to-teal-700',
  },
  {
    id: 'projects',
    label: 'Ver Meus Projetos',
    url: '#',
    icon: Briefcase,
    color: 'from-zinc-700 to-zinc-900',
  },
];

import { supabase } from '@/lib/supabase';
import { Zap } from 'lucide-react';

export default function BioPage() {
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    const initPage = async () => {
      let realId: string | null = null;
      
      if (supabase) {
        // Try to get real UUID from DB to avoid syntax errors if DB is strict
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('slug', PROFILE.slug) // Use the correct slug from the constant
          .single();
        
        if (profile?.id) {
          realId = profile.id;
          setProfileId(realId);
        }
      }

      // Track visit - only if we have a realId or we send null
      // The API handles null by inserting null into the UUID column
      fetch('/api/track/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: realId,
          page_url: window.location.href,
          referrer: document.referrer,
          user_agent: navigator.userAgent,
        }),
      }).catch(console.error);

      // Setup Presence
      if (supabase) {
        const channel = supabase.channel('online-users', {
          config: { presence: { key: realId || PROFILE.slug } },
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
    };

    initPage();
  }, []);

  const handleLinkClick = async (link: typeof LINKS[0]) => {
    // Track click
    try {
      await fetch('/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profileId,
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
    // Redirect
    window.open(link.url, '_blank');
  };

  return (
    <main className="min-h-screen bg-[#020205] text-white selection:bg-blue-500 selection:text-white font-sans overflow-x-hidden relative">
      {/* Background with immersive tech feel */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#020205]/90 via-[#020205]/40 to-[#020205] z-10" />
        <Image
          src={PROFILE.background_url}
          alt="Background"
          fill
          className="object-cover opacity-30 scale-105"
          priority
          referrerPolicy="no-referrer"
        />
        {/* Immersive Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px]" />
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
            {/* Blue Glow around Avatar */}
            <div className="absolute -inset-4 bg-blue-500/30 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition duration-700" />
            <div className="relative w-32 h-32 rounded-full p-[3px] bg-gradient-to-b from-blue-400 to-transparent shadow-[0_0_30px_rgba(59,130,246,0.5)]">
              <div className="w-full h-full rounded-full overflow-hidden border border-white/20 relative">
                <Image
                  src={PROFILE.avatar_url}
                  alt={PROFILE.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            {/* Verified Badge */}
            <div className="absolute bottom-1 right-1 bg-blue-500 rounded-full p-1.5 border-2 border-[#020205] shadow-lg">
              <Zap size={10} fill="white" className="text-white" />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400">
              {PROFILE.name}
            </h1>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <p className="text-blue-400 font-mono text-[10px] tracking-[0.2em] uppercase font-bold">
                @{PROFILE.slug}
              </p>
            </div>
          </div>

          <div className="space-y-2 max-w-sm">
            {PROFILE.bio.split('\n').map((line, i) => (
              <p key={i} className="text-zinc-300 text-sm font-medium tracking-wide flex items-center justify-center gap-2">
                {line}
              </p>
            ))}
          </div>
        </motion.div>

        {/* Links Section with Card Glow */}
        <div className="w-full space-y-4 relative">
          {/* Subtle card container glow */}
          <div className="absolute -inset-10 bg-blue-600/5 rounded-[3rem] blur-3xl pointer-events-none" />
          
          {LINKS.map((link, index) => (
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
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${link.color} shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                    <link.icon size={20} strokeWidth={2} />
                  </div>
                  <span className="font-bold text-sm tracking-tight text-zinc-200 group-hover:text-white transition-colors">{link.label}</span>
                </div>
                <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all duration-500">
                  <ArrowUpRight size={14} className="transition-transform duration-500 group-hover:rotate-45" />
                </div>
              </div>
              
              {/* Hover highlight line */}
              <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-blue-500 group-hover:w-full transition-all duration-700" />
            </motion.button>
          ))}
        </div>

        {/* Footer Socials */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-20 flex flex-col items-center space-y-8"
        >
          <div className="flex items-center space-x-8 text-zinc-500">
            <a href={PROFILE.instagram} target="_blank" className="hover:text-white transition-all duration-300 hover:scale-110"><Instagram size={20} /></a>
            <a href="#" className="hover:text-white transition-all duration-300 hover:scale-110"><Linkedin size={20} /></a>
            <a href="#" className="hover:text-white transition-all duration-300 hover:scale-110"><Github size={20} /></a>
            <a href="#" className="hover:text-white transition-all duration-300 hover:scale-110"><Twitter size={20} /></a>
          </div>

          <div className="flex flex-col items-center space-y-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
            <p className="text-zinc-700 text-[9px] uppercase tracking-[0.5em] font-mono">
              Elison Bio Analytics &copy; 2026
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
