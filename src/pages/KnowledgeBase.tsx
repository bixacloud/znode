import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  FolderOpen,
  FileText,
  Clock,
  Eye,
  ArrowLeft,
  BookOpen,
  UserCog,
  Globe,
  Database,
  Code,
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
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";

const iconMap: Record<string, LucideIcon> = {
  UserCog, Globe, FolderOpen, Database, Code, FileText,
  Settings, HelpCircle, Shield, Server, Mail, Book, CreditCard,
};

const renderIcon = (icon: string | null, className?: string) => {
  if (!icon) return <FolderOpen className={className} />;
  const Icon = iconMap[icon];
  return Icon ? <Icon className={className} /> : <span>{icon}</span>;
};

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  articleCount: number;
  articles?: Article[];
}

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  views: number;
  helpful: number;
  notHelpful: number;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string; slug: string; };
}

const KnowledgeBase = () => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const articleSlug = searchParams.get("article");
  const searchQuery = searchParams.get("q") || "";
  const [search, setSearch] = useState(searchQuery);
  const [hasRated, setHasRated] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  usePageTitle(articleSlug ? t.kb?.article || "Article" : t.kb?.title || "Knowledge Base");

  useEffect(() => {
    if (articleSlug) {
      setHasRated(localStorage.getItem(`kb_rated_${articleSlug}`));
    }
  }, [articleSlug]);

  const kbT = {
    title: t.kb?.title || "Knowledge Base",
    subtitle: t.kb?.subtitle || "Find answers to common questions",
    searchPlaceholder: t.kb?.searchPlaceholder || "Search for help...",
    views: t.kb?.views || "views",
    helpful: t.kb?.helpful || "Was this helpful?",
    yes: t.kb?.yes || "Yes",
    no: t.kb?.no || "No",
    thankYou: t.kb?.thankYou || "Thank you!",
    noResults: t.kb?.noResults || "No results found",
    lastUpdated: t.kb?.lastUpdated || "Updated",
    noCategories: t.kb?.noCategories || "No categories",
    articles: t.kb?.articles || "articles",
    back: t.common?.back || "Back",
    moreArticles: t.kb?.moreArticles || "more articles",
    showLess: t.kb?.showLess || "Show less",
  };

  // Toggle expanded state for a category
  const toggleCategoryExpand = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Fetch categories with articles
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["kb-categories", language],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/kb/categories?lang=${language}&includeArticles=true`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !articleSlug && !searchQuery,
  });

  // Fetch article
  const { data: article, isLoading: articleLoading } = useQuery({
    queryKey: ["kb-article", articleSlug, language],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/kb/articles/${articleSlug}?lang=${language}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!articleSlug,
  });

  // Search
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ["kb-search", searchQuery, language],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/kb/search?q=${encodeURIComponent(searchQuery)}&lang=${language}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: searchQuery.length >= 2,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim().length >= 2) {
      setSearchParams({ q: search.trim() });
    }
  };

  const handleRate = async (helpful: boolean) => {
    if (!article || hasRated) return;
    try {
      await fetch(`${API_URL}/api/kb/articles/${article.id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ helpful }),
      });
      localStorage.setItem(`kb_rated_${articleSlug}`, helpful ? "yes" : "no");
      setHasRated(helpful ? "yes" : "no");
      toast({ title: kbT.thankYou });
    } catch {}
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  // Remove first heading from content to avoid duplicate title
  const stripFirstHeading = (content: string) => {
    if (!content) return content;
    // Remove first h1/h2 heading (markdown or HTML)
    return content
      .replace(/^#{1,2}\s+[^\n]+\n+/, '') // Markdown: # or ## heading
      .replace(/^<h[12][^>]*>.*?<\/h[12]>\s*/i, ''); // HTML: <h1> or <h2>
  };

  // === ARTICLE VIEW ===
  if (articleSlug) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          {articleLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : article ? (
            <div className="space-y-6">
              {/* Back & Breadcrumb */}
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => setSearchParams({})}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  {kbT.back}
                </Button>
                {article.category && (
                  <Badge variant="outline" className="font-normal">
                    {article.category.name}
                  </Badge>
                )}
              </div>

              {/* Article */}
              <article>
                <h1 className="text-3xl font-bold mb-3">{article.title}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {kbT.lastUpdated} {formatDate(article.updatedAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {article.views} {kbT.views}
                  </span>
                </div>

                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <MarkdownRenderer content={stripFirstHeading(article.content)} />
                </div>
              </article>

              {/* Feedback */}
              <div className="border-t pt-6 mt-10">
                <div className="flex items-center justify-between bg-muted/50 rounded-lg p-4">
                  <span className="font-medium">{kbT.helpful}</span>
                  {hasRated ? (
                    <span className="text-muted-foreground flex items-center gap-2">
                      {kbT.thankYou}
                      {hasRated === "yes" ? (
                        <ThumbsUp className="w-4 h-4 text-green-500 fill-green-500" />
                      ) : (
                        <ThumbsDown className="w-4 h-4 text-red-500 fill-red-500" />
                      )}
                    </span>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleRate(true)}>
                        <ThumbsUp className="w-4 h-4 mr-1" /> {kbT.yes}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleRate(false)}>
                        <ThumbsDown className="w-4 h-4 mr-1" /> {kbT.no}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </DashboardLayout>
    );
  }

  // === SEARCH RESULTS ===
  if (searchQuery) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setSearchParams({}); }}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              {kbT.back}
            </Button>
          </div>

          <h1 className="text-2xl font-bold">
            Search: "{searchQuery}"
            <span className="text-muted-foreground font-normal text-lg ml-2">
              ({searchResults.length} results)
            </span>
          </h1>

          {searchLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>{kbT.noResults}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {searchResults.map((art: Article) => (
                <div
                  key={art.id}
                  onClick={() => setSearchParams({ article: art.slug })}
                  className="p-4 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="font-medium">{art.title}</span>
                    {art.category && (
                      <Badge variant="secondary" className="text-xs">{art.category.name}</Badge>
                    )}
                  </div>
                  {art.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-1 ml-6">{art.excerpt}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // === HOME VIEW ===
  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">{kbT.title}</h1>
          <p className="text-muted-foreground text-lg">{kbT.subtitle}</p>
          
          {/* Search */}
          <form onSubmit={handleSearch} className="max-w-md mx-auto mt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={kbT.searchPlaceholder}
                className="pl-10 h-12 text-base"
              />
            </div>
          </form>
        </div>

        {/* Categories */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>{kbT.noCategories}</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {categories.map((cat: Category) => (
              <div key={cat.id} className="rounded-xl border bg-card overflow-hidden">
                {/* Category Header */}
                <div className="p-5 border-b bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      {renderIcon(cat.icon, "w-5 h-5 text-primary")}
                    </div>
                    <div>
                      <h2 className="font-semibold text-lg">{cat.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        {cat.articleCount} {kbT.articles}
                      </p>
                    </div>
                  </div>
                  {cat.description && (
                    <p className="text-sm text-muted-foreground mt-3">{cat.description}</p>
                  )}
                </div>

                {/* Articles */}
                <div className="divide-y">
                  {cat.articles && cat.articles.length > 0 ? (
                    (expandedCategories.has(cat.id) ? cat.articles : cat.articles.slice(0, 5)).map((art: Article) => (
                      <div
                        key={art.id}
                        onClick={() => setSearchParams({ article: art.slug })}
                        className="px-5 py-3 flex items-center justify-between hover:bg-accent cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{art.title}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))
                  ) : (
                    <div className="px-5 py-4 text-sm text-muted-foreground">
                      No articles yet
                    </div>
                  )}
                  {cat.articles && cat.articles.length > 5 && (
                    <div
                      onClick={() => toggleCategoryExpand(cat.id)}
                      className="px-5 py-3 text-sm text-primary font-medium cursor-pointer hover:bg-accent transition-colors flex items-center gap-2"
                    >
                      {expandedCategories.has(cat.id) ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          {kbT.showLess}
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          +{cat.articles.length - 5} {kbT.moreArticles}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default KnowledgeBase;
