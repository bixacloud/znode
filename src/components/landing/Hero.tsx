import { ArrowRight, Play, Sparkles, Cloud, Cpu, Shield, Zap, Globe, Server, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const Hero = () => {
  const { t } = useLanguage();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 to-white dark:from-landing-surface dark:to-landing-surface">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-400/20 dark:bg-violet-600/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-cyan-400/15 dark:bg-cyan-500/20 rounded-full blur-[100px] animate-pulse delay-700" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-400/15 dark:bg-indigo-600/20 rounded-full blur-[120px]" />
        
        {/* Grid overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />

        {/* Radial gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 to-white dark:via-landing-surface/50 dark:to-landing-surface" />
      </div>

      {/* Floating elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-[10%] w-20 h-20 border border-slate-200 dark:border-white/10 rounded-2xl backdrop-blur-xl bg-white/80 dark:bg-white/5 flex items-center justify-center animate-float shadow-lg dark:shadow-none">
          <Cloud className="w-8 h-8 text-cyan-500 dark:text-cyan-400" />
        </div>
        <div className="absolute top-40 right-[15%] w-16 h-16 border border-slate-200 dark:border-white/10 rounded-xl backdrop-blur-xl bg-white/80 dark:bg-white/5 flex items-center justify-center animate-float delay-300 shadow-lg dark:shadow-none">
          <Cpu className="w-6 h-6 text-violet-500 dark:text-violet-400" />
        </div>
        <div className="absolute bottom-32 left-[15%] w-14 h-14 border border-slate-200 dark:border-white/10 rounded-xl backdrop-blur-xl bg-white/80 dark:bg-white/5 flex items-center justify-center animate-float delay-500 shadow-lg dark:shadow-none">
          <Shield className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
        </div>
        <div className="absolute bottom-48 right-[10%] w-18 h-18 border border-slate-200 dark:border-white/10 rounded-2xl backdrop-blur-xl bg-white/80 dark:bg-white/5 flex items-center justify-center animate-float delay-700 shadow-lg dark:shadow-none">
          <Zap className="w-7 h-7 text-amber-500 dark:text-amber-400" />
        </div>
      </div>

      <div className="container relative z-10 px-4 py-20 md:py-32">
        <div className="max-w-5xl mx-auto text-center">
          {/* Announcement badge */}
          <div className="inline-flex items-center gap-2 px-1 py-1 pl-4 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-xl mb-8 animate-fade-in group hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer shadow-sm dark:shadow-none">
            <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span className="text-sm text-slate-600 dark:text-white/80">{t.landing.hero.badge}</span>
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-medium">
              {t.landing.hero.badgeCta} <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          {/* Main heading */}
          <h1 className="text-5xl md:text-6xl lg:text-8xl font-bold text-slate-900 dark:text-white leading-[1.1] mb-8 animate-slide-up tracking-tight">
            {t.landing.hero.title}
            <br />
            <span className="bg-gradient-to-r from-violet-500 via-cyan-500 to-emerald-500 dark:from-violet-400 dark:via-cyan-400 dark:to-emerald-400 bg-clip-text text-transparent">
              {t.landing.hero.titleHighlight}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-slate-500 dark:text-white/60 max-w-2xl mx-auto mb-12 animate-slide-up leading-relaxed" style={{ animationDelay: '0.1s' }}>
            {t.landing.hero.subtitle}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Link to="/register">
              <Button className="h-14 px-8 text-base font-medium bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-0 rounded-2xl shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 hover:scale-105">
                {t.landing.hero.cta}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button variant="outline" className="h-14 px-8 text-base font-medium bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 rounded-2xl backdrop-blur-xl group shadow-sm dark:shadow-none">
              <Play className="w-5 h-5 mr-2 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors" />
              {t.landing.hero.watchDemo}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            {[
              { icon: Server, value: "5GB", label: t.landing.hero.stats.storage },
              { icon: Globe, value: "∞", label: t.landing.hero.stats.bandwidth },
              { icon: Shield, value: "Free", label: t.landing.hero.stats.ssl },
              { icon: Zap, value: "99.9%", label: t.landing.hero.stats.uptime },
            ].map((stat, index) => (
              <div 
                key={index} 
                className="group relative p-6 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 backdrop-blur-xl hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-all duration-300 hover:border-slate-300 dark:hover:border-white/20 shadow-sm dark:shadow-none"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-slate-100/50 dark:from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <stat.icon className="w-6 h-6 text-slate-400 dark:text-white/40 mb-3 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors" />
                <div className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-1">{stat.value}</div>
                <div className="text-sm text-slate-500 dark:text-white/50">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom glow line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
    </section>
  );
};

export default Hero;
