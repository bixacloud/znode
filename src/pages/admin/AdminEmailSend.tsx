import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import authService from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";
import AdminLayout from "@/components/admin/AdminLayout";
import TipTapEditor from "@/components/TipTapEditor";
import { 
  Mail, 
  Send, 
  Search,
  Users,
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

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export default function AdminEmailSend() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useLanguage();
  usePageTitle(t.admin?.sendEmail || 'Send Email');
  const token = authService.getAccessToken();

  // Pre-filled email from query param
  const prefilledEmail = searchParams.get('to');

  // Templates State
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Send Email State
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [sendToAll, setSendToAll] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sending, setSending] = useState(false);

  // Check admin access
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Load data
  useEffect(() => {
    fetchTemplates();
    fetchUsers();
  }, []);

  // Handle pre-filled email from query param
  useEffect(() => {
    if (prefilledEmail && users.length > 0) {
      const targetUser = users.find(u => u.email === prefilledEmail);
      if (targetUser && !selectedUsers.includes(targetUser.id)) {
        setSelectedUsers([targetUser.id]);
        setSendToAll(false);
      }
    }
  }, [prefilledEmail, users]);

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
      toast({ 
        title: t.common?.error || "Error", 
        description: t.admin?.pleaseSelectRecipients || "Please select recipients", 
        variant: "destructive" 
      });
      return;
    }

    if (!emailSubject || !emailBody) {
      toast({ 
        title: t.common?.error || "Error", 
        description: t.admin?.subjectAndBodyRequired || "Subject and body are required", 
        variant: "destructive" 
      });
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
        toast({ 
          title: t.common?.success || "Success", 
          description: t.admin?.emailSentTo?.replace('{count}', data.sent) || `Email sent to ${data.sent} recipients` 
        });
        // Reset form
        setSelectedUsers([]);
        setSendToAll(false);
        setSelectedTemplate('');
        setEmailSubject('');
        setEmailBody('');
      } else {
        toast({ title: t.common?.error || "Error", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ 
        title: t.common?.error || "Error", 
        description: t.admin?.failedToSendEmail || "Failed to send email", 
        variant: "destructive" 
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">{t.admin?.sendEmail || 'Send Email'}</h1>
          <p className="text-muted-foreground">{t.admin?.sendEmailDescription || 'Send emails to users'}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recipients Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t.admin?.recipients || 'Recipients'}
              </CardTitle>
              <CardDescription>{t.admin?.selectUsersToSend || 'Select users to send email to'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="sendToAll"
                  checked={sendToAll}
                  onCheckedChange={(checked) => setSendToAll(checked as boolean)}
                />
                <Label htmlFor="sendToAll" className="font-medium">
                  {t.admin?.sendToAllUsers || 'Send to all users'}
                </Label>
              </div>

              {!sendToAll && (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder={t.admin?.searchUsers || "Search users..."}
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
                      {selectedUsers.length} {t.admin?.selected || 'selected'}
                    </span>
                    <Button variant="link" size="sm" onClick={handleSelectAllUsers}>
                      {selectedUsers.length === users.length 
                        ? (t.admin?.deselectAll || 'Deselect all') 
                        : (t.admin?.selectAll || 'Select all')}
                    </Button>
                  </div>

                  <ScrollArea className="h-[300px] border rounded-md p-2">
                    <div className="space-y-1">
                      {users.map(u => (
                        <div 
                          key={u.id}
                          className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-muted ${
                            selectedUsers.includes(u.id) ? 'bg-primary/10' : ''
                          }`}
                          onClick={() => handleToggleUser(u.id)}
                        >
                          <Checkbox checked={selectedUsers.includes(u.id)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{u.name || u.email}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">{u.role}</Badge>
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
                {t.admin?.emailContent || 'Email Content'}
              </CardTitle>
              <CardDescription>{t.admin?.composeYourEmail || 'Compose your email message'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t.admin?.template || 'Template'} ({t.common?.optional || 'optional'})</Label>
                <Select value={selectedTemplate} onValueChange={handleSelectTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.admin?.selectTemplateOrCustom || "Select a template or write custom"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">{t.admin?.customEmail || 'Custom Email'}</SelectItem>
                    {templates.filter(t => t.isActive).map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t.admin?.subject || 'Subject'}</Label>
                <Input 
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  placeholder={t.admin?.emailSubjectPlaceholder || "Email subject"}
                />
              </div>

              <div className="space-y-2">
                <Label>{t.admin?.body || 'Body'} ({t.admin?.htmlSupported || 'HTML supported'})</Label>
                <TipTapEditor
                  value={emailBody}
                  onChange={setEmailBody}
                  placeholder={t.admin?.emailBodyPlaceholder || "Email body..."}
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
                    {t.admin?.sending || 'Sending...'}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {t.admin?.sendEmail || 'Send Email'} {sendToAll 
                      ? `(${t.admin?.toAllUsers || 'to all users'})` 
                      : `(${t.admin?.toNUsers?.replace('{count}', String(selectedUsers.length)) || `to ${selectedUsers.length} users`})`}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
