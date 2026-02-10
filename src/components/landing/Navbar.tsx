import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Server, Menu, X, ChevronRight, Languages, Moon, Sun, LayoutDashboard, Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/contexts/AuthContext";
import { useSite } from "@/contexts/SiteContext";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";
  const { t, language, setLanguage, availableLanguages } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const { settings } = useSite();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { label: t.nav.features, href: "#features" },
    { label: t.nav.pricing, href: "#pricing" },
    { label: t.nav.support, href: "/support" },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled 
        ? "bg-white/80 dark:bg-landing-surface/80 backdrop-blur-2xl border-b border-slate-200 dark:border-white/5 py-3 shadow-sm dark:shadow-none" 
        : "bg-transparent py-5"
    }`}>
      <div className="container px-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            {settings.siteLogo ? (
              <img 
                src={settings.siteLogo} 
                alt={settings.siteName} 
                className="h-10 w-auto object-contain"
              />
            ) : (
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/40 transition-shadow">
                <Server className="w-5 h-5 text-white" />
                <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              {settings.siteName || 'SUSPENDED.HOST'}
            </span>
          </Link>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <a 
                key={item.label}
                href={item.href} 
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-300"
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl">
                  <Languages className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {availableLanguages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={language === lang.code ? "bg-accent" : ""}
                  >
                    {lang.flag} {lang.nativeName}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            
            {isAuthenticated ? (
              <>
                <Link to={user?.role === 'ADMIN' ? "/admin/dashboard" : "/dashboard"}>
                  <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 rounded-xl shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all">
                    {user?.role === 'ADMIN' ? (
                      <>
                        <Shield className="w-4 h-4 mr-2" />
                        Admin Panel
                      </>
                    ) : (
                      <>
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        {t.nav.dashboard || "Dashboard"}
                      </>
                    )}
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  onClick={handleLogout}
                  className="text-slate-600 dark:text-white/70 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t.nav.logout || "Đăng xuất"}
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl">
                    {t.nav.login}
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 rounded-xl shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all">
                    {t.nav.register}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden mt-4 p-4 rounded-2xl bg-white/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-lg dark:shadow-none">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <a 
                  key={item.label}
                  href={item.href} 
                  className="px-4 py-3 text-sm font-medium text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <div className="h-px bg-slate-200 dark:bg-white/10 my-2" />
              <div className="flex items-center gap-2 p-2">
                {/* Mobile Language Switcher */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl">
                      <Languages className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {availableLanguages.map((lang) => (
                      <DropdownMenuItem
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={language === lang.code ? "bg-accent" : ""}
                      >
                        {lang.flag} {lang.nativeName}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Mobile Theme Toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                  className="text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl"
                >
                  {theme === "dark" ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </Button>
              </div>
              {isAuthenticated ? (
                <>
                  <Link to={user?.role === 'ADMIN' ? "/admin/dashboard" : "/dashboard"} onClick={() => setIsOpen(false)}>
                    <Button className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 rounded-xl">
                      {user?.role === 'ADMIN' ? (
                        <>
                          <Shield className="w-4 h-4 mr-2" />
                          Admin Panel
                        </>
                      ) : (
                        <>
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          {t.nav.dashboard || "Dashboard"}
                        </>
                      )}
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    onClick={() => { handleLogout(); setIsOpen(false); }}
                    className="w-full justify-start text-slate-600 dark:text-white/70 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {t.nav.logout || "Đăng xuất"}
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl">
                      {t.nav.login}
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setIsOpen(false)}>
                    <Button className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 rounded-xl">
                      {t.nav.register}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
