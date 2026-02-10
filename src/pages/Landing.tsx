import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Render, Config } from "@puckeditor/core";
import { usePageTitle } from "@/contexts/SiteContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sparkles,
  Server,
  Github,
  Twitter,
  MessageCircle,
  Linkedin,
  ArrowUpRight,
  Menu,
  Sun,
  Moon,
  Languages,
  Check,
  Shield,
  Zap,
  Database,
  Cloud,
  Lock,
  Cpu,
  HardDrive,
  Wifi,
  Globe,
} from "lucide-react";

// Icon mapping for features
const iconMap: Record<string, React.ElementType> = {
  Shield, Zap, Database, Cloud, Lock, Cpu, HardDrive, Wifi, Server, Globe, Check, Sparkles
};

// ============ PUCK COMPONENTS FOR RENDERING ============

// Navbar Component with Theme Toggle and Language Switcher
const NavbarSection = ({
  logoText,
  logoHighlight,
  menuItems,
  showLogin,
  showRegister,
  showThemeToggle,
  showLanguageSwitcher,
  loginText,
  registerText,
  languages,
}: {
  logoText: string;
  logoHighlight: string;
  menuItems: { label: string; href: string }[];
  showLogin: boolean;
  showRegister: boolean;
  showThemeToggle: boolean;
  showLanguageSwitcher: boolean;
  loginText: string;
  registerText: string;
  languages: { code: string; label: string; flag: string }[];
}) => {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-landing-surface/80 backdrop-blur-2xl border-b border-slate-200 dark:border-white/5 py-4">
      <div className="container px-4">
        <div className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <Server className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              {logoText}
              <span className="text-violet-500">{logoHighlight}</span>
            </span>
          </a>

          <div className="hidden md:flex items-center gap-1">
            {menuItems?.map((item, i) => (
              <a
                key={i}
                href={item.href}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {showThemeToggle && (
              <button className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10 transition-all">
                <Sun className="w-5 h-5 dark:hidden" />
                <Moon className="w-5 h-5 hidden dark:block" />
              </button>
            )}
            
            {showLanguageSwitcher && languages?.length > 0 && (
              <div className="relative group">
                <button className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10 transition-all">
                  <Languages className="w-5 h-5" />
                </button>
                <div className="absolute right-0 mt-2 w-40 py-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  {languages.map((lang, i) => (
                    <button key={i} className="w-full px-4 py-2 text-left text-sm text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-2">
                      <span>{lang.flag}</span> {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showLogin && (
              <a href="/login" className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white">
                {loginText}
              </a>
            )}
            {showRegister && (
              <a href="/register" className="px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl shadow-lg hover:scale-105 transition-transform">
                {registerText}
              </a>
            )}
          </div>

          <button className="md:hidden p-2 text-slate-600 dark:text-white/70">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>
    </nav>
  );
};

// Hero Section Component with editable stats
const HeroSection = ({
  title,
  titleHighlight,
  subtitle,
  ctaText,
  ctaLink,
  secondaryCtaText,
  secondaryCtaLink,
  showStats,
  stats,
}: {
  title: string;
  titleHighlight: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  showStats: boolean;
  stats: { value: string; label: string }[];
}) => (
  <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 to-white dark:from-landing-surface dark:to-landing-surface">
    <div className="absolute inset-0">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-400/20 dark:bg-violet-600/30 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-cyan-400/15 dark:bg-cyan-500/20 rounded-full blur-[100px] animate-pulse" />
    </div>
    <div className="container relative z-10 px-4 py-20 text-center">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-5xl md:text-6xl lg:text-8xl font-bold text-slate-900 dark:text-white leading-[1.1] mb-8 tracking-tight">
          {title}<br />
          <span className="bg-gradient-to-r from-violet-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">{titleHighlight}</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-500 dark:text-white/60 max-w-2xl mx-auto mb-12">{subtitle}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <a href={ctaLink} className="h-14 px-8 inline-flex items-center justify-center text-base font-medium bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl shadow-lg hover:scale-105 transition-transform">{ctaText}</a>
          {secondaryCtaText && (
            <a href={secondaryCtaLink || "#"} className="h-14 px-8 inline-flex items-center justify-center text-base font-medium bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-2xl hover:bg-slate-50 dark:hover:bg-white/10 transition-colors">
              {secondaryCtaText}
            </a>
          )}
        </div>
        {showStats && stats?.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10">
                <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{stat.value}</div>
                <div className="text-sm text-slate-500 dark:text-white/50">{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </section>
);

// Features Section Component with editable features
const FeaturesSection = ({
  badge,
  title,
  titleHighlight,
  subtitle,
  columns,
  features,
}: {
  badge: string;
  title: string;
  titleHighlight: string;
  subtitle: string;
  columns: number;
  features: { icon: string; title: string; description: string }[];
}) => {
  return (
    <section className="py-24 bg-slate-50 dark:bg-landing-surface">
      <div className="container px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 mb-6">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <span className="text-sm text-slate-600 dark:text-white/80">{badge}</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            {title} <span className="bg-gradient-to-r from-violet-500 to-cyan-500 bg-clip-text text-transparent">{titleHighlight}</span>
          </h2>
          <p className="text-lg text-slate-500 dark:text-white/50">{subtitle}</p>
        </div>
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6`}>
          {features?.map((feature, i) => {
            const IconComponent = iconMap[feature.icon] || Sparkles;
            return (
              <div key={i} className="p-6 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 hover:border-violet-300 dark:hover:border-violet-500/30 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 dark:from-violet-500/20 dark:to-indigo-500/20 flex items-center justify-center mb-4">
                  <IconComponent className="w-6 h-6 text-violet-500" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-slate-500 dark:text-white/50">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// Pricing Section Component with fully editable plans
const PricingSection = ({
  badge,
  title,
  titleHighlight,
  subtitle,
  plans,
}: {
  badge: string;
  title: string;
  titleHighlight: string;
  subtitle: string;
  plans: {
    name: string;
    price: string;
    period: string;
    description: string;
    features: string[] | { feature: string }[];
    ctaText: string;
    ctaLink: string;
    highlighted: boolean;
    badge: string;
  }[];
}) => (
  <section className="py-24 bg-white dark:bg-landing-surface">
    <div className="container px-4">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 mb-6">
          <span className="text-sm text-slate-600 dark:text-white/80">{badge}</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
          {title} <span className="bg-gradient-to-r from-violet-500 to-cyan-500 bg-clip-text text-transparent">{titleHighlight}</span>
        </h2>
        <p className="text-lg text-slate-500 dark:text-white/50">{subtitle}</p>
      </div>
      <div className={`grid grid-cols-1 ${plans?.length > 1 ? `md:grid-cols-${Math.min(plans.length, 3)}` : ""} gap-8 max-w-5xl mx-auto`}>
        {plans?.map((plan, i) => {
          // Handle both string[] and { feature: string }[] formats
          const featuresList = plan.features?.map((f: string | { feature: string }) => 
            typeof f === "string" ? f : f.feature
          ) || [];
          
          return (
            <div
              key={i}
              className={`relative p-8 rounded-3xl ${
                plan.highlighted
                  ? "bg-slate-50 dark:bg-white/[0.02] border-2 border-violet-500"
                  : "bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 text-white text-sm font-semibold">
                  {plan.badge}
                </div>
              )}
              <div className={plan.badge ? "pt-4" : ""}>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{plan.name}</h3>
                {plan.description && (
                  <p className="text-sm text-slate-500 dark:text-white/50 mb-4">{plan.description}</p>
                )}
                <div className="text-5xl font-bold text-slate-900 dark:text-white mb-6">
                  {plan.price}
                  <span className="text-lg text-slate-400 font-normal">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {featuresList.map((feature: string, fi: number) => (
                    <li key={fi} className="flex items-center gap-2 text-slate-600 dark:text-white/70">
                      <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={plan.ctaLink}
                  className={`block w-full py-3 text-center rounded-xl font-medium transition-all ${
                    plan.highlighted
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:scale-105"
                      : "border border-slate-300 dark:border-white/20 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                  }`}
                >
                  {plan.ctaText}
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

// Testimonials Section
const TestimonialsSection = ({
  badge,
  title,
  titleHighlight,
  subtitle,
  testimonials,
}: {
  badge: string;
  title: string;
  titleHighlight: string;
  subtitle: string;
  testimonials: { name: string; role: string; content: string; avatar: string }[];
}) => (
  <section className="py-24 bg-slate-50 dark:bg-landing-surface">
    <div className="container px-4">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 mb-6">
          <span className="text-sm text-slate-600 dark:text-white/80">{badge}</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
          {title} <span className="bg-gradient-to-r from-violet-500 to-cyan-500 bg-clip-text text-transparent">{titleHighlight}</span>
        </h2>
        <p className="text-lg text-slate-500 dark:text-white/50">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {testimonials?.map((testimonial, i) => (
          <div key={i} className="p-6 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10">
            <p className="text-slate-600 dark:text-white/70 mb-6 italic">"{testimonial.content}"</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white font-semibold">
                {testimonial.avatar || testimonial.name.charAt(0)}
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">{testimonial.name}</div>
                <div className="text-sm text-slate-500 dark:text-white/50">{testimonial.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// FAQ Section
const FAQSection = ({
  badge,
  title,
  titleHighlight,
  subtitle,
  faqs,
}: {
  badge: string;
  title: string;
  titleHighlight: string;
  subtitle: string;
  faqs: { question: string; answer: string }[];
}) => (
  <section className="py-24 bg-white dark:bg-landing-surface">
    <div className="container px-4">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 mb-6">
          <span className="text-sm text-slate-600 dark:text-white/80">{badge}</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
          {title} <span className="bg-gradient-to-r from-violet-500 to-cyan-500 bg-clip-text text-transparent">{titleHighlight}</span>
        </h2>
        <p className="text-lg text-slate-500 dark:text-white/50">{subtitle}</p>
      </div>
      <div className="max-w-3xl mx-auto space-y-4">
        {faqs?.map((faq, i) => (
          <details key={i} className="group p-6 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <span className="font-semibold text-slate-900 dark:text-white">{faq.question}</span>
              <span className="ml-4 text-violet-500 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="mt-4 text-slate-600 dark:text-white/70">{faq.answer}</p>
          </details>
        ))}
      </div>
    </div>
  </section>
);

// CTA Section Component
const CTASection = ({
  title,
  subtitle,
  ctaText,
  ctaLink,
  secondaryCtaText,
  secondaryCtaLink,
  backgroundStyle,
}: {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  backgroundStyle: "gradient" | "solid" | "pattern";
}) => {
  const bgClasses: Record<string, string> = {
    gradient: "bg-gradient-to-r from-violet-600 to-indigo-600",
    solid: "bg-violet-600",
    pattern: "bg-violet-600",
  };

  return (
    <section className={`py-24 ${bgClasses[backgroundStyle] || bgClasses.gradient}`}>
      <div className="container px-4 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">{title}</h2>
        <p className="text-xl text-white/80 max-w-2xl mx-auto mb-10">{subtitle}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href={ctaLink} className="inline-flex h-14 px-8 items-center justify-center bg-white text-violet-600 rounded-2xl font-semibold hover:scale-105 transition-transform">
            {ctaText}
          </a>
          {secondaryCtaText && (
            <a href={secondaryCtaLink || "#"} className="inline-flex h-14 px-8 items-center justify-center border-2 border-white/30 text-white rounded-2xl font-semibold hover:bg-white/10 transition-colors">
              {secondaryCtaText}
            </a>
          )}
        </div>
      </div>
    </section>
  );
};

// Footer Section Component
const FooterSection = ({
  logoText,
  logoHighlight,
  description,
  copyrightText,
  showSocials,
  socials,
  columns,
}: {
  logoText: string;
  logoHighlight: string;
  description: string;
  copyrightText: string;
  showSocials: boolean;
  socials: { platform: string; url: string }[];
  columns: { title: string; links: { label: string; href: string }[] }[];
}) => {
  const socialIcons: Record<string, React.ElementType> = {
    github: Github,
    twitter: Twitter,
    discord: MessageCircle,
    linkedin: Linkedin,
  };

  return (
    <footer className="bg-slate-50 dark:bg-landing-surface relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
      <div className="container px-4 py-20">
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${(columns?.length || 0) + 1} gap-12 mb-16`}>
          <div className="lg:col-span-1">
            <a href="/" className="flex items-center gap-3 mb-6 group">
              <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <Server className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {logoText}<span className="text-violet-500">{logoHighlight}</span>
              </span>
            </a>
            <p className="text-slate-500 dark:text-white/50 mb-8 leading-relaxed max-w-sm">{description}</p>
            {showSocials && socials?.length > 0 && (
              <div className="flex gap-3">
                {socials.map((social, i) => {
                  const Icon = socialIcons[social.platform?.toLowerCase()] || Globe;
                  return (
                    <a
                      key={i}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                    >
                      <Icon className="w-5 h-5" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
          {columns?.map((column, ci) => (
            <div key={ci}>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-6">
                {column.title}
              </h4>
              <ul className="space-y-4">
                {column.links?.map((link, li) => (
                  <li key={li}>
                    <a
                      href={link.href}
                      className="text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1 group"
                    >
                      {link.label}
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 border-t border-slate-200 dark:border-white/10">
          <p className="text-center text-slate-500 dark:text-white/40 text-sm">{copyrightText}</p>
        </div>
      </div>
    </footer>
  );
};

// Text Block Component
const TextBlock = ({
  content,
  align,
  size,
}: {
  content: string;
  align: "left" | "center" | "right";
  size: "small" | "medium" | "large";
}) => {
  const sizeClasses = { small: "text-sm", medium: "text-base", large: "text-lg" };
  return (
    <div className={`py-8 px-4 ${sizeClasses[size]}`} style={{ textAlign: align }}>
      <p className="text-slate-600 dark:text-white/70 max-w-4xl mx-auto">{content}</p>
    </div>
  );
};

// Spacer Component
const Spacer = ({ height }: { height: number }) => <div style={{ height: `${height}px` }} />;

// ============ PUCK CONFIG FOR RENDERING ============
const puckConfig: Config = {
  components: {
    NavbarSection: { render: NavbarSection },
    HeroSection: { render: HeroSection },
    FeaturesSection: { render: FeaturesSection },
    PricingSection: { render: PricingSection },
    TestimonialsSection: { render: TestimonialsSection },
    FAQSection: { render: FAQSection },
    CTASection: { render: CTASection },
    FooterSection: { render: FooterSection },
    TextBlock: { render: TextBlock },
    Spacer: { render: Spacer },
  },
};

interface CustomLandingPage {
  projectData: object;
  isActive: boolean;
}

// Helper function to determine redirect path based on user state
const getRedirectPath = (user: { role?: string } | null, isAuthenticated: boolean): string => {
  if (!isAuthenticated || !user) {
    return "/login";
  }
  if (user.role === "ADMIN") {
    return "/admin/dashboard";
  }
  return "/user/dashboard";
};

const Landing = () => {
  const { t, language } = useLanguage();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [customPage, setCustomPage] = useState<CustomLandingPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  usePageTitle(t.landing?.title || "Home");

  useEffect(() => {
    // Wait for auth to be ready
    if (authLoading) return;
    
    const fetchData = async () => {
      try {
        // Check if landing page is enabled
        const settingsRes = await fetch("/api/settings/public/LANDING_PAGE_ENABLED");
        if (settingsRes.ok) {
          const setting = await settingsRes.json();
          if (setting.value === "false") {
            // Redirect based on user auth state
            navigate(getRedirectPath(user, isAuthenticated));
            return;
          }
        }

        // Fetch custom page for current language
        let response = await fetch(`/api/landing-page/public/${language}`);
        let data = response.ok ? await response.json() : null;
        
        // If no active page for current language, fallback to English
        if (!data?.isActive || !data?.projectData) {
          if (language !== "en") {
            response = await fetch("/api/landing-page/public/en");
            data = response.ok ? await response.json() : null;
          }
        }
        
        // Set custom page if found and active
        if (data?.isActive && data?.projectData) {
          setCustomPage(data);
        } else {
          // No custom page found, redirect based on auth state
          navigate(getRedirectPath(user, isAuthenticated));
          return;
        }
      } catch (error) {
        console.error("Failed to fetch landing page:", error);
        navigate(getRedirectPath(user, isAuthenticated));
        return;
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [language, navigate, user, isAuthenticated, authLoading]);

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Render custom Puck page
  if (customPage?.isActive && customPage.projectData) {
    return (
      <div className="min-h-screen">
        <Render config={puckConfig} data={customPage.projectData as any} />
      </div>
    );
  }

  // Fallback - redirect based on auth state
  navigate(getRedirectPath(user, isAuthenticated));
  return null;
};

export default Landing;
