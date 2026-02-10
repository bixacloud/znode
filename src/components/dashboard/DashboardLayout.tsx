import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Server,
  LayoutDashboard,
  HardDrive,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Menu,
  Ticket,
  Sun,
  Moon,
  Languages,
  Bell,
  Shield,
  Wrench,
  FileCode2,
  Type,
  Code2,
  Palette,
  LayoutGrid,
  BookOpen,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSite } from "@/contexts/SiteContext";
import { DashboardFooter } from "@/components/DashboardFooter";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import { NotificationBell } from "@/components/NotificationBell";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { t, language, setLanguage, availableLanguages } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { settings } = useSite();

  const menuItems = [
    {
      title: t.nav.dashboard,
      icon: LayoutDashboard,
      href: "/user/dashboard",
    },
    {
      title: t.nav.hostingAccounts,
      icon: HardDrive,
      href: "/user/hosting",
    },
    {
      title: t.nav?.ssl || 'SSL Certificates',
      icon: Shield,
      href: "/user/ssl",
    },
    {
      title: t.nav.tickets,
      icon: Ticket,
      href: "/user/tickets",
    },
    {
      title: t.kb?.title || 'Knowledge Base',
      icon: BookOpen,
      href: "/user/knowledge-base",
    },
    {
      title: t.nav?.tools || 'Tools',
      icon: Wrench,
      children: [
        { title: t.tools?.base64?.title || 'Base64', icon: FileCode2, href: '/user/tools/base64' },
        { title: t.tools?.caseConverter?.title || 'Case Converter', icon: Type, href: '/user/tools/case-converter' },
        { title: t.tools?.codeBeautifier?.title || 'Code Beautifier', icon: Code2, href: '/user/tools/code-beautifier' },
        { title: t.tools?.colorTools?.title || 'Color Tools', icon: Palette, href: '/user/tools/color-tools' },
        { title: t.tools?.cssGrid?.title || 'CSS Grid', icon: LayoutGrid, href: '/user/tools/css-grid' },
        { title: t.cdnSearch?.title || 'CDN Search', icon: Globe, href: '/user/tools/cdn-search' },
      ],
    },
  ];

  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: t.auth.logoutSuccess,
        description: t.auth.seeYouSoon,
      });
      navigate('/');
    } catch (error) {
      toast({
        title: t.common.error,
        description: t.auth.logoutError,
        variant: "destructive",
      });
    }
  };

  const isActive = (href: string) => {
    if (href === "/user/dashboard") {
      return location.pathname === "/user/dashboard";
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center h-16 px-4 border-b border-sidebar-border",
          collapsed ? "justify-center" : "justify-between"
        )}>
          <Link to="/user/dashboard" className="flex items-center gap-2">
            {settings.siteLogo ? (
              <img 
                src={settings.siteLogo} 
                alt={settings.siteName} 
                className="w-9 h-9 rounded-lg object-contain flex-shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0">
                <Server className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
            {!collapsed && (
              <span className="text-lg font-bold text-sidebar-foreground">{settings.siteName || 'FreeHost'}</span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "hidden md:flex w-7 h-7 rounded-md items-center justify-center text-sidebar-foreground hover:bg-sidebar-accent transition-colors",
              collapsed && "absolute -right-3 top-5 bg-sidebar border border-sidebar-border"
            )}
          >
            <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            item.children ? (
              // Menu with submenu
              <div key={item.title}>
                {collapsed ? (
                  // Collapsed mode - use dropdown
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={cn(
                          "w-full flex items-center justify-center px-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                          "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" className="w-48">
                      {item.children.map((child) => (
                        <DropdownMenuItem key={child.href} asChild>
                          <Link
                            to={child.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              "flex items-center gap-2 cursor-pointer",
                              isActive(child.href) && "bg-accent"
                            )}
                          >
                            <child.icon className="w-4 h-4" />
                            <span>{child.title}</span>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  // Expanded mode - use accordion
                  <>
                    <button
                      onClick={() => {
                        setExpandedMenus(prev => 
                          prev.includes(item.title) 
                            ? prev.filter(m => m !== item.title) 
                            : [...prev, item.title]
                        );
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span className="flex-1 text-left">{item.title}</span>
                      <ChevronRight className={cn(
                        "w-4 h-4 transition-transform",
                        expandedMenus.includes(item.title) && "rotate-90"
                      )} />
                    </button>
                    {expandedMenus.includes(item.title) && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            to={child.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                              isActive(child.href)
                                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}
                          >
                            <child.icon className="w-4 h-4 flex-shrink-0" />
                            <span>{child.title}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              // Regular menu item
              <Link
                key={item.href}
                to={item.href!}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive(item.href!)
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            )
          ))}
        </nav>

        {/* User section */}
        <div className={cn(
          "p-4 border-t border-sidebar-border space-y-3",
          collapsed && "px-2"
        )}>
          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors",
                  collapsed && "justify-center"
                )}
              >
                <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name || 'Avatar'} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-medium text-sidebar-foreground">
                      {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name || 'User'}</p>
                      <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-sidebar-foreground/60" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={collapsed ? "center" : "end"} side="top" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/user/settings" className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  {t.nav.settings}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/user/notifications" className="cursor-pointer">
                  <Bell className="w-4 h-4 mr-2" />
                  Notifications
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* Theme Toggle */}
              <DropdownMenuItem
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="cursor-pointer"
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4 mr-2" />
                ) : (
                  <Moon className="w-4 h-4 mr-2" />
                )}
                {theme === "dark" ? (t.common?.lightMode || "Light mode") : (t.common?.darkMode || "Dark mode")}
              </DropdownMenuItem>
              {/* Language Submenu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer">
                  <Languages className="w-4 h-4 mr-2" />
                  {t.common?.language || "Language"}
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    {availableLanguages.map((lang) => (
                      <DropdownMenuItem
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={language === lang.code ? "bg-accent" : ""}
                      >
                        {lang.flag} {lang.nativeName}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400 cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                {t.nav.logout}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300",
        collapsed ? "md:ml-16" : "md:ml-64"
      )}>
        {/* Mobile header - only shows on mobile */}
        <header className="sticky top-0 z-30 h-14 flex items-center gap-4 px-4 bg-background/80 backdrop-blur-lg border-b border-border md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-muted"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 flex items-center gap-2">
            {settings.siteLogo ? (
              <img src={settings.siteLogo} alt={settings.siteName} className="w-8 h-8 rounded-lg object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Server className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
            <span className="font-semibold">{settings.siteName || 'ZNode'}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
        
        {/* Footer */}
        <DashboardFooter />
        
        {/* Floating Notification Bell */}
        <NotificationBell />
      </div>
    </div>
  );
};

export default DashboardLayout;
