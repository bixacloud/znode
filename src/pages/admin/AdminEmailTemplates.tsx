import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import authService from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import TipTapEditor from "@/components/TipTapEditor";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";
import AdminLayout from "@/components/admin/AdminLayout";
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  RefreshCw
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface EmailTemplate {
  id: string;
  code: string;
  name: string;
  subject: string;
  body: string;
  type: 'SYSTEM' | 'CUSTOM';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminEmailTemplates() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  usePageTitle(t.admin?.emailTemplates || 'Email Templates');
  const token = authService.getAccessToken();

  // Templates State
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState({ subject: '', body: '' });

  // Check admin access
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Load templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/email/templates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Fetch templates error:', error);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;

    try {
      const method = editingTemplate.id ? 'PUT' : 'POST';
      const url = editingTemplate.id 
        ? `${API_URL}/api/email/templates/${editingTemplate.id}`
        : `${API_URL}/api/email/templates`;

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingTemplate)
      });

      if (res.ok) {
        toast({ 
          title: t.common?.success || "Success", 
          description: t.admin?.templateSaved || "Template saved" 
        });
        setTemplateDialogOpen(false);
        setEditingTemplate(null);
        fetchTemplates();
      } else {
        const data = await res.json();
        toast({ 
          title: t.common?.error || "Error", 
          description: data.error, 
          variant: "destructive" 
        });
      }
    } catch (error) {
      toast({ 
        title: t.common?.error || "Error", 
        description: t.admin?.templateSaveError || "Failed to save template", 
        variant: "destructive" 
      });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm(t.admin?.confirmDeleteTemplate || 'Are you sure you want to delete this template?')) return;

    try {
      const res = await fetch(`${API_URL}/api/email/templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast({ 
          title: t.common?.success || "Success", 
          description: t.admin?.templateDeleted || "Template deleted" 
        });
        fetchTemplates();
      } else {
        const data = await res.json();
        toast({ 
          title: t.common?.error || "Error", 
          description: data.error, 
          variant: "destructive" 
        });
      }
    } catch (error) {
      toast({ 
        title: t.common?.error || "Error", 
        description: t.admin?.templateDeleteError || "Failed to delete template", 
        variant: "destructive" 
      });
    }
  };

  const handlePreviewTemplate = async (template: EmailTemplate) => {
    setPreviewContent({ subject: template.subject, body: template.body });
    setPreviewDialogOpen(true);
  };

  const openNewTemplateDialog = () => {
    setEditingTemplate({
      id: '',
      code: '',
      name: '',
      subject: '',
      body: '',
      type: 'CUSTOM',
      isActive: true,
      createdAt: '',
      updatedAt: ''
    });
    setTemplateDialogOpen(true);
  };

  const openEditTemplateDialog = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setTemplateDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">{t.admin?.emailTemplates || 'Email Templates'}</h1>
          <p className="text-muted-foreground">{t.admin?.emailTemplatesDescription || 'Manage email templates for notifications'}</p>
        </div>

        {/* Templates Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t.admin?.emailTemplates || 'Email Templates'}
              </CardTitle>
              <CardDescription>{t.admin?.emailTemplatesDescription || 'Manage email templates for notifications'}</CardDescription>
            </div>
            <Button onClick={openNewTemplateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              {t.admin?.addTemplate || 'Add Template'}
            </Button>
          </CardHeader>
          <CardContent>
            {templatesLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* System Templates */}
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Badge variant="secondary">{t.admin?.system || 'System'}</Badge>
                    {t.admin?.systemTemplatesInfo || 'System Templates (cannot be deleted)'}
                  </h3>
                  <div className="space-y-2">
                    {templates.filter(t => t.type === 'SYSTEM').map(template => (
                      <div key={template.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{template.name}</span>
                            <Badge variant="outline" className="text-xs">{template.code}</Badge>
                            {!template.isActive && <Badge variant="destructive" className="text-xs">{t.admin?.disabled || 'Disabled'}</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{template.subject}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="ghost" onClick={() => handlePreviewTemplate(template)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEditTemplateDialog(template)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custom Templates */}
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Badge>{t.admin?.custom || 'Custom'}</Badge>
                    {t.admin?.customTemplates || 'Custom Templates'}
                  </h3>
                  <div className="space-y-2">
                    {templates.filter(t => t.type === 'CUSTOM').length === 0 ? (
                      <p className="text-muted-foreground text-sm py-4 text-center">{t.admin?.noCustomTemplates || 'No custom templates yet'}</p>
                    ) : (
                      templates.filter(t => t.type === 'CUSTOM').map(template => (
                        <div key={template.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{template.name}</span>
                              <Badge variant="outline" className="text-xs">{template.code}</Badge>
                              {!template.isActive && <Badge variant="destructive" className="text-xs">{t.admin?.disabled || 'Disabled'}</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{template.subject}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="icon" variant="ghost" onClick={() => handlePreviewTemplate(template)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => openEditTemplateDialog(template)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDeleteTemplate(template.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Template Edit Dialog */}
        <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate?.id ? (t.admin?.editTemplate || 'Edit Template') : (t.admin?.createTemplate || 'Create Template')}
              </DialogTitle>
              <DialogDescription>
                {editingTemplate?.type === 'SYSTEM' 
                  ? (t.admin?.editSystemTemplateDesc || 'Edit the system email template')
                  : (t.admin?.editCustomTemplateDesc || 'Create or edit a custom email template')
                }
              </DialogDescription>
            </DialogHeader>

            {editingTemplate && (
              <div className="space-y-4">
                {editingTemplate.type !== 'SYSTEM' && (
                  <div className="space-y-2">
                    <Label>{t.admin?.templateCode || 'Template Code'}</Label>
                    <Input 
                      value={editingTemplate.code}
                      onChange={e => setEditingTemplate({ ...editingTemplate, code: e.target.value })}
                      placeholder="TEMPLATE_CODE"
                      disabled={!!editingTemplate.id}
                    />
                    <p className="text-xs text-muted-foreground">{t.admin?.templateCodeHint || 'Unique identifier for this template'}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{t.admin?.templateName || 'Name'}</Label>
                  <Input 
                    value={editingTemplate.name}
                    onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    placeholder={t.admin?.templateNamePlaceholder || 'Template Name'}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t.admin?.templateSubject || 'Subject'}</Label>
                  <Input 
                    value={editingTemplate.subject}
                    onChange={e => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                    placeholder={t.admin?.templateSubjectPlaceholder || 'Email subject (supports {{variables}})'}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t.admin?.templateBody || 'Body (HTML)'}</Label>
                  <TipTapEditor
                    value={editingTemplate.body}
                    onChange={(body) => setEditingTemplate({ ...editingTemplate, body })}
                    placeholder={t.admin?.templateBodyPlaceholder || 'Email body HTML...'}
                    minHeight={200}
                    showHtmlToggle
                  />
                  <p className="text-xs text-muted-foreground">
                    {t.admin?.availableVariables || 'Available variables'}: {'{{name}}'}, {'{{email}}'}, {'{{domain}}'}, {'{{username}}'}, {'{{password}}'}, {'{{reason}}'}, {'{{siteName}}'}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch 
                    id="isActive"
                    checked={editingTemplate.isActive}
                    onCheckedChange={checked => setEditingTemplate({ ...editingTemplate, isActive: checked })}
                  />
                  <Label htmlFor="isActive">{t.admin?.active || 'Active'}</Label>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>{t.common?.cancel || 'Cancel'}</Button>
              <Button onClick={handleSaveTemplate}>{t.admin?.saveTemplate || 'Save Template'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{t.admin?.templatePreview || 'Template Preview'}</DialogTitle>
              <DialogDescription>
                <strong>{t.admin?.subject || 'Subject'}:</strong> {previewContent.subject}
              </DialogDescription>
            </DialogHeader>
            <div 
              className="border rounded-lg p-4 bg-card max-h-[60vh] overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: previewContent.body }}
            />
            <DialogFooter>
              <Button onClick={() => setPreviewDialogOpen(false)}>{t.common?.close || 'Close'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
