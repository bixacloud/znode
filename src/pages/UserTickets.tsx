import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Ticket,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Search,
  Filter,
  User,
  Server,
  Send,
  ArrowLeft,
  Plus,
  ChevronDown,
  Inbox,
  MailOpen,
  CheckCheck,
  Headphones,
  Lock,
  LockOpen,
  Star,
  Shield,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import RichTextEditor from "@/components/RichTextEditor";
import { HtmlContentWithImages } from "@/components/ImageLightbox";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useUserTicketNotifications } from "@/hooks/useTicketNotifications";
import { cn, formatSuspendReason, isSuspendedByAdmin } from "@/lib/utils";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface SupportUser {
  id: string;
  name: string | null;
  email: string;
  role?: string;
  adminSignature?: string | null;
}

interface Reply {
  id: string;
  message: string;
  isSupport: boolean;
  createdAt: string;
  rating?: number | null;
  ratingComment?: string | null;
  ratedAt?: string | null;
  supportUser?: SupportUser | null;
}

interface Hosting {
  id: string;
  domain: string;
  vpUsername: string;
  status: string;
  suspendReason?: string | null;
}

interface SSLCertificate {
  id: string;
  domain: string;
  status: string;
  provider: string;
}

interface KBArticle {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  category?: {
    name: string;
    slug: string;
  };
}

interface TicketData {
  id: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'REPLIED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  hosting: {
    domain: string;
    vpUsername: string;
    status: string;
    suspendReason?: string | null;
  } | null;
  replies: Reply[];
}

const UserTickets = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(false);
  
  // Enable notifications for new admin replies
  useUserTicketNotifications(true, 30000);
  
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    searchParams.get("id")
  );
  const [replyMessage, setReplyMessage] = useState("");
  const [hoveredRating, setHoveredRating] = useState<{replyId: string; star: number} | null>(null);
  const [ratingDialog, setRatingDialog] = useState<{replyId: string; rating: number} | null>(null);
  const [ratingComment, setRatingComment] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: "",
    message: "",
    serviceId: "",
  });
  const [showKBSuggestions, setShowKBSuggestions] = useState(false);
  const [kbSearchQuery, setKbSearchQuery] = useState("");

  // Debounced KB search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (newTicket.subject.length >= 3) {
        setKbSearchQuery(newTicket.subject);
        setShowKBSuggestions(true);
      } else {
        setKbSearchQuery("");
        setShowKBSuggestions(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [newTicket.subject]);

  // Update URL when ticket is selected
  useEffect(() => {
    if (selectedTicketId) {
      setSearchParams({ id: selectedTicketId });
    } else {
      setSearchParams({});
    }
  }, [selectedTicketId, setSearchParams]);

  // Fetch KB suggestions
  const { data: kbSuggestions, isLoading: isLoadingKB } = useQuery({
    queryKey: ["kb-suggestions", kbSearchQuery, language],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/api/kb/search?q=${encodeURIComponent(kbSearchQuery)}&lang=${language}`
      );
      if (!response.ok) return [];
      return response.json();
    },
    enabled: kbSearchQuery.length >= 3,
  });

  // Fetch user's hostings for dropdown
  const { data: hostingsData } = useQuery({
    queryKey: ["user-hostings"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/hosting`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch hostings");
      return response.json();
    },
  });

  // Fetch user's SSL certificates
  const { data: sslData } = useQuery({
    queryKey: ["user-ssl-certificates"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/ssl/certificates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return { certificates: [] };
      return response.json();
    },
  });

  const hostings: Hosting[] = hostingsData?.hostings || [];
  const sslCertificates: SSLCertificate[] = sslData?.certificates || [];

  // Parse serviceId to get type and actual id
  const parseServiceId = (value: string) => {
    if (!value || value === "none") return { type: null, id: null };
    const [type, id] = value.split(":");
    return { type, id };
  };

  // Fetch tickets list
  const { data: listData, isLoading: listLoading, refetch: refetchList } = useQuery({
    queryKey: ["user-tickets", page, status, search],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (status !== "all") {
        params.set("status", status);
      }
      if (search) {
        params.set("search", search);
      }
      
      const response = await fetch(`${API_URL}/api/tickets?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch tickets");
      return response.json();
    },
  });

  const tickets: TicketData[] = listData?.tickets || [];
  const pagination = listData?.pagination;

  // Calculate stats
  const stats = {
    open: tickets.filter(t => t.status === 'OPEN').length,
    replied: tickets.filter(t => t.status === 'REPLIED').length,
    closed: tickets.filter(t => t.status === 'CLOSED').length,
    total: tickets.length,
  };

  // Fetch selected ticket details
  const { data: ticketData, isLoading: ticketLoading, refetch: refetchTicket } = useQuery({
    queryKey: ["user-ticket-detail", selectedTicketId],
    queryFn: async () => {
      if (!selectedTicketId) return null;
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/tickets/${selectedTicketId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch ticket");
      return response.json();
    },
    enabled: !!selectedTicketId,
  });

  const selectedTicket: TicketData | null = ticketData?.ticket || null;

  // Scroll to bottom only when user sends a reply (not on initial load)
  useEffect(() => {
    if (shouldScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      shouldScrollRef.current = false;
    }
  }, [selectedTicket?.replies]);

  // Create ticket mutation
  const createMutation = useMutation({
    mutationFn: async (data: { subject: string; message: string; hostingId?: string; sslId?: string }) => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/tickets`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to create ticket");
      return result;
    },
    onSuccess: (data) => {
      setIsDialogOpen(false);
      setNewTicket({ subject: "", message: "", serviceId: "" });
      setShowKBSuggestions(false);
      refetchList();
      setSelectedTicketId(data.ticket.id);
      toast({
        title: t.tickets?.ticketCreated || "Ticket Created",
        description: t.tickets?.ticketCreatedDesc || "Your support ticket has been created",
      });
    },
    onError: (error: Error) => {
      toast({
        title: t.messages?.error || "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: async (message: string) => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/tickets/${selectedTicketId}/reply`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to send reply");
      return result;
    },
    onSuccess: () => {
      setReplyMessage("");
      refetchTicket();
      refetchList();
      toast({
        title: t.tickets?.replySent || "Reply Sent",
        description: t.tickets?.replyAddedToTicket || "Your reply has been added",
      });
    },
    onError: (error: Error) => {
      toast({
        title: t.messages?.error || "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Close ticket mutation
  const closeMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/tickets/${selectedTicketId}/close`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to close ticket");
      return result;
    },
    onSuccess: () => {
      refetchTicket();
      refetchList();
      toast({
        title: t.tickets?.ticketClosed || "Ticket Closed",
        description: t.tickets?.ticketClosedDesc || "The ticket has been closed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: t.messages?.error || "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reopen ticket mutation
  const reopenMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/tickets/${selectedTicketId}/reopen`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to reopen ticket");
      return result;
    },
    onSuccess: () => {
      refetchTicket();
      refetchList();
      toast({
        title: t.tickets?.ticketReopened || "Ticket Reopened",
        description: t.tickets?.ticketReopenedDesc || "The ticket has been reopened",
      });
    },
    onError: (error: Error) => {
      toast({
        title: t.messages?.error || "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Rate reply mutation
  const rateMutation = useMutation({
    mutationFn: async ({ replyId, rating, comment }: { replyId: string; rating: number; comment?: string }) => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/tickets/reply/${replyId}/rate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rating, comment }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to submit rating");
      return result;
    },
    onSuccess: () => {
      refetchTicket();
      setRatingDialog(null);
      setRatingComment("");
      toast({
        title: t.tickets?.ratingSubmitted || "Rating Submitted",
        description: t.tickets?.thankYouForRating || "Thank you for your feedback!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: t.messages?.error || "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.subject.trim() || !newTicket.message.trim()) {
      toast({
        title: t.messages?.error || "Error",
        description: t.tickets?.fillAllFields || "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }
    
    const { type, id } = parseServiceId(newTicket.serviceId);
    
    createMutation.mutate({
      subject: newTicket.subject,
      message: newTicket.message,
      hostingId: type === "hosting" ? id || undefined : undefined,
      sslId: type === "ssl" ? id || undefined : undefined,
    });
  };

  const handleSendReply = () => {
    const plainText = replyMessage.replace(/<[^>]*>/g, '').trim();
    if (!plainText) {
      toast({
        title: t.messages?.error || "Error",
        description: t.tickets?.enterMessage || "Please enter a message",
        variant: "destructive",
      });
      return;
    }
    shouldScrollRef.current = true;
    replyMutation.mutate(replyMessage);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "OPEN":
        return {
          label: t.tickets?.open || "Open",
          icon: AlertCircle,
          className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        };
      case "REPLIED":
        return {
          label: t.tickets?.replied || "Replied",
          icon: MessageSquare,
          className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
        };
      case "CLOSED":
        return {
          label: t.tickets?.closed || "Closed",
          icon: CheckCircle,
          className: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
        };
      default:
        return {
          label: status,
          icon: Clock,
          className: "bg-gray-500/10 text-gray-500 border-gray-500/20",
        };
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diff = Math.floor((now.getTime() - past.getTime()) / 1000);
    
    if (diff < 60) return t.common?.justNow || "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} ${t.common?.minutesAgo || "min ago"}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ${t.common?.hoursAgo || "hours ago"}`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} ${t.common?.daysAgo || "days ago"}`;
    return past.toLocaleDateString('vi-VN');
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-2rem)] md:h-screen flex flex-col -m-4 md:-m-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              {t.support?.title || "Support"}
            </h1>
            
            {/* Quick Stats */}
            <div className="hidden md:flex items-center gap-2">
              <Badge variant="outline" className="gap-1.5 bg-blue-500/10 text-blue-600 border-blue-500/20">
                <Inbox className="w-3 h-3" />
                {stats.open} {t.tickets?.open || "Open"}
              </Badge>
              <Badge variant="outline" className="gap-1.5 bg-green-500/10 text-green-600 border-green-500/20">
                <MailOpen className="w-3 h-3" />
                {stats.replied} {t.tickets?.replied || "Replied"}
              </Badge>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t.common?.search || "Search..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-48"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="w-4 h-4" />
                  {status === "all" ? t.tickets?.all || "All" : getStatusConfig(status).label}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setStatus("all")}>
                  <CheckCheck className="w-4 h-4 mr-2" />
                  {t.tickets?.allTickets || "All Tickets"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatus("OPEN")}>
                  <AlertCircle className="w-4 h-4 mr-2 text-blue-500" />
                  {t.tickets?.open || "Open"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatus("REPLIED")}>
                  <MessageSquare className="w-4 h-4 mr-2 text-green-500" />
                  {t.tickets?.replied || "Replied"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatus("CLOSED")}>
                  <CheckCircle className="w-4 h-4 mr-2 text-gray-500" />
                  {t.tickets?.closed || "Closed"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  {t.support?.createTicket || "New Ticket"}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t.support?.createSupportTicket || "Create Support Ticket"}</DialogTitle>
                  <DialogDescription>
                    {t.support?.ticketDescription || "Describe your issue and we'll help you as soon as possible."}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTicket} className="space-y-4 mt-4">
                  {/* Subject with KB suggestions */}
                  <div className="space-y-2">
                    <Label htmlFor="subject">{t.support?.subject || "Subject"}</Label>
                    <div className="relative">
                      <Input
                        id="subject"
                        placeholder={t.support?.subjectPlaceholder || "Brief description of your issue"}
                        value={newTicket.subject}
                        onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                        onFocus={() => newTicket.subject.length >= 3 && setShowKBSuggestions(true)}
                        required
                      />
                      {isLoadingKB && newTicket.subject.length >= 3 && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    {/* KB Suggestions */}
                    {showKBSuggestions && kbSuggestions && kbSuggestions.length > 0 && (
                      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-primary">
                          <BookOpen className="w-4 h-4" />
                          {t.tickets?.relatedArticles || "Related articles that may help"}
                        </div>
                        <div className="space-y-1.5">
                          {kbSuggestions.slice(0, 3).map((article: KBArticle) => (
                            <Link
                              key={article.id}
                              to={`/kb/${article.category?.slug}/${article.slug}`}
                              target="_blank"
                              className="flex items-start gap-2 p-2 rounded-md bg-background hover:bg-muted transition-colors group text-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Search className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium group-hover:text-primary transition-colors line-clamp-1">
                                  {article.title}
                                </p>
                                {article.excerpt && (
                                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                    {article.excerpt}
                                  </p>
                                )}
                              </div>
                              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                            </Link>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t.tickets?.kbSuggestionHint || "Check if any of these articles answer your question"}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Related Service dropdown */}
                  {(hostings.length > 0 || sslCertificates.length > 0) && (
                    <div className="space-y-2">
                      <Label htmlFor="service">{t.tickets?.relatedService || "Related Service"} ({t.common?.optional || "Optional"})</Label>
                      <Select
                        value={newTicket.serviceId}
                        onValueChange={(value) => setNewTicket({ ...newTicket, serviceId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t.tickets?.selectService || "Select a service"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            {t.tickets?.noRelatedService || "General inquiry (no related service)"}
                          </SelectItem>
                          
                          {/* Hosting accounts */}
                          {hostings.length > 0 && (
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              {t.nav?.hostingAccounts || "Hosting Accounts"}
                            </div>
                          )}
                          {hostings.map((hosting) => (
                            <SelectItem key={hosting.id} value={`hosting:${hosting.id}`}>
                              <div className="flex items-center gap-2">
                                <Server className="w-4 h-4 text-muted-foreground" />
                                <span>{hosting.domain}</span>
                                <span className="text-muted-foreground text-xs">({hosting.vpUsername})</span>
                                {hosting.status === 'SUSPENDED' && (
                                  <Badge variant="destructive" className="text-[10px] h-4">
                                    {isSuspendedByAdmin(hosting.suspendReason) 
                                      ? (t.hosting?.adminSuspended || "Admin Suspended")
                                      : (t.hosting?.suspended || "Suspended")}
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                          
                          {/* SSL certificates */}
                          {sslCertificates.length > 0 && (
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">
                              {t.nav?.ssl || "SSL Certificates"}
                            </div>
                          )}
                          {sslCertificates.map((ssl) => (
                            <SelectItem key={ssl.id} value={`ssl:${ssl.id}`}>
                              <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-muted-foreground" />
                                <span>{ssl.domain}</span>
                                <span className="text-muted-foreground text-xs">({ssl.provider})</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label>{t.support?.message || "Message"}</Label>
                    <RichTextEditor
                      value={newTicket.message}
                      onChange={(value) => setNewTicket({ ...newTicket, message: value })}
                      placeholder={t.support?.messagePlaceholder || "Describe your issue in detail..."}
                      minHeight={200}
                      simple
                    />
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      {t.common?.cancel || "Cancel"}
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      {t.support?.submitTicket || "Submit Ticket"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Main Content - Split View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Ticket List - Left Panel */}
          <div className={cn(
            "w-full md:w-[400px] lg:w-[450px] border-r border-border flex flex-col bg-background overflow-hidden",
            selectedTicketId && "hidden md:flex"
          )}>
            {listLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <Ticket className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {t.support?.noTickets || "No tickets yet"}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {t.support?.createFirstTicket || "Create your first support ticket to get help"}
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t.support?.createTicket || "New Ticket"}
                </Button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {tickets.map((ticket) => {
                  const statusConfig = getStatusConfig(ticket.status);
                  const isSelected = selectedTicketId === ticket.id;
                  
                  return (
                    <div
                      key={ticket.id}
                      className={cn(
                        "px-4 py-3 border-b border-border cursor-pointer transition-all hover:bg-muted/50",
                        isSelected && "bg-primary/5 border-l-2 border-l-primary"
                      )}
                      onClick={() => setSelectedTicketId(ticket.id)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                          ticket.status === 'OPEN' ? "bg-blue-500/10 text-blue-600" :
                          ticket.status === 'REPLIED' ? "bg-green-500/10 text-green-600" :
                          "bg-gray-500/10 text-gray-600"
                        )}>
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Subject */}
                          <h3 className="font-medium text-foreground truncate leading-tight">
                            {ticket.subject}
                            <span className="text-primary ml-2 text-sm">#{ticket.id.slice(-4)}</span>
                          </h3>
                          
                          {/* Meta */}
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5", statusConfig.className)}>
                              {statusConfig.label}
                            </Badge>
                            {ticket.hosting && (
                              <>
                                <span className="truncate max-w-[100px]">{ticket.hosting.domain}</span>
                                <span>•</span>
                              </>
                            )}
                            <span>{formatTimeAgo(ticket.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Load More */}
                {pagination && pagination.totalPages > 1 && page < pagination.totalPages && (
                  <div className="p-4">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setPage(p => p + 1)}
                    >
                      {t.common?.loadMore || "Load More"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ticket Detail - Right Panel */}
          <div className={cn(
            "flex-1 flex flex-col bg-muted/30 overflow-hidden",
            !selectedTicketId && "hidden md:flex"
          )}>
            {!selectedTicketId ? (
              /* Empty State */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-32 h-32 mb-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Headphones className="w-16 h-16 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {t.support?.welcome || "Welcome to Support!"}
                </h2>
                <p className="text-muted-foreground mb-4">
                  {t.support?.selectTicket || "Select a ticket to view the conversation"}
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  {t.support?.selectFromList || "Select a ticket from the list"}
                </p>
              </div>
            ) : ticketLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : selectedTicket ? (
              <>
                {/* Mobile Back Button */}
                <div className="md:hidden flex items-center gap-3 p-4 border-b border-border bg-card">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setSelectedTicketId(null)}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-medium truncate">{selectedTicket.subject}</h2>
                    <Badge variant="outline" className={cn("text-xs", getStatusConfig(selectedTicket.status).className)}>
                      {getStatusConfig(selectedTicket.status).label}
                    </Badge>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {/* Original Message */}
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{t.support?.you || "You"}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(selectedTicket.createdAt)}
                        </span>
                      </div>
                      <div className="rounded-lg bg-card border border-border p-4">
                        <h3 className="font-medium mb-2">{selectedTicket.subject}</h3>
                        {selectedTicket.hosting && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 p-2 bg-muted rounded">
                            <Server className="w-3 h-3" />
                            <span>{selectedTicket.hosting.domain}</span>
                            {selectedTicket.hosting.status === 'SUSPENDED' && (
                              <Badge variant="destructive" className="text-[10px] h-4">
                                {isSuspendedByAdmin(selectedTicket.hosting.suspendReason)
                                  ? (t.hosting?.adminSuspended || "Admin Suspended")
                                  : (t.hosting?.suspended || "Suspended")}
                              </Badge>
                            )}
                            {selectedTicket.hosting.status === 'ACTIVE' && (
                              <Badge variant="secondary" className="text-[10px] h-4 bg-green-500/10 text-green-600">
                                {t.hosting?.active || "Active"}
                              </Badge>
                            )}
                          </div>
                        )}
                        <HtmlContentWithImages 
                          html={selectedTicket.message}
                          className="prose-content"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Replies */}
                  {selectedTicket.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0",
                        reply.isSupport ? "bg-green-600" : "bg-primary"
                      )}>
                        <User className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={cn(
                            "font-medium text-sm",
                            reply.isSupport && reply.supportUser?.role === 'ADMIN' && "text-red-500 dark:text-red-400",
                            reply.isSupport && reply.supportUser?.role === 'SUPPORT' && "text-blue-500 dark:text-blue-400"
                          )}>
                            {reply.isSupport 
                              ? (reply.supportUser?.name || reply.supportUser?.email?.split('@')[0] || t.support?.supportTeam || "Support Team") 
                              : (t.support?.you || "You")}
                          </span>
                          {reply.isSupport && (
                            <Badge 
                              variant="secondary" 
                              className={cn(
                                "text-[10px] h-5",
                                reply.supportUser?.role === 'ADMIN' && "bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20",
                                reply.supportUser?.role === 'SUPPORT' && "bg-blue-500/10 text-blue-500 dark:text-blue-400 border-blue-500/20"
                              )}
                            >
                              {reply.supportUser?.role === 'ADMIN' ? 'Admin' : 'Staff'}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDate(reply.createdAt)}
                          </span>
                          {/* Rating Stars for support replies */}
                          {reply.isSupport && (
                            <div className="flex items-center gap-1 ml-auto">
                              {reply.rating ? (
                                // Show rated stars (read-only)
                                <div className="flex items-center gap-0.5" title={reply.ratingComment || (t.tickets?.rated || "Rated")}>
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={cn(
                                        "w-4 h-4",
                                        star <= reply.rating!
                                          ? "fill-yellow-400 text-yellow-400"
                                          : "text-gray-300 dark:text-gray-600"
                                      )}
                                    />
                                  ))}
                                </div>
                              ) : (
                                // Show clickable stars for rating
                                <div 
                                  className="flex items-center gap-0.5"
                                  title={t.tickets?.rateThisReply || "Rate this reply"}
                                  onMouseLeave={() => setHoveredRating(null)}
                                >
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      onClick={() => setRatingDialog({ replyId: reply.id, rating: star })}
                                      onMouseEnter={() => setHoveredRating({ replyId: reply.id, star })}
                                      disabled={rateMutation.isPending}
                                      className="hover:scale-110 transition-transform disabled:opacity-50"
                                    >
                                      <Star
                                        className={cn(
                                          "w-4 h-4 transition-colors",
                                          hoveredRating?.replyId === reply.id && star <= hoveredRating.star
                                            ? "fill-yellow-400 text-yellow-400"
                                            : "text-gray-300 dark:text-gray-600"
                                        )}
                                      />
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className={cn(
                          "rounded-lg p-4",
                          reply.isSupport 
                            ? "bg-green-500/5 border border-green-500/20" 
                            : "bg-card border border-border"
                        )}>
                          <HtmlContentWithImages 
                            html={reply.message}
                            className="prose-content"
                          />
                          {reply.isSupport && reply.supportUser?.adminSignature && (
                            <div className="mt-4 pt-3 border-t border-border/50 text-right">
                              <HtmlContentWithImages 
                                html={reply.supportUser.adminSignature}
                                className="prose-content inline-block"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply Box */}
                {selectedTicket.status !== 'CLOSED' ? (
                  <div className="p-4 border-t border-border bg-card">
                    <RichTextEditor
                      value={replyMessage}
                      onChange={setReplyMessage}
                      placeholder={t.tickets?.writeReply || "Write your reply..."}
                      minHeight={120}
                      simple
                    />
                    <div className="flex justify-between mt-3">
                      <Button
                        variant="outline"
                        onClick={() => closeMutation.mutate()}
                        disabled={closeMutation.isPending}
                        className="border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 dark:border-red-500/50 dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white"
                      >
                        {closeMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Lock className="w-4 h-4 mr-2" />
                        )}
                        {t.tickets?.closeTicket || "Close Ticket"}
                      </Button>
                      <Button
                        onClick={handleSendReply}
                        disabled={replyMutation.isPending}
                      >
                        {replyMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        {t.tickets?.sendReply || "Send Reply"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border-t border-border bg-muted/50">
                    <div className="flex items-center justify-between">
                      <p className="text-muted-foreground text-sm">
                        {t.tickets?.ticketClosed || "This ticket has been closed"}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => reopenMutation.mutate()}
                        disabled={reopenMutation.isPending}
                      >
                        {reopenMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <LockOpen className="w-4 h-4 mr-2" />
                        )}
                        {t.tickets?.reopenTicket || "Reopen"}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Rating Dialog */}
      <Dialog open={!!ratingDialog} onOpenChange={(open) => !open && setRatingDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              {t.tickets?.rateSupport || "Rate Support"}
            </DialogTitle>
            <DialogDescription>
              {t.tickets?.rateDescription || "How would you rate this support response?"}
            </DialogDescription>
          </DialogHeader>
          
          {/* Star display */}
          <div className="flex items-center justify-center gap-1 py-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRatingDialog(prev => prev ? {...prev, rating: star} : null)}
                className="hover:scale-110 transition-transform"
              >
                <Star
                  className={cn(
                    "w-8 h-8 transition-colors",
                    ratingDialog && star <= ratingDialog.rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300 dark:text-gray-600"
                  )}
                />
              </button>
            ))}
          </div>
          
          {/* Optional comment */}
          <div className="space-y-2">
            <Label htmlFor="rating-comment">
              {t.tickets?.feedbackComment || "Feedback (optional)"}
            </Label>
            <Textarea
              id="rating-comment"
              placeholder={t.tickets?.feedbackPlaceholder || "Tell us more about your experience..."}
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              rows={3}
            />
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setRatingDialog(null);
                setRatingComment("");
              }}
            >
              {t.common?.cancel || "Cancel"}
            </Button>
            <Button
              onClick={() => {
                if (ratingDialog) {
                  rateMutation.mutate({
                    replyId: ratingDialog.replyId,
                    rating: ratingDialog.rating,
                    comment: ratingComment || undefined,
                  });
                }
              }}
              disabled={rateMutation.isPending}
            >
              {rateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Star className="w-4 h-4 mr-2" />
              )}
              {t.tickets?.submitRating || "Submit Rating"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default UserTickets;
