import { AlertTriangle, RefreshCw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSite } from "@/contexts/SiteContext";
import { useLanguage } from "@/contexts/LanguageContext";

const Maintenance = () => {
  const { settings } = useSite();
  const { t } = useLanguage();

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="p-4 bg-yellow-500/10 rounded-full">
            <Settings className="w-16 h-16 text-yellow-500 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            {t.maintenance?.title || 'Under Maintenance'}
          </h1>
          <p className="text-muted-foreground">
            {settings.maintenanceMessage || t.maintenance?.defaultMessage || 'We are currently performing scheduled maintenance. Please check back soon.'}
          </p>
        </div>

        {/* Logo */}
        {settings.siteLogo && (
          <div className="flex justify-center py-4">
            <img 
              src={settings.siteLogo} 
              alt={settings.siteName} 
              className="h-12 w-auto opacity-50"
            />
          </div>
        )}

        {/* Refresh button */}
        <Button onClick={handleRefresh} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          {t.maintenance?.refresh || 'Refresh Page'}
        </Button>

        {/* Alert */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="w-4 h-4" />
          <span>{t.maintenance?.estimatedTime || 'We\'ll be back shortly'}</span>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
