import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import authService from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import TipTapEditor from "@/components/TipTapEditor";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";
import AdminLayout from "@/components/admin/AdminLayout";
import { 
  Mail, 
  Settings, 
  FileText, 
  Send, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Search,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Save,
  TestTube,
  History
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

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface EmailLog {
  id: string;
  templateId: string | null;
  toEmail: string;
  subject: string;
  status: string;
  error: string | null;
  sentAt: string | null;
  createdAt: string;
}

export default function AdminEmailSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  usePageTitle(t.admin?.emailSettings || 'Email Settings');
  const token = authService.getAccessToken();

  // SMTP State
  const [smtpConfig, setSmtpConfig] = useState({
    host: '',
    port: '587',
    secure: false,
    user: '',
    pass: '',
    from: '',
    fromName: ''
  });
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  // Templates State
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState({ subject: '', body: '' });

  // Send Email State
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [sendToAll, setSendToAll] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sending, setSending] = useState(false);

  // Logs State
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);

  // Check admin access
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Load data
  useEffect(() => {
    fetchSmtpConfig();
    fetchTemplates();
    fetchUsers();
    fetchLogs();
  }, []);

  const fetchSmtpConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/api/email/smtp`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSmtpConfig({
          host: data.smtp_host || '',
          port: data.smtp_port || '587',
          secure: data.smtp_secure === 'true',
          user: data.smtp_user || '',
          pass: data.smtp_pass || '',
          from: data.smtp_from || '',
          fromName: data.smtp_from_name || ''
        });
      }
    } catch (error) {
      console.error('Fetch SMTP error:', error);
    }
  };

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

  const fetchUsers = async (search?: string) => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`${API_URL}/api/email/users?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Fetch users error:', error);
    }
  };

  const fetchLogs = async (page = 1) => {
    setLogsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/email/logs?page=${page}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setLogsTotalPages(data.totalPages);
        setLogsPage(data.page);
      }
    } catch (error) {
      console.error('Fetch logs error:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  // SMTP Handlers
  const handleSaveSmtp = async () => {
    setSmtpLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/email/smtp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(smtpConfig)
      });

      if (res.ok) {
        toast({ title: "Success", description: "SMTP settings saved" });
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save SMTP settings", variant: "destructive" });
    } finally {
      setSmtpLoading(false);
    }
  };

  const handleTestSmtp = async () => {
    setSmtpTesting(true);
    try {
      const res = await fetch(`${API_URL}/api/email/smtp/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...smtpConfig, testEmail })
      });

      const data = await res.json();
      if (res.ok) {
        toast({ title: "Success", description: data.message || "SMTP test successful" });
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to test SMTP", variant: "destructive" });
    } finally {
      setSmtpTesting(false);
    }
  };

  // Template Handlers
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
        toast({ title: "Success", description: "Template saved" });
        setTemplateDialogOpen(false);
        setEditingTemplate(null);
        fetchTemplates();
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save template", variant: "destructive" });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const res = await fetch(`${API_URL}/api/email/templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast({ title: "Success", description: "Template deleted" });
        fetchTemplates();
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete template", variant: "destructive" });
    }
  };

  const handlePreviewTemplate = async (template: EmailTemplate) => {
    setPreviewContent({ subject: template.subject, body: template.body });
    setPreviewDialogOpen(true);
  };

  // Send Email Handlers
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId === 'custom') {
      // Clear fields for custom email
      setEmailSubject('');
      setEmailBody('');
      return;
    }
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setEmailSubject(template.subject);
      setEmailBody(template.body);
    }
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAllUsers = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
    }
  };

  const handleSendEmail = async () => {
    if (!sendToAll && selectedUsers.length === 0) {
      toast({ title: "Error", description: "Please select recipients", variant: "destructive" });
      return;
    }

    if (!emailSubject || !emailBody) {
      toast({ title: "Error", description: "Subject and body are required", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/email/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateId: selectedTemplate && selectedTemplate !== 'custom' ? selectedTemplate : undefined,
          userIds: sendToAll ? undefined : selectedUsers,
          sendToAll,
          subject: emailSubject,
          body: emailBody
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast({ title: "Success", description: `Email sent to ${data.sent} recipients` });
        // Reset form
        setSelectedUsers([]);
        setSendToAll(false);
        setSelectedTemplate('');
        setEmailSubject('');
        setEmailBody('');
        // Refresh logs
        fetchLogs();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to send email", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Email Settings</h1>
          <p className="text-muted-foreground">Configure SMTP, manage templates, and send emails</p>
        </div>

        <Tabs defaultValue="smtp" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="smtp" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">SMTP</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Templates</span>
            </TabsTrigger>
            <TabsTrigger value="send" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Send Email</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Logs</span>
            </TabsTrigger>
          </TabsList>

          {/* SMTP Settings Tab */}
          <TabsContent value="smtp">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  SMTP Configuration
                </CardTitle>
                <CardDescription>Configure your SMTP server for sending emails</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SMTP Host</Label>
                    <Input 
                      value={smtpConfig.host}
                      onChange={e => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                      placeholder="smtp.example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Port</Label>
                    <Input 
                      value={smtpConfig.port}
                      onChange={e => setSmtpConfig({ ...smtpConfig, port: e.target.value })}
                      placeholder="587"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input 
                      value={smtpConfig.user}
                      onChange={e => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input 
                      type="password"
                      value={smtpConfig.pass}
                      onChange={e => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>From Email</Label>
                    <Input 
                      value={smtpConfig.from}
                      onChange={e => setSmtpConfig({ ...smtpConfig, from: e.target.value })}
                      placeholder="noreply@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>From Name</Label>
                    <Input 
                      value={smtpConfig.fromName}
                      onChange={e => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                      placeholder="My Company"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch 
                    id="secure"
                    checked={smtpConfig.secure}
                    onCheckedChange={checked => setSmtpConfig({ ...smtpConfig, secure: checked })}
                  />
                  <Label htmlFor="secure">Use SSL/TLS (port 465)</Label>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t">
                  <Button onClick={handleSaveSmtp} disabled={smtpLoading}>
                    {smtpLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Settings
                  </Button>
                  <div className="flex items-center gap-2">
                    <Input 
                      placeholder="test@example.com"
                      value={testEmail}
                      onChange={e => setTestEmail(e.target.value)}
                      className="w-48"
                    />
                    <Button variant="outline" onClick={handleTestSmtp} disabled={smtpTesting}>
                      {smtpTesting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
                      Test
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Email Templates
                  </CardTitle>
                  <CardDescription>Manage email templates for notifications</CardDescription>
                </div>
                <Button onClick={() => {
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
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Template
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
                        <Badge variant="secondary">System</Badge>
                        System Templates (cannot be deleted)
                      </h3>
                      <div className="space-y-2">
                        {templates.filter(t => t.type === 'SYSTEM').map(template => (
                          <div key={template.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{template.name}</span>
                                <Badge variant="outline" className="text-xs">{template.code}</Badge>
                                {!template.isActive && <Badge variant="destructive" className="text-xs">Disabled</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">{template.subject}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="icon" variant="ghost" onClick={() => handlePreviewTemplate(template)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => {
                                setEditingTemplate(template);
                                setTemplateDialogOpen(true);
                              }}>
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
                        <Badge>Custom</Badge>
                        Custom Templates
                      </h3>
                      <div className="space-y-2">
                        {templates.filter(t => t.type === 'CUSTOM').length === 0 ? (
                          <p className="text-muted-foreground text-sm py-4 text-center">No custom templates yet</p>
                        ) : (
                          templates.filter(t => t.type === 'CUSTOM').map(template => (
                            <div key={template.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{template.name}</span>
                                  <Badge variant="outline" className="text-xs">{template.code}</Badge>
                                  {!template.isActive && <Badge variant="destructive" className="text-xs">Disabled</Badge>}
                                </div>
                                <p className="text-sm text-muted-foreground truncate">{template.subject}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button size="icon" variant="ghost" onClick={() => handlePreviewTemplate(template)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => {
                                  setEditingTemplate(template);
                                  setTemplateDialogOpen(true);
                                }}>
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
          </TabsContent>

          {/* Send Email Tab */}
          <TabsContent value="send">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recipients Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Recipients
                  </CardTitle>
                  <CardDescription>Select users to send email to</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="sendToAll"
                      checked={sendToAll}
                      onCheckedChange={(checked) => setSendToAll(checked as boolean)}
                    />
                    <Label htmlFor="sendToAll" className="font-medium">Send to all users</Label>
                  </div>

                  {!sendToAll && (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Search users..."
                          value={userSearch}
                          onChange={e => {
                            setUserSearch(e.target.value);
                            fetchUsers(e.target.value);
                          }}
                          className="pl-10"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {selectedUsers.length} selected
                        </span>
                        <Button variant="link" size="sm" onClick={handleSelectAllUsers}>
                          {selectedUsers.length === users.length ? 'Deselect all' : 'Select all'}
                        </Button>
                      </div>

                      <ScrollArea className="h-[300px] border rounded-md p-2">
                        <div className="space-y-1">
                          {users.map(user => (
                            <div 
                              key={user.id}
                              className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-muted ${
                                selectedUsers.includes(user.id) ? 'bg-primary/10' : ''
                              }`}
                              onClick={() => handleToggleUser(user.id)}
                            >
                              <Checkbox checked={selectedUsers.includes(user.id)} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{user.name || user.email}</p>
                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                              </div>
                              <Badge variant="outline" className="text-xs">{user.role}</Badge>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Email Content */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Content
                  </CardTitle>
                  <CardDescription>Compose your email message</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Template (optional)</Label>
                    <Select value={selectedTemplate} onValueChange={handleSelectTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template or write custom" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Custom Email</SelectItem>
                        {templates.filter(t => t.isActive).map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input 
                      value={emailSubject}
                      onChange={e => setEmailSubject(e.target.value)}
                      placeholder="Email subject"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Body (HTML supported)</Label>
                    <TipTapEditor
                      value={emailBody}
                      onChange={setEmailBody}
                      placeholder="Email body..."
                      minHeight={200}
                      showHtmlToggle
                    />
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={handleSendEmail} 
                    disabled={sending || (!sendToAll && selectedUsers.length === 0)}
                  >
                    {sending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Email {sendToAll ? '(to all users)' : `(to ${selectedUsers.length} users)`}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Email Logs
                  </CardTitle>
                  <CardDescription>Track sent emails and their status</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchLogs(logsPage)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : logs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No email logs yet</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {logs.map(log => (
                        <div key={log.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {log.status === 'SENT' && <CheckCircle className="h-4 w-4 text-green-500" />}
                              {log.status === 'FAILED' && <XCircle className="h-4 w-4 text-red-500" />}
                              {log.status === 'PENDING' && <Clock className="h-4 w-4 text-yellow-500" />}
                              <span className="font-medium truncate">{log.subject}</span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">To: {log.toEmail}</p>
                            {log.error && <p className="text-sm text-destructive truncate">{log.error}</p>}
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {logsTotalPages > 1 && (
                      <div className="flex justify-center gap-2 mt-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={logsPage === 1}
                          onClick={() => fetchLogs(logsPage - 1)}
                        >
                          Previous
                        </Button>
                        <span className="flex items-center px-4 text-sm">
                          Page {logsPage} of {logsTotalPages}
                        </span>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={logsPage === logsTotalPages}
                          onClick={() => fetchLogs(logsPage + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Template Edit Dialog */}
        <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate?.id ? 'Edit Template' : 'Create Template'}
              </DialogTitle>
              <DialogDescription>
                {editingTemplate?.type === 'SYSTEM' 
                  ? 'Edit the system email template'
                  : 'Create or edit a custom email template'
                }
              </DialogDescription>
            </DialogHeader>

            {editingTemplate && (
              <div className="space-y-4">
                {editingTemplate.type !== 'SYSTEM' && (
                  <div className="space-y-2">
                    <Label>Template Code</Label>
                    <Input 
                      value={editingTemplate.code}
                      onChange={e => setEditingTemplate({ ...editingTemplate, code: e.target.value })}
                      placeholder="TEMPLATE_CODE"
                      disabled={!!editingTemplate.id}
                    />
                    <p className="text-xs text-muted-foreground">Unique identifier for this template</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input 
                    value={editingTemplate.name}
                    onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    placeholder="Template Name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input 
                    value={editingTemplate.subject}
                    onChange={e => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                    placeholder="Email subject (supports {{variables}})"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Body (HTML)</Label>
                  <TipTapEditor
                    value={editingTemplate.body}
                    onChange={(body) => setEditingTemplate({ ...editingTemplate, body })}
                    placeholder="Email body HTML..."
                    minHeight={200}
                    showHtmlToggle
                  />
                  <p className="text-xs text-muted-foreground">
                    Available variables: {'{{name}}'}, {'{{email}}'}, {'{{domain}}'}, {'{{username}}'}, {'{{password}}'}, {'{{reason}}'}, {'{{siteName}}'}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch 
                    id="isActive"
                    checked={editingTemplate.isActive}
                    onCheckedChange={checked => setEditingTemplate({ ...editingTemplate, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveTemplate}>Save Template</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Template Preview</DialogTitle>
              <DialogDescription>
                <strong>Subject:</strong> {previewContent.subject}
              </DialogDescription>
            </DialogHeader>
            <div 
              className="border rounded-lg p-4 bg-card max-h-[60vh] overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: previewContent.body }}
            />
            <DialogFooter>
              <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
