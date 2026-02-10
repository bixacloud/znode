import { useState, useEffect, useCallback } from "react";
import { Puck, Render, Config, Data } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import AdminLayout from "@/components/admin/AdminLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Save,
  Eye,
  Globe,
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
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Icon mapping for features
const iconMap: Record<string, React.ElementType> = {
  Shield, Zap, Database, Cloud, Lock, Cpu, HardDrive, Wifi, Server, Globe, Check, Sparkles
};

// ============ PUCK COMPONENTS ============

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
            {menuItems.map((item, i) => (
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
            
            {showLanguageSwitcher && languages.length > 0 && (
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
        {showStats && stats.length > 0 && (
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
          {features.map((feature, i) => {
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
    features: string[];
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
      <div className={`grid grid-cols-1 ${plans.length > 1 ? `md:grid-cols-${Math.min(plans.length, 3)}` : ""} gap-8 max-w-5xl mx-auto`}>
        {plans.map((plan, i) => (
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
                {plan.features.map((feature, fi) => (
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
        ))}
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
        {testimonials.map((testimonial, i) => (
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
        {faqs.map((faq, i) => (
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
  const bgClasses = {
    gradient: "bg-gradient-to-r from-violet-600 to-indigo-600",
    solid: "bg-violet-600",
    pattern: "bg-violet-600 bg-[url('data:image/svg+xml,...')]",
  };

  return (
    <section className={`py-24 ${bgClasses[backgroundStyle]}`}>
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
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns.length + 1} gap-12 mb-16`}>
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
            {showSocials && socials.length > 0 && (
              <div className="flex gap-3">
                {socials.map((social, i) => {
                  const Icon = socialIcons[social.platform.toLowerCase()] || Globe;
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
          {columns.map((column, ci) => (
            <div key={ci}>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-6">
                {column.title}
              </h4>
              <ul className="space-y-4">
                {column.links.map((link, li) => (
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

// ============ PUCK CONFIG ============
const puckConfig: Config = {
  categories: {
    layout: { title: "Layout", components: ["NavbarSection", "FooterSection"] },
    sections: { title: "Sections", components: ["HeroSection", "FeaturesSection", "PricingSection", "TestimonialsSection", "FAQSection", "CTASection"] },
    content: { title: "Content", components: ["TextBlock", "Spacer"] },
  },
  components: {
    NavbarSection: {
      label: "Navbar",
      defaultProps: {
        logoText: "Z",
        logoHighlight: "Node",
        menuItems: [
          { label: "Features", href: "#features" },
          { label: "Pricing", href: "#pricing" },
          { label: "FAQ", href: "#faq" },
        ],
        showLogin: true,
        showRegister: true,
        showThemeToggle: true,
        showLanguageSwitcher: true,
        loginText: "Login",
        registerText: "Get Started",
        languages: [
          { code: "en", label: "English", flag: "🇺🇸" },
          { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
        ],
      },
      fields: {
        logoText: { type: "text", label: "Logo Text" },
        logoHighlight: { type: "text", label: "Logo Highlight (colored part)" },
        menuItems: {
          type: "array",
          label: "Menu Items",
          arrayFields: {
            label: { type: "text", label: "Label" },
            href: { type: "text", label: "Link (href)" },
          },
          getItemSummary: (item: { label: string }) => item.label || "Menu Item",
        },
        showThemeToggle: { type: "radio", label: "Show Theme Toggle (Light/Dark)", options: [{ label: "Yes", value: true }, { label: "No", value: false }] },
        showLanguageSwitcher: { type: "radio", label: "Show Language Switcher", options: [{ label: "Yes", value: true }, { label: "No", value: false }] },
        languages: {
          type: "array",
          label: "Languages",
          arrayFields: {
            code: { type: "text", label: "Language Code (e.g., en, vi)" },
            label: { type: "text", label: "Display Name" },
            flag: { type: "text", label: "Flag Emoji" },
          },
          getItemSummary: (item: { label: string; flag: string }) => `${item.flag} ${item.label}` || "Language",
        },
        showLogin: { type: "radio", label: "Show Login Button", options: [{ label: "Yes", value: true }, { label: "No", value: false }] },
        showRegister: { type: "radio", label: "Show Register Button", options: [{ label: "Yes", value: true }, { label: "No", value: false }] },
        loginText: { type: "text", label: "Login Button Text" },
        registerText: { type: "text", label: "Register Button Text" },
      },
      render: NavbarSection,
    },
    HeroSection: {
      label: "Hero Section",
      defaultProps: {
        title: "Free Web Hosting",
        titleHighlight: "For Everyone",
        subtitle: "Deploy your website in minutes with free hosting, SSL certificates and professional cPanel management.",
        ctaText: "Get Started Free",
        ctaLink: "/register",
        secondaryCtaText: "Learn More",
        secondaryCtaLink: "#features",
        showStats: true,
        stats: [
          { value: "5GB", label: "SSD Storage" },
          { value: "∞", label: "Bandwidth" },
          { value: "Free", label: "SSL Certificate" },
          { value: "99.9%", label: "Uptime" },
        ],
      },
      fields: {
        title: { type: "text", label: "Title" },
        titleHighlight: { type: "text", label: "Title Highlight (gradient text)" },
        subtitle: { type: "textarea", label: "Subtitle" },
        ctaText: { type: "text", label: "Primary CTA Text" },
        ctaLink: { type: "text", label: "Primary CTA Link" },
        secondaryCtaText: { type: "text", label: "Secondary CTA Text (leave empty to hide)" },
        secondaryCtaLink: { type: "text", label: "Secondary CTA Link" },
        showStats: { type: "radio", label: "Show Stats", options: [{ label: "Yes", value: true }, { label: "No", value: false }] },
        stats: {
          type: "array",
          label: "Statistics",
          arrayFields: {
            value: { type: "text", label: "Value (e.g., 5GB, 99.9%)" },
            label: { type: "text", label: "Label" },
          },
          getItemSummary: (item: { value: string; label: string }) => `${item.value} - ${item.label}` || "Stat",
        },
      },
      render: HeroSection,
    },
    FeaturesSection: {
      label: "Features Section",
      defaultProps: {
        badge: "Powerful Features",
        title: "Everything You Need",
        titleHighlight: "To Succeed",
        subtitle: "Our hosting comes packed with features to help you build amazing websites.",
        columns: 3,
        features: [
          { icon: "HardDrive", title: "5GB SSD Storage", description: "Fast SSD storage for your website files and databases." },
          { icon: "Wifi", title: "Unlimited Bandwidth", description: "No limits on your website traffic - grow without restrictions." },
          { icon: "Lock", title: "Free SSL Certificate", description: "Secure your website with HTTPS encryption at no cost." },
          { icon: "Cpu", title: "cPanel Control Panel", description: "Industry-standard control panel for easy management." },
          { icon: "Database", title: "MySQL Databases", description: "Powerful database support for dynamic websites." },
          { icon: "Zap", title: "99.9% Uptime", description: "Reliable hosting infrastructure you can count on." },
        ],
      },
      fields: {
        badge: { type: "text", label: "Badge Text" },
        title: { type: "text", label: "Title" },
        titleHighlight: { type: "text", label: "Title Highlight" },
        subtitle: { type: "textarea", label: "Subtitle" },
        columns: { type: "select", label: "Columns", options: [{ label: "2 Columns", value: 2 }, { label: "3 Columns", value: 3 }] },
        features: {
          type: "array",
          label: "Features",
          arrayFields: {
            icon: {
              type: "select",
              label: "Icon",
              options: [
                { label: "Shield", value: "Shield" },
                { label: "Zap (Lightning)", value: "Zap" },
                { label: "Database", value: "Database" },
                { label: "Cloud", value: "Cloud" },
                { label: "Lock", value: "Lock" },
                { label: "CPU", value: "Cpu" },
                { label: "Hard Drive", value: "HardDrive" },
                { label: "Wifi", value: "Wifi" },
                { label: "Server", value: "Server" },
                { label: "Globe", value: "Globe" },
                { label: "Check", value: "Check" },
                { label: "Sparkles", value: "Sparkles" },
              ],
            },
            title: { type: "text", label: "Feature Title" },
            description: { type: "textarea", label: "Description" },
          },
          getItemSummary: (item: { title: string }) => item.title || "Feature",
        },
      },
      render: FeaturesSection,
    },
    PricingSection: {
      label: "Pricing Section",
      defaultProps: {
        badge: "Simple Pricing",
        title: "Choose Your",
        titleHighlight: "Plan",
        subtitle: "Start free and upgrade when you need more resources.",
        plans: [
          {
            name: "Free",
            price: "$0",
            period: "/month",
            description: "Perfect for personal projects and small websites.",
            features: ["5GB SSD Storage", "Unlimited Bandwidth", "Free SSL Certificate", "cPanel Access", "1 MySQL Database", "1 Email Account"],
            ctaText: "Get Started Free",
            ctaLink: "/register",
            highlighted: true,
            badge: "Most Popular",
          },
          {
            name: "Premium",
            price: "$4.99",
            period: "/month",
            description: "For growing websites that need more power.",
            features: ["Unlimited Storage", "Unlimited Bandwidth", "Wildcard SSL", "Priority Support", "Unlimited Databases", "Unlimited Email", "Daily Backups"],
            ctaText: "Upgrade Now",
            ctaLink: "/register?plan=premium",
            highlighted: false,
            badge: "",
          },
        ],
      },
      fields: {
        badge: { type: "text", label: "Section Badge" },
        title: { type: "text", label: "Title" },
        titleHighlight: { type: "text", label: "Title Highlight" },
        subtitle: { type: "textarea", label: "Subtitle" },
        plans: {
          type: "array",
          label: "Pricing Plans",
          arrayFields: {
            name: { type: "text", label: "Plan Name" },
            price: { type: "text", label: "Price (e.g., $0, $4.99)" },
            period: { type: "text", label: "Period (e.g., /month, /year)" },
            description: { type: "text", label: "Plan Description" },
            features: {
              type: "array",
              label: "Features",
              arrayFields: {
                feature: { type: "text", label: "Feature" },
              },
              getItemSummary: (item: { feature: string } | string) => (typeof item === "string" ? item : item.feature) || "Feature",
            },
            ctaText: { type: "text", label: "Button Text" },
            ctaLink: { type: "text", label: "Button Link" },
            highlighted: { type: "radio", label: "Highlighted (featured plan)", options: [{ label: "Yes", value: true }, { label: "No", value: false }] },
            badge: { type: "text", label: "Badge Text (e.g., Most Popular)" },
          },
          getItemSummary: (item: { name: string; price: string }) => `${item.name} - ${item.price}` || "Plan",
        },
      },
      render: ({ plans, ...props }) => {
        // Transform features array format
        const transformedPlans = plans.map((plan: {
          name: string;
          price: string;
          period: string;
          description: string;
          features: string[] | { feature: string }[];
          ctaText: string;
          ctaLink: string;
          highlighted: boolean;
          badge: string;
        }) => ({
          ...plan,
          features: plan.features.map((f: string | { feature: string }) => (typeof f === "string" ? f : f.feature)),
        }));
        return <PricingSection {...props} plans={transformedPlans} />;
      },
    },
    TestimonialsSection: {
      label: "Testimonials",
      defaultProps: {
        badge: "Testimonials",
        title: "What Our Users",
        titleHighlight: "Say",
        subtitle: "Hear from people who have built their websites with us.",
        testimonials: [
          { name: "John Doe", role: "Web Developer", content: "Amazing free hosting service! I've been using it for 6 months and couldn't be happier.", avatar: "J" },
          { name: "Jane Smith", role: "Blogger", content: "Perfect for my blog. Easy to set up and the uptime has been excellent.", avatar: "J" },
          { name: "Mike Johnson", role: "Student", content: "Great for learning web development. The cPanel is easy to use.", avatar: "M" },
        ],
      },
      fields: {
        badge: { type: "text", label: "Badge Text" },
        title: { type: "text", label: "Title" },
        titleHighlight: { type: "text", label: "Title Highlight" },
        subtitle: { type: "textarea", label: "Subtitle" },
        testimonials: {
          type: "array",
          label: "Testimonials",
          arrayFields: {
            name: { type: "text", label: "Name" },
            role: { type: "text", label: "Role/Title" },
            content: { type: "textarea", label: "Testimonial Content" },
            avatar: { type: "text", label: "Avatar (single letter or emoji)" },
          },
          getItemSummary: (item: { name: string }) => item.name || "Testimonial",
        },
      },
      render: TestimonialsSection,
    },
    FAQSection: {
      label: "FAQ Section",
      defaultProps: {
        badge: "FAQ",
        title: "Frequently Asked",
        titleHighlight: "Questions",
        subtitle: "Find answers to common questions about our hosting service.",
        faqs: [
          { question: "Is the hosting really free?", answer: "Yes! Our basic hosting plan is completely free with no hidden costs. You get 5GB storage, unlimited bandwidth, and free SSL." },
          { question: "How long can I use the free hosting?", answer: "There's no time limit. You can use our free hosting for as long as you want, as long as your account remains active." },
          { question: "Can I upgrade later?", answer: "Absolutely! You can upgrade to our Premium plan anytime to get more storage, priority support, and additional features." },
          { question: "What's included in free SSL?", answer: "Every hosting account gets a free Let's Encrypt SSL certificate that auto-renews. Your site will be secure with HTTPS." },
        ],
      },
      fields: {
        badge: { type: "text", label: "Badge Text" },
        title: { type: "text", label: "Title" },
        titleHighlight: { type: "text", label: "Title Highlight" },
        subtitle: { type: "textarea", label: "Subtitle" },
        faqs: {
          type: "array",
          label: "FAQ Items",
          arrayFields: {
            question: { type: "text", label: "Question" },
            answer: { type: "textarea", label: "Answer" },
          },
          getItemSummary: (item: { question: string }) => item.question || "Question",
        },
      },
      render: FAQSection,
    },
    CTASection: {
      label: "CTA Section",
      defaultProps: {
        title: "Ready to Get Started?",
        subtitle: "Join thousands of users who trust us with their websites. Create your free account today.",
        ctaText: "Create Free Account",
        ctaLink: "/register",
        secondaryCtaText: "Contact Sales",
        secondaryCtaLink: "/contact",
        backgroundStyle: "gradient",
      },
      fields: {
        title: { type: "text", label: "Title" },
        subtitle: { type: "textarea", label: "Subtitle" },
        ctaText: { type: "text", label: "Primary CTA Text" },
        ctaLink: { type: "text", label: "Primary CTA Link" },
        secondaryCtaText: { type: "text", label: "Secondary CTA Text (leave empty to hide)" },
        secondaryCtaLink: { type: "text", label: "Secondary CTA Link" },
        backgroundStyle: {
          type: "select",
          label: "Background Style",
          options: [
            { label: "Gradient", value: "gradient" },
            { label: "Solid", value: "solid" },
          ],
        },
      },
      render: CTASection,
    },
    FooterSection: {
      label: "Footer",
      defaultProps: {
        logoText: "Z",
        logoHighlight: "Node",
        description: "Free web hosting with unlimited bandwidth, SSL certificates, and professional cPanel management. Build your website today!",
        copyrightText: "© 2024 ZNode. All rights reserved.",
        showSocials: true,
        socials: [
          { platform: "github", url: "https://github.com" },
          { platform: "twitter", url: "https://twitter.com" },
          { platform: "discord", url: "https://discord.gg" },
        ],
        columns: [
          {
            title: "Quick Links",
            links: [
              { label: "Home", href: "/" },
              { label: "Features", href: "#features" },
              { label: "Pricing", href: "#pricing" },
              { label: "FAQ", href: "#faq" },
            ],
          },
          {
            title: "Resources",
            links: [
              { label: "Documentation", href: "/docs" },
              { label: "Support", href: "/support" },
              { label: "Status", href: "/status" },
              { label: "Blog", href: "/blog" },
            ],
          },
          {
            title: "Legal",
            links: [
              { label: "Terms of Service", href: "/terms" },
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Cookie Policy", href: "/cookies" },
            ],
          },
        ],
      },
      fields: {
        logoText: { type: "text", label: "Logo Text" },
        logoHighlight: { type: "text", label: "Logo Highlight (colored part)" },
        description: { type: "textarea", label: "Description" },
        copyrightText: { type: "text", label: "Copyright Text" },
        showSocials: { type: "radio", label: "Show Social Icons", options: [{ label: "Yes", value: true }, { label: "No", value: false }] },
        socials: {
          type: "array",
          label: "Social Links",
          arrayFields: {
            platform: {
              type: "select",
              label: "Platform",
              options: [
                { label: "GitHub", value: "github" },
                { label: "Twitter/X", value: "twitter" },
                { label: "Discord", value: "discord" },
                { label: "LinkedIn", value: "linkedin" },
              ],
            },
            url: { type: "text", label: "URL" },
          },
          getItemSummary: (item: { platform: string }) => item.platform || "Social",
        },
        columns: {
          type: "array",
          label: "Footer Columns",
          arrayFields: {
            title: { type: "text", label: "Column Title" },
            links: {
              type: "array",
              label: "Links",
              arrayFields: {
                label: { type: "text", label: "Link Label" },
                href: { type: "text", label: "Link URL" },
              },
              getItemSummary: (item: { label: string }) => item.label || "Link",
            },
          },
          getItemSummary: (item: { title: string }) => item.title || "Column",
        },
      },
      render: FooterSection,
    },
    TextBlock: {
      label: "Text Block",
      defaultProps: { content: "Add your content here...", align: "center", size: "medium" },
      fields: {
        content: { type: "textarea", label: "Content" },
        align: { type: "select", label: "Alignment", options: [{ label: "Left", value: "left" }, { label: "Center", value: "center" }, { label: "Right", value: "right" }] },
        size: { type: "select", label: "Size", options: [{ label: "Small", value: "small" }, { label: "Medium", value: "medium" }, { label: "Large", value: "large" }] },
      },
      render: TextBlock,
    },
    Spacer: {
      label: "Spacer",
      defaultProps: { height: 40 },
      fields: { height: { type: "number", label: "Height (px)", min: 10, max: 200 } },
      render: Spacer,
    },
  },
};

// Default page data
const getDefaultData = (): Data => ({
  content: [
    {
      type: "NavbarSection",
      props: {
        id: "navbar-1",
        logoText: "SUSPENDED",
        logoHighlight: ".HOST",
        menuItems: [
          { label: "Features", href: "#features" },
          { label: "Pricing", href: "#pricing" },
          { label: "FAQ", href: "#faq" },
        ],
        showLogin: true,
        showRegister: true,
        showThemeToggle: true,
        showLanguageSwitcher: true,
        loginText: "Login",
        registerText: "Get Started",
        languages: [
          { code: "en", label: "English", flag: "🇺🇸" },
          { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
        ],
      },
    },
    {
      type: "HeroSection",
      props: {
        id: "hero-1",
        title: "Free Web Hosting",
        titleHighlight: "For Everyone",
        subtitle: "Deploy your website in minutes with free hosting, SSL certificates and professional cPanel management.",
        ctaText: "Get Started Free",
        ctaLink: "/register",
        secondaryCtaText: "Learn More",
        secondaryCtaLink: "#features",
        showStats: true,
        stats: [
          { value: "5GB", label: "SSD Storage" },
          { value: "∞", label: "Bandwidth" },
          { value: "Free", label: "SSL Certificate" },
          { value: "99.9%", label: "Uptime" },
        ],
      },
    },
    {
      type: "FeaturesSection",
      props: {
        id: "features-1",
        badge: "Powerful Features",
        title: "Everything You Need",
        titleHighlight: "To Succeed",
        subtitle: "Our hosting comes packed with features to help you build amazing websites.",
        columns: 3,
        features: [
          { icon: "HardDrive", title: "5GB SSD Storage", description: "Fast SSD storage for your website files and databases." },
          { icon: "Wifi", title: "Unlimited Bandwidth", description: "No limits on your website traffic - grow without restrictions." },
          { icon: "Lock", title: "Free SSL Certificate", description: "Secure your website with HTTPS encryption at no cost." },
          { icon: "Cpu", title: "cPanel Control Panel", description: "Industry-standard control panel for easy management." },
          { icon: "Database", title: "MySQL Databases", description: "Powerful database support for dynamic websites." },
          { icon: "Zap", title: "99.9% Uptime", description: "Reliable hosting infrastructure you can count on." },
        ],
      },
    },
    {
      type: "PricingSection",
      props: {
        id: "pricing-1",
        badge: "Simple Pricing",
        title: "Choose Your",
        titleHighlight: "Plan",
        subtitle: "Start free and upgrade when you need more resources.",
        plans: [
          {
            name: "Free",
            price: "$0",
            period: "/month",
            description: "Perfect for personal projects and small websites.",
            features: ["5GB SSD Storage", "Unlimited Bandwidth", "Free SSL Certificate", "cPanel Access", "1 MySQL Database", "1 Email Account"],
            ctaText: "Get Started Free",
            ctaLink: "/register",
            highlighted: true,
            badge: "Most Popular",
          },
          {
            name: "Premium",
            price: "$4.99",
            period: "/month",
            description: "For growing websites that need more power.",
            features: ["Unlimited Storage", "Unlimited Bandwidth", "Wildcard SSL", "Priority Support", "Unlimited Databases", "Unlimited Email", "Daily Backups"],
            ctaText: "Upgrade Now",
            ctaLink: "/register?plan=premium",
            highlighted: false,
            badge: "",
          },
        ],
      },
    },
    {
      type: "FAQSection",
      props: {
        id: "faq-1",
        badge: "FAQ",
        title: "Frequently Asked",
        titleHighlight: "Questions",
        subtitle: "Find answers to common questions about our hosting service.",
        faqs: [
          { question: "Is the hosting really free?", answer: "Yes! Our basic hosting plan is completely free with no hidden costs. You get 5GB storage, unlimited bandwidth, and free SSL." },
          { question: "How long can I use the free hosting?", answer: "There's no time limit. You can use our free hosting for as long as you want, as long as your account remains active." },
          { question: "Can I upgrade later?", answer: "Absolutely! You can upgrade to our Premium plan anytime to get more storage, priority support, and additional features." },
          { question: "What's included in free SSL?", answer: "Every hosting account gets a free Let's Encrypt SSL certificate that auto-renews. Your site will be secure with HTTPS." },
        ],
      },
    },
    {
      type: "CTASection",
      props: {
        id: "cta-1",
        title: "Ready to Get Started?",
        subtitle: "Join thousands of users who trust us with their websites. Create your free account today.",
        ctaText: "Create Free Account",
        ctaLink: "/register",
        secondaryCtaText: "Contact Sales",
        secondaryCtaLink: "/contact",
        backgroundStyle: "gradient",
      },
    },
    {
      type: "FooterSection",
      props: {
        id: "footer-1",
        logoText: "SUSPENDED",
        logoHighlight: ".HOST",
        description: "Free web hosting with unlimited bandwidth, SSL certificates, and professional cPanel management. Build your website today!",
        copyrightText: "© 2024 SUSPENDED.HOST. All rights reserved.",
        showSocials: true,
        socials: [
          { platform: "github", url: "https://github.com" },
          { platform: "twitter", url: "https://twitter.com" },
          { platform: "discord", url: "https://discord.gg" },
        ],
        columns: [
          {
            title: "Quick Links",
            links: [
              { label: "Home", href: "/" },
              { label: "Features", href: "#features" },
              { label: "Pricing", href: "#pricing" },
              { label: "FAQ", href: "#faq" },
            ],
          },
          {
            title: "Resources",
            links: [
              { label: "Documentation", href: "/docs" },
              { label: "Support", href: "/support" },
              { label: "Status", href: "/status" },
              { label: "Blog", href: "/blog" },
            ],
          },
          {
            title: "Legal",
            links: [
              { label: "Terms of Service", href: "/terms" },
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Cookie Policy", href: "/cookies" },
            ],
          },
        ],
      },
    },
  ],
  root: { props: {} },
});

// ============ MAIN COMPONENT ============
const AdminLandingPageEditor = () => {
  const { t, language, availableLanguages } = useLanguage();
  const { toast } = useToast();
  const [selectedLocale, setSelectedLocale] = useState<string>(language);
  const [data, setData] = useState<Data>(getDefaultData());
  const [isActive, setIsActive] = useState(false);
  const [landingEnabled, setLandingEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  const adminT = t.admin?.landingPage || {
    title: "Landing Page Editor",
    subtitle: "Visual editor for landing page",
    save: "Save",
    saving: "Saving...",
    preview: "Preview",
    useCustomPage: "Use Custom Page",
    savedSuccess: "Landing page saved successfully",
    saveFailed: "Failed to save landing page",
    toggleSuccess: "Landing page status updated",
    loadFailed: "Failed to load landing page",
    enableLanding: "Enable Landing Page",
    landingDisabledWarning: "Landing page is disabled. Visitors will be redirected to login.",
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const pageRes = await fetch(`/api/landing-page/${selectedLocale}`, { credentials: "include" });
        if (pageRes.ok) {
          const pageData = await pageRes.json();
          if (pageData.projectData && Object.keys(pageData.projectData).length > 0) {
            setData(pageData.projectData as Data);
          } else {
            setData(getDefaultData());
          }
          setIsActive(pageData.isActive || false);
        }
        const settingsRes = await fetch("/api/settings/LANDING_PAGE_ENABLED", { credentials: "include" });
        if (settingsRes.ok) {
          const setting = await settingsRes.json();
          setLandingEnabled(setting.value !== "false");
        }
      } catch (error) {
        console.error("Load error:", error);
        toast({ variant: "destructive", title: t.common?.error || "Error", description: adminT.loadFailed });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [selectedLocale]);

  const handleSave = useCallback(async (puckData: Data) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/landing-page/${selectedLocale}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ projectData: puckData, isActive }),
      });
      if (response.ok) {
        setData(puckData);
        toast({ title: t.common?.success || "Success", description: adminT.savedSuccess });
      } else {
        throw new Error("Save failed");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast({ variant: "destructive", title: t.common?.error || "Error", description: adminT.saveFailed });
    } finally {
      setIsSaving(false);
    }
  }, [selectedLocale, isActive, toast, t, adminT]);

  const handleToggleActive = async () => {
    try {
      const response = await fetch(`/api/landing-page/${selectedLocale}/toggle`, {
        method: "PATCH",
        credentials: "include",
      });
      if (response.ok) {
        const result = await response.json();
        setIsActive(result.isActive);
        toast({ title: t.common?.success || "Success", description: adminT.toggleSuccess });
      }
    } catch (error) {
      console.error("Toggle error:", error);
      toast({ variant: "destructive", title: t.common?.error || "Error", description: adminT.saveFailed });
    }
  };

  const handleToggleLanding = async () => {
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ settings: { LANDING_PAGE_ENABLED: (!landingEnabled).toString() } }),
      });
      if (response.ok) {
        setLandingEnabled(!landingEnabled);
        toast({ title: t.common?.success || "Success", description: adminT.toggleSuccess });
      }
    } catch (error) {
      console.error("Toggle landing error:", error);
      toast({ variant: "destructive", title: t.common?.error || "Error", description: adminT.saveFailed });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout defaultCollapsed>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout defaultCollapsed>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border-b bg-background">
          <div>
            <h1 className="text-2xl font-bold">{adminT.title}</h1>
            <p className="text-sm text-muted-foreground">{adminT.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Language Selector */}
            <Select value={selectedLocale} onValueChange={setSelectedLocale}>
              <SelectTrigger className="w-[180px]">
                <Globe className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {availableLanguages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.flag} {lang.nativeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Enable Landing Toggle */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
              <Switch id="landing-toggle" checked={landingEnabled} onCheckedChange={handleToggleLanding} />
              <Label htmlFor="landing-toggle" className="text-sm cursor-pointer">{adminT.enableLanding}</Label>
            </div>

            {/* Use Custom Page Toggle */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
              <Switch id="active-toggle" checked={isActive} onCheckedChange={handleToggleActive} disabled={!landingEnabled} />
              <Label htmlFor="active-toggle" className="text-sm cursor-pointer">{adminT.useCustomPage}</Label>
            </div>

            {/* Preview Button */}
            <Button variant="outline" onClick={() => setShowPreview(true)}>
              <Eye className="w-4 h-4 mr-2" />
              {adminT.preview}
            </Button>
          </div>
        </div>

        {/* Warning when landing disabled */}
        {!landingEnabled && (
          <Alert className="mx-4 mt-4 border-amber-500/50 bg-amber-500/10">
            <AlertDescription className="text-amber-600 dark:text-amber-400">
              ⚠️ {adminT.landingDisabledWarning}
            </AlertDescription>
          </Alert>
        )}

        {/* Puck Editor - force entire editor to light mode */}
        <div className="flex-1 overflow-hidden puck-force-light">
          <Puck
            config={puckConfig}
            data={data}
            onPublish={handleSave}
            height="100%"
            iframe={{
              enabled: true,
              waitForStyles: true,
            }}
            overrides={{
              headerActions: ({ children }) => (
                <>
                  {children}
                  <Button onClick={() => handleSave(data)} disabled={isSaving} className="ml-2">
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {adminT.saving}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {adminT.save}
                      </>
                    )}
                  </Button>
                </>
              ),
            }}
            onChange={setData}
          />
        </div>

        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-6xl h-[90vh] overflow-auto p-0">
            <DialogHeader className="p-4 border-b sticky top-0 bg-background z-10">
              <DialogTitle>
                {adminT.preview} - {availableLanguages.find(l => l.code === selectedLocale)?.flag} {availableLanguages.find(l => l.code === selectedLocale)?.nativeName || selectedLocale}
              </DialogTitle>
            </DialogHeader>
            <div className="min-h-screen bg-white dark:bg-landing-surface">
              <Render config={puckConfig} data={data} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminLandingPageEditor;
