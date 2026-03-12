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
  id: 'elison-profile-id',
  name: 'Elison Araújo',
  slug: 'elisonaraujo',
  bio: 'Especialista em Desenvolvimento Full-Stack & Design de Interfaces Premium. Transformando ideias em produtos digitais de alto impacto.',
  avatar_url: 'https://picsum.photos/seed/elison/200/200',
  background_url: 'https://picsum.photos/seed/premium/1920/1080?blur=10',
};

const LINKS = [
  {
    id: 'whatsapp',
    label: 'WhatsApp Direto',
    url: 'https://wa.me/5500000000000',
    icon: MessageCircle,
    color: 'bg-[#25D366]',
  },
  {
    id: 'instagram',
    label: 'Instagram Oficial',
    url: 'https://instagram.com/elison',
    icon: Instagram,
    color: 'bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]',
  },
  {
    id: 'services',
    label: 'Conhecer Serviços',
    url: '#services',
    icon: Briefcase,
    color: 'bg-zinc-800',
  },
  {
    id: 'portfolio',
    label: 'Ver Projetos',
    url: '#portfolio',
    icon: Globe,
    color: 'bg-zinc-800',
  },
];

import { supabase } from '@/lib/supabase';

export default function BioPage() {
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    const initPage = async () => {
      if (!supabase) return;

      // 1. Fetch real profile ID from DB using slug
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('slug', PROFILE.slug)
        .single();

      const realId = profile?.id;
      setProfileId(realId);

      // 2. Track visit with real UUID if found
      if (realId) {
        fetch('/api/track/visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile_id: realId,
            referrer: document.referrer,
            user_agent: navigator.userAgent,
          }),
        }).catch(console.error);
      }

      // 3. Setup Presence
      const channel = supabase.channel('online-users', {
        config: {
          presence: {
            key: realId || PROFILE.slug,
          },
        },
      });
      
      channel
        .on('presence', { event: 'sync' }, () => {
          // No action needed on client side for sync
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              online_at: new Date().toISOString(),
              device: /iPhone|Android/.test(navigator.userAgent) ? 'Mobile' : 'Desktop'
            });
          }
        });

      return () => {
        channel.unsubscribe();
      };
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
    <main className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-sans overflow-x-hidden relative">
      {/* Background with subtle gradient and blur */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black z-10" />
        <Image
          src={PROFILE.background_url}
          alt="Background"
          fill
          className="object-cover opacity-50 scale-105"
          priority
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="relative z-10 max-w-xl mx-auto px-6 pt-20 pb-24 flex flex-col items-center">
        {/* Profile Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center text-center space-y-6 mb-12"
        >
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-zinc-800 to-zinc-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-white/10 shadow-2xl">
              <Image
                src={PROFILE.avatar_url}
                alt={PROFILE.name}
                fill
                className="object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-light tracking-tight sm:text-5xl">
              {PROFILE.name}
            </h1>
            <p className="text-zinc-400 font-mono text-xs tracking-[0.3em] uppercase">
              @{PROFILE.slug}
            </p>
          </div>

          <p className="text-zinc-300 leading-relaxed max-w-sm text-lg font-light">
            {PROFILE.bio}
          </p>
        </motion.div>

        {/* Links Section */}
        <div className="w-full space-y-4">
          {LINKS.map((link, index) => (
            <motion.button
              key={link.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.5 }}
              onClick={() => handleLinkClick(link)}
              className="group relative w-full flex items-center justify-between p-5 bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-2xl hover:bg-white hover:text-black transition-all duration-500 ease-out overflow-hidden"
            >
              <div className="flex items-center space-x-4 relative z-10">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${link.color} group-hover:scale-110 transition-transform duration-300`}>
                  <link.icon size={20} />
                </div>
                <span className="font-medium text-lg tracking-tight">{link.label}</span>
              </div>
              <ArrowUpRight size={20} className="text-zinc-500 group-hover:text-black transition-colors relative z-10" />
              
              {/* Hover background effect */}
              <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out z-0" />
            </motion.button>
          ))}
        </div>

        {/* Footer Socials */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-16 flex items-center space-x-8 text-zinc-500"
        >
          <a href="#" className="hover:text-white transition-colors duration-300"><Instagram size={22} /></a>
          <a href="#" className="hover:text-white transition-colors duration-300"><Linkedin size={22} /></a>
          <a href="#" className="hover:text-white transition-colors duration-300"><Github size={22} /></a>
          <a href="#" className="hover:text-white transition-colors duration-300"><Twitter size={22} /></a>
        </motion.div>

        <div className="mt-24 text-zinc-700 text-[10px] uppercase tracking-[0.4em] font-mono">
          Elison Bio Analytics &copy; 2026
        </div>
      </div>
    </main>
  );
}
