import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Book,
  FolderOpen,
  FileText,
  Plus,
  Edit,
  Trash2,
  Search,
  Loader2,
  Upload,
  MoreVertical,
  UserCog,
  Globe,
  Database,
  Code,
  Settings,
  HelpCircle,
  Shield,
  Server,
  Mail,
  CreditCard,
  ExternalLink,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminLayout from "@/components/admin/AdminLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";

const iconMap: Record<string, LucideIcon> = {
  UserCog, Globe, FolderOpen, Database, Code, FileText,
  Settings, HelpCircle, Shield, Server, Mail, Book, CreditCard,
};

const iconOptions = [
  { value: "FolderOpen", label: "Folder" },
  { value: "UserCog", label: "Account" },
  { value: "Globe", label: "Globe" },
  { value: "Database", label: "Database" },
  { value: "Code", label: "Code" },
  { value: "FileText", label: "Document" },
  { value: "Settings", label: "Settings" },
  { value: "HelpCircle", label: "Help" },
  { value: "Shield", label: "Security" },
  { value: "Server", label: "Server" },
  { value: "Mail", label: "Email" },
  { value: "Book", label: "Book" },
  { value: "CreditCard", label: "Billing" },
];

const renderIcon = (icon: string | null, className?: string) => {
  if (!icon) return <FolderOpen className={className} />;
  const Icon = iconMap[icon];
  return Icon ? <Icon className={className} /> : <span>{icon}</span>;
};

interface Translations {
  [locale: string]: { name?: string; description?: string; title?: string; content?: string; excerpt?: string; };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  order: number;
  isActive: boolean;
  articleCount: number;
  translations: Translations | null;
}

interface Article {
  id: string;
  categoryId: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  views: number;
  helpful: number;
  notHelpful: number;
  isActive: boolean;
  order: number;
  translations: Translations | null;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string; };
}

const LANGUAGES = [
  { code: 'all', name: 'All Languages', flag: '🌐' },
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

const EDIT_LANGUAGES = [
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

// Helper to check if item has content for a language
const hasLangContent = (item: Category | Article, lang: string): boolean => {
  if (lang === 'all') return true;
  if (lang === 'en') {
    // EN is stored in main fields
    if ('title' in item) {
      return !!item.title && !!item.content;
    }
    return !!item.name;
  }
  // Other languages in translations
  const trans = item.translations as Translations | null;
  if ('title' in item) {
    return !!(trans?.[lang]?.title && trans?.[lang]?.content);
  }
  return !!trans?.[lang]?.name;
};

// Get display name for item based on language
const getDisplayName = (item: Category | Article, lang: string): string => {
  if (lang === 'all' || lang === 'en') {
    return 'name' in item ? item.name : item.title;
  }
  const trans = item.translations as Translations | null;
  if ('name' in item) {
    return trans?.[lang]?.name || item.name;
  }
  return trans?.[lang]?.title || item.title;
};

const AdminKnowledgeBase = () => {
  const { t } = useLanguage();
  usePageTitle(t.admin?.knowledgeBase || "Knowledge Base");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get tab from URL
  const initialTab = searchParams.get('tab') || 'articles';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterLang, setFilterLang] = useState<string>("all"); // Language filter for list

  // Delete Dialogs
  const [deleteCat, setDeleteCat] = useState<Category | null>(null);
  const [deleteArt, setDeleteArt] = useState<Article | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Import Dialog
  const [importDialog, setImportDialog] = useState(false);
  const [importData, setImportData] = useState("");

  // Queries
  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ["kb-admin-categories"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/api/kb/admin/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
  });

  const { data: articlesData, isLoading: artLoading } = useQuery({
    queryKey: ["kb-admin-articles", filterCategory, search],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const params = new URLSearchParams();
      if (filterCategory !== "all") params.set("categoryId", filterCategory);
      if (search) params.set("search", search);
      const res = await fetch(`${API_URL}/api/kb/admin/articles?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
  });

  const articles: Article[] = articlesData?.articles || [];

  // Filter articles by language
  const filteredArticles = articles.filter(art => filterLang === 'all' || hasLangContent(art, filterLang));

  // Pagination
  const totalPages = Math.ceil(filteredArticles.length / itemsPerPage);
  const paginatedArticles = filteredArticles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, search, filterLang]);

  // Stats
  const totalViews = articles.reduce((sum, a) => sum + a.views, 0);
  const totalHelpful = articles.reduce((sum, a) => sum + a.helpful, 0);
  const totalNotHelpful = articles.reduce((sum, a) => sum + a.notHelpful, 0);

  // Mutations
  const deleteCatMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/api/kb/admin/categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["kb-admin-articles"] });
      setDeleteCat(null);
      toast({ title: "Deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteArtMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/api/kb/admin/articles/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-admin-articles"] });
      queryClient.invalidateQueries({ queryKey: ["kb-admin-categories"] });
      setDeleteArt(null);
      toast({ title: "Deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const importMutation = useMutation({
    mutationFn: async (data: string) => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/api/kb/admin/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: data,
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["kb-admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["kb-admin-articles"] });
      setImportDialog(false);
      setImportData("");
      toast({ title: "Imported", description: `${data.imported.categories} categories, ${data.imported.articles} articles` });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Book className="w-6 h-6" />
              Knowledge Base
            </h1>
            <p className="text-muted-foreground text-sm">Manage help articles and documentation</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportDialog(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            {activeTab === "categories" ? (
              <Button onClick={() => navigate("/admin/knowledge-base/category/new")}>
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            ) : (
              <Button onClick={() => navigate("/admin/knowledge-base/article/new")}>
                <Plus className="w-4 h-4 mr-2" />
                Add Article
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <FolderOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{categories.length}</p>
                  <p className="text-xs text-muted-foreground">Categories</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{articles.length}</p>
                  <p className="text-xs text-muted-foreground">Articles</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Eye className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Views</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <ThumbsUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalHelpful + totalNotHelpful > 0 ? Math.round(totalHelpful / (totalHelpful + totalNotHelpful) * 100) : 0}%</p>
                  <p className="text-xs text-muted-foreground">Helpful Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="articles" className="gap-2">
                <FileText className="w-4 h-4" />
                Articles
              </TabsTrigger>
              <TabsTrigger value="categories" className="gap-2">
                <FolderOpen className="w-4 h-4" />
                Categories
              </TabsTrigger>
            </TabsList>

            {activeTab === "articles" && (
              <div className="flex gap-2">
                <Select value={filterLang} onValueChange={setFilterLang}>
                  <SelectTrigger className="w-36">
                    <Globe className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>{l.flag} {l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 w-48"
                  />
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((c: Category) => (
                      <SelectItem key={c.id} value={c.id}>{getDisplayName(c, filterLang)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {activeTab === "categories" && (
              <Select value={filterLang} onValueChange={setFilterLang}>
                <SelectTrigger className="w-36">
                  <Globe className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.code} value={l.code}>{l.flag} {l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Articles Tab */}
          <TabsContent value="articles" className="mt-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Views</TableHead>
                    <TableHead className="text-center">Rating</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {artLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredArticles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No articles found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedArticles.map((art) => (
                      <TableRow key={art.id} className={cn(!art.isActive && "opacity-50")}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{getDisplayName(art, filterLang)}</span>
                            {filterLang === 'all' && (
                              <div className="flex gap-1 flex-wrap">
                                {EDIT_LANGUAGES.map(lang => 
                                  hasLangContent(art, lang.code) && (
                                    <Badge key={lang.code} variant="outline" className="text-xs px-1">{lang.code.toUpperCase()}</Badge>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getDisplayName(art.category as Category, filterLang) || "-"}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{art.views}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2 text-sm">
                            <span className="text-green-600">👍 {art.helpful}</span>
                            <span className="text-red-600">👎 {art.notHelpful}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {art.isActive ? (
                            <Badge variant="default" className="bg-green-500">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Hidden</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/admin/knowledge-base/article/${art.id}`)}>
                                <Edit className="w-4 h-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.open(`/user/knowledge-base?article=${art.slug}`, '_blank')}>
                                <ExternalLink className="w-4 h-4 mr-2" /> Preview
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteArt(art)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredArticles.length)} of {filteredArticles.length} articles
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="mt-4">
            {catLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : categories.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <FolderOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No categories yet</p>
                  <Button onClick={() => { resetCatForm(); setCatDialog(true); }}>
                    <Plus className="w-4 h-4 mr-2" /> Add Category
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categories
                  .filter((cat: Category) => filterLang === 'all' || hasLangContent(cat, filterLang))
                  .map((cat: Category) => (
                  <Card key={cat.id} className={cn(!cat.isActive && "opacity-50")}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            {renderIcon(cat.icon, "w-5 h-5 text-primary")}
                          </div>
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              {getDisplayName(cat, filterLang)}
                              {filterLang === 'all' && (
                                <div className="flex gap-1 flex-wrap">
                                  {EDIT_LANGUAGES.map(lang => 
                                    hasLangContent(cat, lang.code) && (
                                      <Badge key={lang.code} variant="outline" className="text-xs px-1">{lang.code.toUpperCase()}</Badge>
                                    )
                                  )}
                                </div>
                              )}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">{cat.articleCount} articles</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/admin/knowledge-base/category/${cat.id}`)}>
                              <Edit className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setFilterCategory(cat.id); setActiveTab("articles"); }}>
                              <FileText className="w-4 h-4 mr-2" /> View Articles
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteCat(cat)}>
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {(filterLang !== 'all' && filterLang !== 'en' && cat.translations?.[filterLang]?.description) || cat.description || "No description"}
                      </p>
                      <div className="mt-3">
                        <Badge variant={cat.isActive ? "default" : "secondary"}>
                          {cat.isActive ? "Active" : "Hidden"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Category Dialog */}
      <AlertDialog open={!!deleteCat} onOpenChange={(o) => !o && setDeleteCat(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>This will delete the category and all its articles.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteCat && deleteCatMutation.mutate(deleteCat.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Article Dialog */}
      <AlertDialog open={!!deleteArt} onOpenChange={(o) => !o && setDeleteArt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Article?</AlertDialogTitle>
            <AlertDialogDescription>This article will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteArt && deleteArtMutation.mutate(deleteArt.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      <Dialog open={importDialog} onOpenChange={setImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Knowledge Base</DialogTitle>
          </DialogHeader>
          <Textarea
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            placeholder='{"categories": [...], "articles": [...]}'
            rows={10}
            className="font-mono text-sm"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialog(false)}>Cancel</Button>
            <Button onClick={() => importMutation.mutate(importData)} disabled={importMutation.isPending || !importData.trim()}>
              {importMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminKnowledgeBase;
