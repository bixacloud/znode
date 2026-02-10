import { Routes, Route, Navigate } from "react-router-dom";
import { Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AdminLayout from "@/components/admin/AdminLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";

// Import sub-pages
import AdminAccountSettings from "./AdminAccountSettings";
import OAuthSettings from "./settings/OAuthSettings";
import MOFHSettings from "./settings/MOFHSettings";
import DomainsSettings from "./settings/DomainsSettings";

const AdminSettings = () => {
  const { t } = useLanguage();
  usePageTitle(t.admin?.settings || 'Settings');
  
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/settings/account" replace />} />
      <Route path="/account" element={<AdminAccountSettings />} />
      <Route path="/oauth" element={<OAuthSettings />} />
      <Route path="/mofh" element={<MOFHSettings />} />
      <Route path="/domains" element={<DomainsSettings />} />
      <Route path="/general" element={<ComingSoon title={t.admin.generalSettings} />} />
      <Route path="/email" element={<Navigate to="/admin/email" replace />} />
      <Route path="/notifications" element={<ComingSoon title={t.admin.notifications} />} />
      <Route path="/database" element={<ComingSoon title={t.admin.database} />} />
      <Route path="/appearance" element={<ComingSoon title={t.admin.appearance} />} />
    </Routes>
  );
};

// Coming Soon Component
const ComingSoon = ({ title }: { title: string }) => {
  const { t } = useLanguage();
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-muted-foreground mt-1">{t.admin.manageConfig} {title.toLowerCase()}</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{t.admin.featureInDevelopment}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Settings className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">{t.admin.comingSoon}</h3>
              <p className="text-muted-foreground max-w-sm">
                {t.admin.comingSoonDesc}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
