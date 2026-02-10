import { 
  Server, 
  Database, 
  Shield, 
  Zap, 
  Globe, 
  Settings,
  Cpu,
  HardDrive,
  Lock,
  ArrowUpRight,
  Sparkles
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Features = () => {
  const { t } = useLanguage();

  const features = [
    {
      icon: HardDrive,
      title: t.landing.features.items.storage.title,
      description: t.landing.features.items.storage.description,
      color: "from-violet-500 to-purple-500",
      iconColor: "text-violet-400"
    },
    {
      icon: Globe,
      title: t.landing.features.items.bandwidth.title,
      description: t.landing.features.items.bandwidth.description,
      color: "from-cyan-500 to-blue-500",
      iconColor: "text-cyan-400"
    },
    {
      icon: Shield,
      title: t.landing.features.items.ssl.title,
      description: t.landing.features.items.ssl.description,
      color: "from-emerald-500 to-green-500",
      iconColor: "text-emerald-400"
    },
    {
      icon: Settings,
      title: t.landing.features.items.cpanel.title,
      description: t.landing.features.items.cpanel.description,
      color: "from-orange-500 to-amber-500",
      iconColor: "text-orange-400"
    },
    {
      icon: Database,
      title: t.landing.features.items.database.title,
      description: t.landing.features.items.database.description,
      color: "from-pink-500 to-rose-500",
      iconColor: "text-pink-400"
    },
    {
      icon: Cpu,
      title: t.landing.features.items.php.title,
      description: t.landing.features.items.php.description,
      color: "from-indigo-500 to-violet-500",
      iconColor: "text-indigo-400"
    },
    {
      icon: Zap,
      title: t.landing.features.items.softaculous.title,
      description: t.landing.features.items.softaculous.description,
      color: "from-amber-500 to-yellow-500",
      iconColor: "text-amber-400"
    },
    {
      icon: Server,
      title: t.landing.features.items.uptime.title,
      description: t.landing.features.items.uptime.description,
      color: "from-teal-500 to-cyan-500",
      iconColor: "text-teal-400"
    },
    {
      icon: Lock,
      title: t.landing.features.items.security.title,
      description: t.landing.features.items.security.description,
      color: "from-red-500 to-rose-500",
      iconColor: "text-red-400"
    }
  ];

  return (
    <section className="py-32 bg-slate-50 dark:bg-landing-surface relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-violet-400/5 dark:bg-violet-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-400/5 dark:bg-cyan-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="container px-4 relative z-10">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-xl mb-6 shadow-sm dark:shadow-none">
            <Sparkles className="w-4 h-4 text-violet-500 dark:text-violet-400" />
            <span className="text-sm text-slate-600 dark:text-white/80">{t.landing.features.badge}</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
            {t.landing.features.title}
            <br />
            <span className="bg-gradient-to-r from-violet-500 to-cyan-500 dark:from-violet-400 dark:to-cyan-400 bg-clip-text text-transparent">
              {t.landing.features.titleHighlight}
            </span>
          </h2>
          <p className="text-lg text-slate-500 dark:text-white/50 leading-relaxed">
            {t.landing.features.subtitle}
          </p>
        </div>

        {/* Features grid - Bento style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`group relative p-8 rounded-3xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 backdrop-blur-xl hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-all duration-500 hover:border-slate-300 dark:hover:border-white/20 hover:-translate-y-1 shadow-sm dark:shadow-none ${
                index === 0 ? "md:col-span-2 lg:col-span-1" : ""
              }`}
            >
              {/* Gradient overlay on hover */}
              <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
              
              {/* Icon */}
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} p-[1px] mb-6`}>
                <div className="w-full h-full rounded-2xl bg-white dark:bg-landing-surface flex items-center justify-center">
                  <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                </div>
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                {feature.title}
                <ArrowUpRight className="w-4 h-4 text-slate-300 dark:text-white/30 group-hover:text-slate-500 dark:group-hover:text-white/60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </h3>
              <p className="text-slate-500 dark:text-white/50 leading-relaxed">
                {feature.description}
              </p>

              {/* Corner decoration */}
              <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-slate-100 dark:from-white/5 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
