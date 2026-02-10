import { Check, Sparkles, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const Pricing = () => {
  const { t } = useLanguage();

  const plans = [
    {
      name: t.landing.pricing.plans.free.name,
      price: t.landing.pricing.plans.free.price,
      period: t.landing.pricing.plans.free.period,
      description: t.landing.pricing.plans.free.description,
      features: t.landing.pricing.plans.free.features,
      cta: t.landing.pricing.plans.free.cta,
      popular: true,
      gradient: "from-violet-600 via-indigo-600 to-cyan-600",
    },
    {
      name: t.landing.pricing.plans.premium.name,
      price: t.landing.pricing.plans.premium.price,
      period: t.landing.pricing.plans.premium.period,
      description: t.landing.pricing.plans.premium.description,
      features: t.landing.pricing.plans.premium.features,
      cta: t.landing.pricing.plans.premium.cta,
      popular: false,
    },
  ];

  return (
    <section className="py-32 bg-white dark:bg-landing-surface relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-400/5 dark:bg-violet-600/5 rounded-full blur-[120px]" />
      </div>

      <div className="container px-4 relative z-10">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-xl mb-6 shadow-sm dark:shadow-none">
            <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span className="text-sm text-slate-600 dark:text-white/80">{t.landing.pricing.badge}</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
            {t.landing.pricing.title}
            <span className="bg-gradient-to-r from-violet-500 to-cyan-500 dark:from-violet-400 dark:to-cyan-400 bg-clip-text text-transparent"> {t.landing.pricing.titleHighlight}</span>
          </h2>
          <p className="text-lg text-slate-500 dark:text-white/50">
            {t.landing.pricing.subtitle}
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative group ${plan.popular ? "md:-mt-4 md:mb-4" : ""}`}
            >
              {/* Gradient border for popular plan */}
              {plan.popular && (
                <div className="absolute -inset-[1px] bg-gradient-to-r from-violet-600 via-cyan-600 to-violet-600 rounded-[2rem] opacity-100 blur-sm group-hover:blur-md transition-all duration-500" />
              )}
              
              <div className={`relative h-full p-8 md:p-10 rounded-[2rem] ${
                plan.popular 
                  ? "bg-slate-50 dark:bg-landing-surface-alt border border-slate-200 dark:border-white/10" 
                  : "bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
              } backdrop-blur-xl transition-all duration-300 shadow-sm dark:shadow-none`}>
                
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 text-white text-sm font-semibold shadow-lg shadow-violet-500/25">
                      <Sparkles className="w-4 h-4" />
                      {t.landing.pricing.popularBadge}
                    </div>
                  </div>
                )}

                <div className="mb-8 pt-4">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-slate-500 dark:text-white/50 text-sm mb-6">
                    {plan.description}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-5xl md:text-6xl font-bold ${
                      plan.popular 
                        ? "bg-gradient-to-r from-violet-500 to-cyan-500 dark:from-violet-400 dark:to-cyan-400 bg-clip-text text-transparent" 
                        : "text-slate-900 dark:text-white"
                    }`}>
                      {plan.price}
                    </span>
                    <span className="text-slate-400 dark:text-white/40 text-lg">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-10">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        plan.popular 
                          ? "bg-gradient-to-r from-violet-600 to-cyan-600" 
                          : "bg-slate-200 dark:bg-white/10"
                      }`}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-slate-600 dark:text-white/70">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link to={plan.popular ? "/register" : "#"} className="block">
                  <Button
                    className={`w-full h-14 text-base font-medium rounded-2xl transition-all duration-300 ${
                      plan.popular 
                        ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02]" 
                        : "bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20"
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="mt-20 text-center">
          <p className="text-slate-400 dark:text-white/30 text-sm mb-6">{t.landing.pricing.trust.title}</p>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            {[
              `⭐️ ${t.landing.pricing.trust.rating}`, 
              `🚀 ${t.landing.pricing.trust.uptime}`, 
              `💬 ${t.landing.pricing.trust.support}`, 
              `🔒 ${t.landing.pricing.trust.ssl}`
            ].map((badge, i) => (
              <div key={i} className="px-4 py-2 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/60 text-sm">
                {badge}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
