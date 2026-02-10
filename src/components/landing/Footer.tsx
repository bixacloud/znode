import { Server, Mail, Github, Twitter, MessageCircle, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSite } from "@/contexts/SiteContext";

const Footer = () => {
  const { t } = useLanguage();
  const { settings } = useSite();

  const quickLinks = [
    { label: t.landing.footer.links.home, href: "/" },
    { label: t.landing.footer.links.features, href: "#features" },
    { label: t.landing.footer.links.pricing, href: "#pricing" },
    { label: t.landing.footer.links.support, href: "/support" },
  ];

  const resourceLinks = [
    { label: t.landing.footer.resources.docs, href: "#" },
    { label: t.landing.footer.resources.api, href: "#" },
    { label: t.landing.footer.resources.status, href: "#" },
    { label: t.landing.footer.resources.blog, href: "#" },
  ];

  return (
    <footer className="bg-slate-50 dark:bg-landing-surface relative overflow-hidden">
      {/* Top border gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

      <div className="container px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-6 group">
              <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/40 transition-shadow">
                <Server className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                SUSPENDED<span className="text-violet-500 dark:text-violet-400">.HOST</span>
              </span>
            </Link>
            <p className="text-slate-500 dark:text-white/50 mb-8 leading-relaxed max-w-sm">
              {t.landing.footer.description}
            </p>
            <div className="flex gap-3">
              {[
                { icon: Github, href: "#", label: "GitHub" },
                { icon: Twitter, href: "#", label: "Twitter" },
                { icon: MessageCircle, href: "#", label: "Discord" },
              ].map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-6">{t.landing.footer.links.title}</h4>
            <ul className="space-y-4">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1 group"
                  >
                    {link.label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-6">{t.landing.footer.resources.title}</h4>
            <ul className="space-y-4">
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1 group"
                  >
                    {link.label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-6">{t.landing.footer.contact.title}</h4>
            <ul className="space-y-4">
              <li>
                <a 
                  href={`mailto:${settings.contactEmail || 'support@example.com'}`} 
                  className="flex items-center gap-3 text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center group-hover:bg-violet-100 dark:group-hover:bg-violet-600/20 group-hover:border-violet-200 dark:group-hover:border-violet-500/30 transition-all">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span>{t.landing.footer.contact.email}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-slate-200 dark:border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-400 dark:text-white/30 text-sm">
              © {new Date().getFullYear()} {settings.siteName}. {t.landing.footer.copyright}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
