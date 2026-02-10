import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { 
  Search, 
  Copy, 
  Code, 
  FileText, 
  Github, 
  ArrowLeft,
  Zap,
  Check,
  X,
  Loader2,
  Globe,
  Timer,
  Trophy,
  ExternalLink,
  FolderOpen,
  BookOpen,
  Activity,
  Star,
  ChevronDown
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface Library {
  name: string;
  description: string;
  version: string;
  homepage?: string;
  repository?: string;
  license?: string;
  providers?: string[];
}

interface LibraryDetails extends Library {
  versions: string[];
  author?: string;
  keywords?: string[];
  filename?: string;
  files?: string[];
  cdnUrls: {
    [provider: string]: {
      name: string;
      logo: string;
      js: string | null;
      css: string | null;
      allFiles: string[];
    };
  };
  readme?: string;
}

interface SpeedTestResult {
  provider: string;
  url: string;
  time: number | null;
  status: 'success' | 'error';
  error?: string;
}

export default function CdnSearch() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Library[]>([]);
  const [popularLibraries, setPopularLibraries] = useState<Library[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState<LibraryDetails | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [isLoadingPopular, setIsLoadingPopular] = useState(true);
  const [showResults, setShowResults] = useState(false);
  
  const [speedTestResults, setSpeedTestResults] = useState<SpeedTestResult[]>([]);
  const [isTestingSpeed, setIsTestingSpeed] = useState(false);
  const [speedTestStats, setSpeedTestStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('files');
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const texts = {
    title: t.cdnSearch?.title || 'CDN Library Search',
    subtitle: t.cdnSearch?.subtitle || 'Find and integrate popular JavaScript and CSS libraries',
    searchPlaceholder: t.cdnSearch?.searchPlaceholder || 'Search libraries...',
    popularLibraries: t.cdnSearch?.popularLibraries || 'Popular Libraries',
    backToSearch: t.cdnSearch?.backToSearch || 'Back',
    version: t.cdnSearch?.version || 'Version',
    copyUrl: t.cdnSearch?.copyUrl || 'Copy URL',
    copyHtml: t.cdnSearch?.copyHtml || 'Copy HTML',
    files: t.cdnSearch?.files || 'Files',
    readme: t.cdnSearch?.readme || 'README',
    speedTest: t.cdnSearch?.speedTest || 'Speed Test',
    speedTestDesc: t.cdnSearch?.speedTestDesc || 'Compare CDN response times',
    testing: t.cdnSearch?.testing || 'Testing...',
    runTest: t.cdnSearch?.runTest || 'Run Test',
    fastest: t.cdnSearch?.fastest || 'Fastest',
    average: t.cdnSearch?.average || 'Average',
    slowest: t.cdnSearch?.slowest || 'Slowest',
    provider: t.cdnSearch?.provider || 'Provider',
    responseTime: t.cdnSearch?.responseTime || 'Response',
    status: t.cdnSearch?.status || 'Status',
    noCss: t.cdnSearch?.noCss || 'No CSS files available',
    noReadme: t.cdnSearch?.noReadme || 'README not available',
    copied: t.common?.copied || 'Copied!',
    error: t.common?.error || 'Error',
  };

  useEffect(() => {
    const libraryName = searchParams.get('library');
    const version = searchParams.get('version');
    if (libraryName) {
      loadLibraryDetails(libraryName, version || undefined);
    } else {
      loadPopularLibraries();
    }
  }, []);

  const searchLibraries = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(`${API_URL}/api/tools/cdn-search/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data.results || []);
      setShowResults(true);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchLibraries(value), 300);
  };

  const loadPopularLibraries = async () => {
    setIsLoadingPopular(true);
    try {
      const response = await fetch(`${API_URL}/api/tools/cdn-search/popular`);
      const data = await response.json();
      setPopularLibraries(data.libraries || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoadingPopular(false);
    }
  };

  const loadLibraryDetails = async (name: string, version?: string) => {
    setIsLoadingLibrary(true);
    setSelectedLibrary(null);
    setShowResults(false);
    setSearchQuery('');
    try {
      const url = version 
        ? `${API_URL}/api/tools/cdn-search/library/${name}?version=${version}`
        : `${API_URL}/api/tools/cdn-search/library/${name}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Library not found');
      const data = await response.json();
      setSelectedLibrary(data);
      setSelectedVersion(data.version);
      setSearchParams({ library: name, version: data.version });
    } catch (error) {
      toast({ title: texts.error, description: 'Failed to load library', variant: 'destructive' });
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  const handleVersionChange = (version: string) => {
    if (selectedLibrary) {
      setSelectedVersion(version);
      loadLibraryDetails(selectedLibrary.name, version);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: texts.copied, description: `${label} copied` });
  };

  const generateHtmlTag = (url: string) => {
    if (url.endsWith('.js')) return `<script src="${url}"></script>`;
    if (url.endsWith('.css')) return `<link rel="stylesheet" href="${url}">`;
    return url;
  };

  const runSpeedTest = async () => {
    if (!selectedLibrary) return;
    setIsTestingSpeed(true);
    setSpeedTestResults([]);
    setSpeedTestStats(null);
    try {
      const response = await fetch(`${API_URL}/api/tools/cdn-search/speed-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ library: selectedLibrary.name, version: selectedVersion }),
      });
      const data = await response.json();
      if (data.success) {
        setSpeedTestResults(data.results);
        setSpeedTestStats(data.stats);
      }
    } catch (error) {
      toast({ title: texts.error, description: 'Speed test failed', variant: 'destructive' });
    } finally {
      setIsTestingSpeed(false);
    }
  };

  const backToSearch = () => {
    setSelectedLibrary(null);
    setSearchParams({});
    setSpeedTestResults([]);
    setSpeedTestStats(null);
    loadPopularLibraries();
  };

  const getSpeedColor = (time: number | null, status: string) => {
    if (status !== 'success' || time === null) return 'text-gray-400';
    if (time < 100) return 'text-emerald-500';
    if (time < 300) return 'text-amber-500';
    return 'text-red-500';
  };

  // Search Results Dropdown
  const SearchDropdown = () => {
    if (!showResults || searchResults.length === 0) return null;
    return (
      <div className="absolute left-0 right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
        <ScrollArea className="max-h-[320px]">
          {searchResults.map((lib, i) => (
            <div
              key={i}
              onClick={() => loadLibraryDetails(lib.name)}
              className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer border-b border-border/50 last:border-0 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                {lib.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground">{lib.name}</div>
                <div className="text-sm text-muted-foreground truncate">{lib.description}</div>
              </div>
              <Badge variant="secondary" className="text-xs">v{lib.version}</Badge>
            </div>
          ))}
        </ScrollArea>
      </div>
    );
  };

  // Popular Libraries Grid
  const PopularGrid = () => {
    if (isLoadingPopular) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {popularLibraries.map((lib, i) => (
          <Card
            key={i}
            onClick={() => loadLibraryDetails(lib.name)}
            className="group cursor-pointer hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 overflow-hidden"
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shrink-0 group-hover:scale-110 transition-transform">
                  {lib.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground truncate">{lib.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{lib.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="outline" className="text-xs">v{lib.version}</Badge>
                {lib.providers?.slice(0, 2).map(p => (
                  <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Library Detail View
  const LibraryDetail = () => {
    if (!selectedLibrary) return null;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={backToSearch} className="shrink-0 mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{selectedLibrary.name}</h1>
              <Select value={selectedVersion} onValueChange={handleVersionChange}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue placeholder={selectedVersion} />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-48">
                    {/* Ensure current version is at top and list is sorted newest first */}
                    {(() => {
                      const versions = selectedLibrary.versions || [];
                      // Sort versions in descending order (newest first)
                      const sortedVersions = [...versions].sort((a, b) => {
                        const partsA = a.split('.').map(Number);
                        const partsB = b.split('.').map(Number);
                        for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
                          const numA = partsA[i] || 0;
                          const numB = partsB[i] || 0;
                          if (numB !== numA) return numB - numA;
                        }
                        return 0;
                      });
                      // Ensure selected version is in the list
                      const allVersions = sortedVersions.includes(selectedVersion)
                        ? sortedVersions
                        : [selectedVersion, ...sortedVersions];
                      return allVersions.slice(0, 50).map(v => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ));
                    })()}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>
            <p className="text-muted-foreground mt-1">{selectedLibrary.description}</p>
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              {selectedLibrary.license && (
                <Badge variant="outline" className="gap-1">
                  <FileText className="h-3 w-3" />
                  {selectedLibrary.license}
                </Badge>
              )}
              {selectedLibrary.homepage && (
                <a href={selectedLibrary.homepage} target="_blank" rel="noopener noreferrer"
                   className="text-sm text-primary hover:underline flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" />
                  Website
                </a>
              )}
              {selectedLibrary.repository && (
                <a href={selectedLibrary.repository.replace('git+', '').replace('.git', '')} 
                   target="_blank" rel="noopener noreferrer"
                   className="text-sm text-primary hover:underline flex items-center gap-1">
                  <Github className="h-3.5 w-3.5" />
                  GitHub
                </a>
              )}
            </div>
          </div>
        </div>

        {/* CDN Links */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* JavaScript */}
          <Card>
            <div className="p-4 border-b bg-gradient-to-r from-amber-500/10 to-orange-500/10">
              <div className="flex items-center gap-2 font-semibold">
                <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                  <Code className="h-4 w-4 text-white" />
                </div>
                JavaScript
              </div>
            </div>
            <CardContent className="p-4 space-y-3">
              {Object.entries(selectedLibrary.cdnUrls).map(([key, cdn]) => (
                cdn.js && (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{cdn.name}</span>
                    </div>
                    <div className="relative group">
                      <code className="block p-3 pr-24 bg-muted rounded-lg text-xs break-all font-mono">
                        {cdn.js}
                      </code>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="secondary" className="h-7 text-xs"
                                onClick={() => copyToClipboard(cdn.js!, 'URL')}>
                          <Copy className="h-3 w-3 mr-1" /> URL
                        </Button>
                        <Button size="sm" variant="secondary" className="h-7 text-xs"
                                onClick={() => copyToClipboard(generateHtmlTag(cdn.js!), 'HTML')}>
                          <Code className="h-3 w-3 mr-1" /> HTML
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              ))}
            </CardContent>
          </Card>

          {/* CSS */}
          <Card>
            <div className="p-4 border-b bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
              <div className="flex items-center gap-2 font-semibold">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                CSS
              </div>
            </div>
            <CardContent className="p-4 space-y-3">
              {Object.entries(selectedLibrary.cdnUrls).some(([, cdn]) => cdn.css) ? (
                Object.entries(selectedLibrary.cdnUrls).map(([key, cdn]) => (
                  cdn.css && (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{cdn.name}</span>
                      </div>
                      <div className="relative group">
                        <code className="block p-3 pr-24 bg-muted rounded-lg text-xs break-all font-mono">
                          {cdn.css}
                        </code>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="sm" variant="secondary" className="h-7 text-xs"
                                  onClick={() => copyToClipboard(cdn.css!, 'URL')}>
                            <Copy className="h-3 w-3 mr-1" /> URL
                          </Button>
                          <Button size="sm" variant="secondary" className="h-7 text-xs"
                                  onClick={() => copyToClipboard(generateHtmlTag(cdn.css!), 'HTML')}>
                            <Code className="h-3 w-3 mr-1" /> HTML
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                ))
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  {texts.noCss}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start h-12 p-1 bg-muted/50">
            <TabsTrigger value="files" className="gap-2 data-[state=active]:bg-background">
              <FolderOpen className="h-4 w-4" />
              {texts.files}
            </TabsTrigger>
            <TabsTrigger value="readme" className="gap-2 data-[state=active]:bg-background">
              <BookOpen className="h-4 w-4" />
              {texts.readme}
            </TabsTrigger>
            <TabsTrigger value="speed" className="gap-2 data-[state=active]:bg-background">
              <Activity className="h-4 w-4" />
              {texts.speedTest}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  <div className="divide-y">
                    {selectedLibrary.files?.map((file, i) => {
                      const fileUrls = {
                        cdnjs: `https://cdnjs.cloudflare.com/ajax/libs/${selectedLibrary.name}/${selectedVersion}/${file}`,
                        jsdelivr: `https://cdn.jsdelivr.net/npm/${selectedLibrary.name}@${selectedVersion}/${file}`,
                        unpkg: `https://unpkg.com/${selectedLibrary.name}@${selectedVersion}/${file}`
                      };
                      return (
                      <div key={i} className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors group">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {file.endsWith('.js') || file.endsWith('.mjs') ? (
                            <div className="w-8 h-8 rounded bg-amber-500/10 flex items-center justify-center shrink-0">
                              <Code className="h-4 w-4 text-amber-600" />
                            </div>
                          ) : file.endsWith('.css') ? (
                            <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center shrink-0">
                              <FileText className="h-4 w-4 text-blue-600" />
                            </div>
                          ) : file.endsWith('.map') ? (
                            <div className="w-8 h-8 rounded bg-purple-500/10 flex items-center justify-center shrink-0">
                              <FileText className="h-4 w-4 text-purple-500" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded bg-gray-500/10 flex items-center justify-center shrink-0">
                              <FileText className="h-4 w-4 text-gray-500" />
                            </div>
                          )}
                          <span className="font-mono text-sm truncate">{file}</span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost" size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => copyToClipboard(fileUrls.cdnjs, 'cdnjs URL')}>
                              <span className="font-medium">cdnjs</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyToClipboard(fileUrls.jsdelivr, 'jsDelivr URL')}>
                              <span className="font-medium">jsDelivr</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyToClipboard(fileUrls.unpkg, 'unpkg URL')}>
                              <span className="font-medium">unpkg</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="readme" className="mt-4">
            <Card>
              <CardContent className="p-6">
                {selectedLibrary.readme ? (
                  <ScrollArea className="h-[500px]">
                    <div className="readme-content prose prose-sm dark:prose-invert max-w-none
                      [&_table]:w-auto [&_table]:border-collapse [&_table]:my-4
                      [&_td]:p-2 [&_td]:align-middle [&_td]:text-center
                      [&_th]:p-2 [&_th]:align-middle [&_th]:text-center
                      [&_img]:inline-block [&_img]:max-w-[80px] [&_img]:h-auto
                      [&_a]:text-primary [&_a]:no-underline hover:[&_a]:underline
                      [&_hr]:my-4 [&_hr]:border-border
                      [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-4
                      [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-3
                      [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2
                      [&_p]:my-2 [&_br]:leading-loose
                      [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto
                      [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm
                    ">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        components={{
                          img: ({ src, alt, width }) => {
                            let fixedSrc = src || '';
                            // Fix relative paths
                            if (fixedSrc && !fixedSrc.startsWith('http') && !fixedSrc.startsWith('data:')) {
                              const cleanSrc = fixedSrc.replace(/^\.?\.?\//, '');
                              // Try GitHub raw URL first for common libraries
                              if (selectedLibrary.repository) {
                                const match = selectedLibrary.repository.match(/github\.com\/([^/]+)\/([^/]+)/);
                                if (match) {
                                  fixedSrc = `https://raw.githubusercontent.com/${match[1]}/${match[2]}/master/${cleanSrc}`;
                                } else {
                                  fixedSrc = `https://cdn.jsdelivr.net/npm/${selectedLibrary.name}@${selectedVersion}/${cleanSrc}`;
                                }
                              } else {
                                fixedSrc = `https://cdn.jsdelivr.net/npm/${selectedLibrary.name}@${selectedVersion}/${cleanSrc}`;
                              }
                            }
                            return (
                              <img
                                src={fixedSrc}
                                alt={alt || ''}
                                width={width}
                                style={{ maxWidth: width ? `${width}px` : '100%' }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            );
                          },
                          a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer">
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {selectedLibrary.readme}
                      </ReactMarkdown>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>{texts.noReadme}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="speed" className="mt-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-semibold">{texts.speedTest}</h3>
                    <p className="text-sm text-muted-foreground">{texts.speedTestDesc}</p>
                  </div>
                  <Button onClick={runSpeedTest} disabled={isTestingSpeed}>
                    {isTestingSpeed ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{texts.testing}</>
                    ) : (
                      <><Zap className="h-4 w-4 mr-2" />{texts.runTest}</>
                    )}
                  </Button>
                </div>

                {speedTestStats && (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <Trophy className="h-5 w-5 text-emerald-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-emerald-600">{speedTestStats.fastest?.time || '-'}ms</div>
                      <div className="text-xs text-muted-foreground">{texts.fastest}</div>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <Timer className="h-5 w-5 text-blue-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-blue-600">{speedTestStats.average || '-'}ms</div>
                      <div className="text-xs text-muted-foreground">{texts.average}</div>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                      <Activity className="h-5 w-5 text-orange-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-orange-600">{speedTestStats.slowest?.time || '-'}ms</div>
                      <div className="text-xs text-muted-foreground">{texts.slowest}</div>
                    </div>
                  </div>
                )}

                {speedTestResults.length > 0 && (
                  <div className="space-y-2">
                    {speedTestResults.map((r, i) => (
                      <div key={i} className={`flex items-center justify-between p-4 rounded-xl border ${i === 0 && r.status === 'success' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-muted/30'}`}>
                        <div className="flex items-center gap-3">
                          {i === 0 && r.status === 'success' && <Star className="h-4 w-4 text-emerald-500" />}
                          <span className="font-medium">{r.provider}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`font-mono font-bold ${getSpeedColor(r.time, r.status)}`}>
                            {r.status === 'success' ? `${r.time}ms` : '-'}
                          </span>
                          {r.status === 'success' ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                              <Check className="h-3 w-3 mr-1" /> OK
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/20">
                              <X className="h-3 w-3 mr-1" /> Failed
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {speedTestResults.length === 0 && !isTestingSpeed && (
                  <div className="py-12 text-center text-muted-foreground">
                    <Zap className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>Click "Run Test" to compare CDN speeds</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{texts.title}</h1>
          <p className="text-muted-foreground">{texts.subtitle}</p>
        </div>

        {/* Search */}
        {!selectedLibrary && (
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={texts.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              className="pl-12 h-14 text-lg rounded-xl border-2 focus:border-primary"
            />
            {isSearching && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
            )}
            <SearchDropdown />
          </div>
        )}

        {/* Content */}
        {isLoadingLibrary ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : selectedLibrary ? (
          <LibraryDetail />
        ) : (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              {texts.popularLibraries}
            </h2>
            <PopularGrid />
          </div>
        )}
      </div>

      {showResults && (
        <div className="fixed inset-0 z-40" onClick={() => setShowResults(false)} />
      )}
    </DashboardLayout>
  );
}
