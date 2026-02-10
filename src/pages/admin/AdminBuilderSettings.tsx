import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  Palette,
  Save,
  RefreshCw,
  ExternalLink,
  Info,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface BuilderSettings {
  enabled: boolean;
}

const AdminBuilderSettings = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  usePageTitle((t.admin as any)?.websiteBuilder || 'Website Builder');

  const builderT = (t.admin as any)?.builder || {};

  const getToken = () => localStorage.getItem("accessToken");

  const [settings, setSettings] = useState<BuilderSettings>({
    enabled: false,
  });
  const [saving, setSaving] = useState(false);

  // Fetch settings
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-builder-settings'],
    queryFn: async () => {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/builder/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    },
  });

  useEffect(() => {
    if (data) {
      setSettings({ enabled: data.enabled || false });
    }
  }, [data]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (newSettings: BuilderSettings) => {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/builder/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newSettings),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save settings');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t.common?.success || 'Success',
        description: builderT.settingsSaved || 'Website builder settings saved successfully',
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: t.common?.error || 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveMutation.mutateAsync(settings);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Palette className="w-6 h-6" />
              {builderT.title || 'Website Builder Settings'}
            </h1>
            <p className="text-muted-foreground">
              {builderT.subtitle || 'Configure the drag-and-drop website builder for hosting accounts'}
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {t.common?.save || 'Save Changes'}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Enable/Disable */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                {builderT.builderStatus || 'Builder Status'}
              </CardTitle>
              <CardDescription>
                {builderT.builderStatusDesc || 'Enable or disable the website builder for users'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">{builderT.enableBuilder || 'Enable Website Builder'}</Label>
                  <p className="text-sm text-muted-foreground">
                    {builderT.enableBuilderDesc || 'When enabled, users can build websites using the drag-and-drop builder'}
                  </p>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
                />
              </div>

              <Alert>
                <ExternalLink className="w-4 h-4" />
                <AlertDescription>
                  <strong>{builderT.howItWorks || 'How it works'}:</strong>{' '}
                  {builderT.howItWorksDesc || 'Users click "Website Builder" on their hosting dashboard to open the visual editor. Changes are saved directly to their hosting account via FTP.'}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                {builderT.features || 'Features'}
              </CardTitle>
              <CardDescription>
                {builderT.featuresDesc || 'Built-in website builder capabilities'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <ul className="text-sm text-muted-foreground space-y-2">
                  {builderT.featuresList ? (
                    builderT.featuresList.map((item: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">✓</span>
                        <span>{item}</span>
                      </li>
                    ))
                  ) : (
                    <>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">✓</span>
                        <span>Drag-and-drop visual page editor</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">✓</span>
                        <span>Bootstrap 5 components and blocks</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">✓</span>
                        <span>Direct FTP file management</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">✓</span>
                        <span>Multi-page website support</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">✓</span>
                        <span>No external API required</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminBuilderSettings;
