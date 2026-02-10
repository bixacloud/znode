import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Shield,
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronDown,
  Menu,
  HardDrive,
  Globe,
  Mail,
  Bell,
  Database,
  Palette,
  Server,
  Ticket,
  Sun,
  Moon,
  Languages,
  UserCog,
  Star,
  FolderArchive,
  LayoutTemplate,
  BookOpen,
  Crown,
  Package,
  Import,
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
import { useToast } from "@/hooks/use-toast";
import { DashboardFooter } from "@/components/DashboardFooter";
import { useTheme } from "@/components/ThemeProvider";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSite } from "@/contexts/SiteContext";
import { NotificationBell } from "@/components/NotificationBell";

interface AdminLayoutProps {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}

interface MenuItem {
  title: string;
  icon: React.ElementType;
  href?: string;
  children?: { title: string; href: string; icon: React.ElementType }[];
}

const AdminLayout = ({ children, defaultCollapsed = false }: AdminLayoutProps) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { t, language, setLanguage, availableLanguages } = useLanguage();
  const { settings } = useSite();

  // Admin translations (English for now)
  const adminT = {
    dashboard: t.admin?.dashboard || "Dashboard",
    userManagement: t.admin?.userManagement || "User Management",
    hostingManagement: t.admin?.hostingManagement || "Hosting Management",
    supportTickets: t.admin?.supportTickets || "Support Tickets",
    settings: t.admin?.settings || "Settings",
    accountSettings: t.admin?.accountSettings || "Account Settings",
    oauthProviders: t.admin?.oauthProviders || "OAuth Providers",
    hostingApi: t.admin?.hostingApi || "Hosting API (MOFH)",
    allowedDomains: t.admin?.allowedDomains || "Allowed Domains",
    generalSettings: t.admin?.generalSettings || "General Settings",
    emailSmtp: t.admin?.emailSmtp || "Email & SMTP",
    notifications: t.admin?.notifications || "Notifications",
    database: t.admin?.database || "Database",
    appearance: t.admin?.appearance || "Appearance",
    logout: t.nav?.logout || "Logout",
    logoutSuccess: t.auth?.logoutSuccess || "Logged out successfully",
    seeYouSoon: t.auth?.seeYouSoon || "See you soon!",
    error: t.common?.error || "Error",
    logoutError: t.auth?.logoutError || "Could not logout",
    adminPanel: t.admin?.adminPanel || "Admin Panel",
    sslCertificates: t.ssl?.title || "SSL Certificates",
    emailTemplates: t.admin?.emailTemplates || "Email Templates",
    sendEmail: t.admin?.sendEmail || "Send Email",
    emailLogs: t.admin?.emailLogs || "Email Logs",
    smtp: t.admin?.smtp || "SMTP",
    sslSettings: t.admin?.sslSettings || "SSL Settings",
    websiteBuilder: t.admin?.websiteBuilder || "Website Builder",
    landingPageEditor: t.admin?.landingPageEditor || "Landing Page Editor",
    knowledgeBase: t.admin?.knowledgeBase || "Knowledge Base",
    dataImport: t.admin?.dataImport?.title || "Data Import",
  };

  const menuItems: MenuItem[] = [
    {
      title: adminT.dashboard,
      icon: LayoutDashboard,
      href: "/admin/dashboard",
    },
    {
      title: adminT.userManagement,
      icon: Users,
      href: "/admin/users",
    },
    {
      title: t.admin?.hosting || "Hosting",
      icon: Package,
      children: [
        { title: t.admin?.hostingAccounts || "Hosting Accounts", href: "/admin/hostings", icon: HardDrive },
        { title: t.admin?.premiumPlans || "Premium Plans", href: "/admin/premium-plans", icon: Crown },
      ],
    },
    {
      title: adminT.supportTickets,
      icon: Ticket,
      href: "/admin/tickets",
    },
    {
      title: adminT.supportRatings || "Support Ratings",
      icon: Star,
      href: "/admin/support-ratings",
    },
    {
      title: adminT.sslCertificates,
      icon: Shield,
      href: "/admin/ssl-certificates",
    },
    {
      title: adminT.landingPageEditor,
      icon: LayoutTemplate,
      href: "/admin/landing-page",
    },
    {
      title: adminT.knowledgeBase,
      icon: BookOpen,
      href: "/admin/knowledge-base",
    },
    {
      title: "Email",
      icon: Mail,
      children: [
        { title: adminT.emailTemplates, href: "/admin/email/templates", icon: Mail },
        { title: adminT.sendEmail, href: "/admin/email/send", icon: Mail },
        { title: adminT.emailLogs, href: "/admin/email/logs", icon: Mail },
      ],
    },
    {
      title: adminT.settings,
      icon: Settings,
      children: [
        { title: adminT.generalSettings, href: "/admin/settings/general", icon: Globe },
        { title: adminT.oauthProviders, href: "/admin/settings/oauth", icon: Shield },
        { title: adminT.hostingApi, href: "/admin/settings/mofh", icon: Server },
        { title: adminT.allowedDomains, href: "/admin/settings/domains", icon: Globe },
        { title: adminT.websiteBuilder, href: "/admin/settings/builder", icon: Palette },
        { title: adminT.smtp, href: "/admin/settings/smtp", icon: Mail },
        { title: adminT.sslSettings, href: "/admin/settings/ssl", icon: Shield },
        { title: t.backup?.title || "Backup & Restore", href: "/admin/settings/backup", icon: FolderArchive },
        { title: adminT.dataImport, href: "/admin/data-import", icon: Import },
      ],
    },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: adminT.logoutSuccess,
        description: adminT.seeYouSoon,
      });
      navigate('/');
    } catch {
      toast({
        title: adminT.error,
        description: adminT.logoutError,
        variant: "destructive",
      });
    }
  };

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") {
      return location.pathname === "/admin/dashboard";
    }
    return location.pathname.startsWith(href);
  };

  const toggleMenu = (title: string) => {
    setExpandedMenus(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const isMenuExpanded = (title: string) => expandedMenus.includes(title);

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
          <Link to="/admin/dashboard" className="flex items-center gap-2">
            {settings.siteLogo ? (
              <img 
                src={settings.siteLogo} 
                alt={settings.siteName} 
                className="w-9 h-9 rounded-lg object-contain flex-shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
            {!collapsed && (
              <span className="text-lg font-bold text-sidebar-foreground">{settings.siteName || 'Admin'}</span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "hidden md:flex w-7 h-7 rounded-md items-center justify-center text-sidebar-foreground/60 hover:bg-sidebar-accent transition-colors",
              collapsed && "absolute -right-3 top-5 bg-sidebar border border-sidebar-border"
            )}
          >
            <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <div key={item.title}>
              {item.href ? (
                // Regular menu item
                <Link
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive(item.href)
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </Link>
              ) : (
                // Menu with children (expandable)
                <>
                  {collapsed ? (
                    // Collapsed mode: use dropdown
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                            item.children?.some(child => isActive(child.href))
                              ? "bg-primary/10 text-primary"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            "justify-center px-2"
                          )}
                        >
                          <item.icon className="w-5 h-5 flex-shrink-0" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="right" align="start" className="w-48">
                        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                          {item.title}
                        </div>
                        <DropdownMenuSeparator />
                        {item.children?.map((child) => (
                          <DropdownMenuItem key={child.href} asChild>
                            <Link
                              to={child.href}
                              className={cn(
                                "flex items-center gap-2 cursor-pointer",
                                isActive(child.href) && "bg-accent"
                              )}
                            >
                              <child.icon className="w-4 h-4" />
                              {child.title}
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    // Expanded mode: use accordion
                    <>
                      <button
                        onClick={() => toggleMenu(item.title)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                          item.children?.some(child => isActive(child.href))
                            ? "bg-primary/10 text-primary"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span className="flex-1 text-left">{item.title}</span>
                        <ChevronDown className={cn(
                          "w-4 h-4 transition-transform duration-200",
                          isMenuExpanded(item.title) && "rotate-180"
                        )} />
                      </button>
                      {/* Submenu */}
                      {isMenuExpanded(item.title) && item.children && (
                        <div className="mt-1 ml-4 pl-4 border-l-2 border-sidebar-border space-y-1">
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              to={child.href}
                              onClick={() => setMobileOpen(false)}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                                isActive(child.href)
                                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
                </>
              )}
            </div>
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
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name || 'Avatar'} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-medium text-primary-foreground">
                      {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name || 'Admin'}</p>
                      <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-sidebar-foreground/60" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={collapsed ? "center" : "end"} side="top" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.name || 'Admin'}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/admin/settings/account" className="cursor-pointer">
                  <UserCog className="w-4 h-4 mr-2" />
                  {adminT.accountSettings}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/admin/notifications" className="cursor-pointer">
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
                {adminT.logout}
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
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">{adminT.adminPanel}</span>
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

export default AdminLayout;
