import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FolderOpen,
  Loader2,
  ArrowLeft,
  Save,
  Languages,
  Globe,
  Check,
  AlertCircle,
  UserCog,
  Database,
  Code,
  FileText,
  Settings,
  HelpCircle,
  Shield,
  Server,
  Mail,
  Book,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import AdminLayout from "@/components/admin/AdminLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";

interface Translations {
  [locale: string]: { name?: string; description?: string; };
}

const iconMap: Record<string, LucideIcon> = {
  UserCog, Globe, FolderOpen, Database, Code, FileText,
  Settings, HelpCircle, Shield, Server, Mail, Book, CreditCard,
};

const iconOptions = [
  { value: "FolderOpen", label: "Folder", icon: FolderOpen },
  { value: "UserCog", label: "Account", icon: UserCog },
  { value: "Globe", label: "Globe", icon: Globe },
  { value: "Database", label: "Database", icon: Database },
  { value: "Code", label: "Code", icon: Code },
  { value: "FileText", label: "Document", icon: FileText },
  { value: "Settings", label: "Settings", icon: Settings },
  { value: "HelpCircle", label: "Help", icon: HelpCircle },
  { value: "Shield", label: "Security", icon: Shield },
  { value: "Server", label: "Server", icon: Server },
  { value: "Mail", label: "Email", icon: Mail },
  { value: "Book", label: "Book", icon: Book },
  { value: "CreditCard", label: "Billing", icon: CreditCard },
];

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'fil', name: 'Filipino', flag: '🇵🇭' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
];

// Google Translate API (unofficial)
const translateText = async (text: string, targetLang: string, sourceLang: string = 'en'): Promise<string> => {
  if (!text) return '';
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data[0]) {
      return data[0].map((item: any) => item[0]).join('');
    }
    return text;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
};

const AdminKBCategoryForm = () => {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  usePageTitle(isEdit ? "Edit Category" : "Add Category");

  const [activeLang, setActiveLang] = useState("en");
  const [translating, setTranslating] = useState(false);
  const [translatingLangs, setTranslatingLangs] = useState<string[]>([]);
  
  const [form, setForm] = useState({
    name: "",
    description: "",
    icon: "FolderOpen",
    isActive: true,
    translations: {} as Translations,
  });

  // Fetch category if editing
  const { data: category, isLoading } = useQuery({
    queryKey: ["kb-admin-category", id],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/api/kb/admin/categories/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: isEdit,
  });

  // Load category data when fetched
  useEffect(() => {
    if (category && isEdit) {
      setForm({
        name: category.name,
        description: category.description || "",
        icon: category.icon || "FolderOpen",
        isActive: category.isActive,
        translations: category.translations || {},
      });
    }
  }, [category, isEdit]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const token = localStorage.getItem("accessToken");
      const url = isEdit 
        ? `${API_URL}/api/kb/admin/categories/${id}` 
        : `${API_URL}/api/kb/admin/categories`;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["kb-admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["kb-admin-category", data.id] });
      toast({ title: isEdit ? "Category updated" : "Category created" });
      // If creating new, redirect to edit page to continue editing/translating
      if (!isEdit && data.id) {
        navigate(`/admin/knowledge-base/category/${data.id}`, { replace: true });
      }
      // If editing, stay on the same page
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Get current field value based on language
  const getFieldValue = (field: 'name' | 'description') => {
    if (activeLang === 'en') {
      return form[field];
    }
    return form.translations[activeLang]?.[field] || '';
  };

  // Set field value for current language
  const setFieldValue = (field: 'name' | 'description', value: string) => {
    if (activeLang === 'en') {
      setForm(prev => ({ ...prev, [field]: value }));
    } else {
      setForm(prev => ({
        ...prev,
        translations: {
          ...prev.translations,
          [activeLang]: {
            ...prev.translations[activeLang],
            [field]: value,
          },
        },
      }));
    }
  };

  // Check if language has content
  const hasLangContent = (lang: string): boolean => {
    if (lang === 'en') {
      return !!form.name;
    }
    return !!form.translations[lang]?.name;
  };

  // Auto translate to a specific language
  const translateToLang = async (targetLang: string) => {
    if (targetLang === 'en' || !form.name) return;
    
    setTranslatingLangs(prev => [...prev, targetLang]);
    
    try {
      const [name, description] = await Promise.all([
        translateText(form.name, targetLang),
        form.description ? translateText(form.description, targetLang) : '',
      ]);
      
      setForm(prev => ({
        ...prev,
        translations: {
          ...prev.translations,
          [targetLang]: { name, description },
        },
      }));
      
      toast({ title: `Translated to ${LANGUAGES.find(l => l.code === targetLang)?.name}` });
    } catch (error) {
      toast({ title: "Translation failed", variant: "destructive" });
    } finally {
      setTranslatingLangs(prev => prev.filter(l => l !== targetLang));
    }
  };

  // Translate to all languages
  const translateToAll = async () => {
    if (!form.name) {
      toast({ title: "Please fill English name first", variant: "destructive" });
      return;
    }
    
    setTranslating(true);
    const otherLangs = LANGUAGES.filter(l => l.code !== 'en');
    
    for (const lang of otherLangs) {
      await translateToLang(lang.code);
    }
    
    setTranslating(false);
    toast({ title: "Translated to all languages" });
  };

  const handleSave = () => {
    if (!form.name) {
      toast({ title: "Please enter category name", variant: "destructive" });
      return;
    }
    saveMutation.mutate(form);
  };

  if (isEdit && isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  const SelectedIcon = iconMap[form.icon] || FolderOpen;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/knowledge-base?tab=categories")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FolderOpen className="w-6 h-6" />
                {isEdit ? "Edit Category" : "Add Category"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {isEdit ? "Update category details and translations" : "Create a new knowledge base category"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/admin/knowledge-base?tab=categories")}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Category
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Language Tabs */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Languages className="w-4 h-4" />
                    Content by Language
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={translateToAll}
                    disabled={translating || !form.name}
                  >
                    {translating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Globe className="w-4 h-4 mr-2" />
                    )}
                    Translate All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeLang} onValueChange={setActiveLang}>
                  <ScrollArea className="w-full">
                    <TabsList className="inline-flex w-full justify-start gap-1 h-auto flex-wrap p-1">
                      {LANGUAGES.map((lang) => (
                        <TabsTrigger
                          key={lang.code}
                          value={lang.code}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 text-sm",
                            hasLangContent(lang.code) && "border-green-500 border"
                          )}
                        >
                          <span>{lang.flag}</span>
                          <span className="hidden sm:inline">{lang.name}</span>
                          <span className="sm:hidden">{lang.code.toUpperCase()}</span>
                          {hasLangContent(lang.code) && (
                            <Check className="w-3 h-3 text-green-500" />
                          )}
                          {translatingLangs.includes(lang.code) && (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          )}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </ScrollArea>

                  {LANGUAGES.map((lang) => (
                    <TabsContent key={lang.code} value={lang.code} className="space-y-4 mt-4">
                      {/* Translate button for non-EN */}
                      {lang.code !== 'en' && (
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Globe className="w-4 h-4" />
                            {hasLangContent(lang.code) ? (
                              <span className="text-green-600">Content available in {lang.name}</span>
                            ) : (
                              <span>No content in {lang.name} yet</span>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => translateToLang(lang.code)}
                            disabled={translatingLangs.includes(lang.code) || !form.name}
                          >
                            {translatingLangs.includes(lang.code) ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Languages className="w-4 h-4 mr-2" />
                            )}
                            {hasLangContent(lang.code) ? "Re-translate" : "Translate"} from English
                          </Button>
                        </div>
                      )}

                      {/* Name */}
                      <div className="space-y-2">
                        <Label htmlFor={`name-${lang.code}`}>
                          Name ({lang.code.toUpperCase()}) *
                        </Label>
                        <Input
                          id={`name-${lang.code}`}
                          value={getFieldValue('name')}
                          onChange={(e) => setFieldValue('name', e.target.value)}
                          placeholder={`Enter name in ${lang.name}`}
                        />
                      </div>

                      {/* Description */}
                      <div className="space-y-2">
                        <Label htmlFor={`description-${lang.code}`}>
                          Description ({lang.code.toUpperCase()})
                        </Label>
                        <Textarea
                          id={`description-${lang.code}`}
                          value={getFieldValue('description')}
                          onChange={(e) => setFieldValue('description', e.target.value)}
                          placeholder={`Enter description in ${lang.name}`}
                          rows={3}
                        />
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Right Side */}
          <div className="space-y-6">
            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Icon */}
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <Select value={form.icon} onValueChange={(v) => setForm(prev => ({ ...prev, icon: v }))}>
                    <SelectTrigger>
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <SelectedIcon className="w-4 h-4" />
                          <span>{iconOptions.find(i => i.value === form.icon)?.label}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              <span>{opt.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Active */}
                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(checked) => setForm(prev => ({ ...prev, isActive: checked }))}
                  />
                </div>

                {/* Preview */}
                <div className="pt-4 border-t">
                  <Label className="text-muted-foreground mb-2 block">Preview</Label>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <SelectedIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{form.name || "Category Name"}</p>
                        <p className="text-sm text-muted-foreground">
                          {form.description || "Category description"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Translation Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Translation Status</CardTitle>
                <CardDescription>
                  {LANGUAGES.filter(l => hasLangContent(l.code)).length} / {LANGUAGES.length} languages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {LANGUAGES.map((lang) => (
                    <div
                      key={lang.code}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-lg text-sm",
                        hasLangContent(lang.code) ? "bg-green-50 dark:bg-green-900/20" : "bg-muted"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </div>
                      {hasLangContent(lang.code) ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <Check className="w-3 h-3 mr-1" />
                          Done
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Missing
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminKBCategoryForm;
