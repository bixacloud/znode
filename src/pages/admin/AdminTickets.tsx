import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  Lock,
  Unlock,
  Mail,
  ExternalLink,
  ChevronDown,
  Inbox,
  MailOpen,
  CheckCheck,
  Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AdminLayout from "@/components/admin/AdminLayout";
import RichTextEditor from "@/components/RichTextEditor";
import { HtmlContentWithImages } from "@/components/ImageLightbox";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";
import { useToast } from "@/hooks/use-toast";
import { useAdminTicketNotifications } from "@/hooks/useTicketNotifications";
import { cn, isSuspendedByAdmin } from "@/lib/utils";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface SupportUser {
  id: string;
  name: string | null;
  email: string;
  adminSignature?: string | null;
}

interface Reply {
  id: string;
  message: string;
  isSupport: boolean;
  createdAt: string;
  supportUser?: SupportUser | null;
}

interface TicketData {
  id: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'REPLIED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatar: string | null;
  };
  hosting: {
    domain: string;
    vpUsername: string;
    status: string;
    suspendReason: string | null;
  } | null;
  replies: Reply[];
  _count?: {
    replies: number;
  };
}

interface TicketStats {
  open: number;
  replied: number;
  closed: number;
  total: number;
}

const AdminTickets = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useLanguage();
  usePageTitle(t.admin?.tickets || 'Tickets');
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(false);
  
  // Enable notifications for new user tickets
  useAdminTicketNotifications(true, 30000);
  
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    searchParams.get("id")
  );
  const [replyMessage, setReplyMessage] = useState("");

  // Update URL when ticket is selected
  useEffect(() => {
    if (selectedTicketId) {
      setSearchParams({ id: selectedTicketId });
    } else {
      setSearchParams({});
    }
  }, [selectedTicketId, setSearchParams]);

  // Fetch ticket stats
  const { data: statsData } = useQuery({
    queryKey: ["admin-ticket-stats"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/tickets/admin/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  const stats: TicketStats = statsData || { open: 0, replied: 0, closed: 0, total: 0 };

  // Fetch tickets list
  const { data: listData, isLoading: listLoading, refetch: refetchList } = useQuery({
    queryKey: ["admin-tickets", page, status, search],
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
      
      const response = await fetch(`${API_URL}/api/tickets/admin/all?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch tickets");
      return response.json();
    },
  });

  const tickets: TicketData[] = listData?.tickets || [];
  const pagination = listData?.pagination;

  // Fetch selected ticket details
  const { data: ticketData, isLoading: ticketLoading, refetch: refetchTicket } = useQuery({
    queryKey: ["admin-ticket-detail", selectedTicketId],
    queryFn: async () => {
      if (!selectedTicketId) return null;
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/tickets/admin/${selectedTicketId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: async (message: string) => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/tickets/admin/${selectedTicketId}/reply`, {
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
        description: t.admin?.replyAddedToTicket || "Reply has been added to the ticket",
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
      const response = await fetch(`${API_URL}/api/tickets/admin/${selectedTicketId}/close`, {
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
        description: t.admin?.ticketClosedDesc || "The ticket has been closed",
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
      const response = await fetch(`${API_URL}/api/tickets/admin/${selectedTicketId}/reopen`, {
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
        description: t.admin?.ticketReopenedDesc || "The ticket has been reopened",
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
          badgeClass: "bg-blue-500 text-white",
        };
      case "REPLIED":
        return {
          label: t.tickets?.replied || "Replied",
          icon: MessageSquare,
          className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
          badgeClass: "bg-amber-500 text-white",
        };
      case "CLOSED":
        return {
          label: t.tickets?.closed || "Closed",
          icon: CheckCircle,
          className: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
          badgeClass: "bg-gray-500 text-white",
        };
      default:
        return {
          label: status,
          icon: Clock,
          className: "bg-gray-500/10 text-gray-500 border-gray-500/20",
          badgeClass: "bg-gray-500 text-white",
        };
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diff = Math.floor((now.getTime() - past.getTime()) / 1000);
    
    if (diff < 60) return "Vừa xong";
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
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

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const getAvatarColor = (str: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
      'bg-yellow-500', 'bg-red-500', 'bg-indigo-500', 'bg-teal-500',
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const isOverdue = (date: string) => {
    const now = new Date();
    const created = new Date(date);
    const diff = now.getTime() - created.getTime();
    return diff > 3 * 24 * 60 * 60 * 1000; // 3 days
  };

  const needsResponse = (ticket: TicketData) => {
    if (ticket.status === 'CLOSED') return false;
    if (ticket.status === 'OPEN') return true;
    return false;
  };

  return (
    <AdminLayout defaultCollapsed>
      <div className="h-[calc(100vh-2rem)] md:h-screen flex flex-col -m-4 md:-m-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              {t.admin?.supportTickets || "Support Tickets"}
            </h1>
            
            {/* Quick Stats */}
            <div className="hidden md:flex items-center gap-2">
              <Badge variant="outline" className="gap-1.5 bg-blue-500/10 text-blue-600 border-blue-500/20">
                <Inbox className="w-3 h-3" />
                {stats.open} {t.tickets?.open || "Open"}
              </Badge>
              <Badge variant="outline" className="gap-1.5 bg-amber-500/10 text-amber-600 border-amber-500/20">
                <MailOpen className="w-3 h-3" />
                {stats.replied} {t.tickets?.waitingReply || "Waiting"}
              </Badge>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t.admin?.searchTickets || "Search..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-48"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="w-4 h-4" />
                  {status === "all" ? "All" : getStatusConfig(status).label}
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
                  <MessageSquare className="w-4 h-4 mr-2 text-amber-500" />
                  {t.tickets?.replied || "Replied"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatus("CLOSED")}>
                  <CheckCircle className="w-4 h-4 mr-2 text-gray-500" />
                  {t.tickets?.closed || "Closed"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                  {t.admin?.noTickets || "No tickets found"}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {search || status !== "all" 
                    ? (t.admin?.tryDifferentFilters || "Try different filters")
                    : (t.admin?.noTicketsYet || "No support tickets yet")}
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {tickets.map((ticket) => {
                  const statusConfig = getStatusConfig(ticket.status);
                  const isSelected = selectedTicketId === ticket.id;
                  const overdue = isOverdue(ticket.createdAt) && ticket.status !== 'CLOSED';
                  const customerWaiting = needsResponse(ticket);
                  
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
                        {/* Avatar */}
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0",
                          getAvatarColor(ticket.user.email)
                        )}>
                          {getInitials(ticket.user.name, ticket.user.email)}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Subject with Close/Reopen button */}
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-foreground truncate leading-tight flex-1">
                              {ticket.subject}
                              <span className="text-primary ml-2 text-sm">#{ticket.id.slice(-4)}</span>
                            </h3>
                            {isSelected && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (ticket.status === 'CLOSED') {
                                    reopenMutation.mutate();
                                  } else {
                                    closeMutation.mutate();
                                  }
                                }}
                                className={cn(
                                  "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors flex-shrink-0",
                                  ticket.status === 'CLOSED'
                                    ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                                    : "bg-gray-500/10 text-gray-600 hover:bg-gray-500/20"
                                )}
                              >
                                {ticket.status === 'CLOSED' ? (
                                  <>
                                    <Unlock className="w-3 h-3" />
                                    Reopen
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3 h-3" />
                                    Close
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                          
                          {/* Meta */}
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5", getStatusConfig(ticket.status).className)}>
                              {getStatusConfig(ticket.status).label}
                            </Badge>
                            <span className="truncate max-w-[100px]">
                              {ticket.user.name || ticket.user.email.split('@')[0]}
                            </span>
                            {ticket.hosting && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[80px]">{ticket.hosting.domain}</span>
                                {ticket.hosting.status === 'SUSPENDED' && (
                                  <Badge variant="destructive" className="text-[10px] h-4 px-1">
                                    {isSuspendedByAdmin(ticket.hosting.suspendReason) ? "Admin" : "User"}
                                  </Badge>
                                )}
                              </>
                            )}
                            <span>•</span>
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
                      Load More
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
                  {t.support?.heyAdmin || "Support Center"}
                </h2>
                <p className="text-muted-foreground mb-4">
                  {t.support?.adminWelcome || "Ready to help users"}
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  {t.support?.adminSelectTicket || "Select a ticket to start responding"}
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
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0",
                      getAvatarColor(selectedTicket.user.email)
                    )}>
                      {getInitials(selectedTicket.user.name, selectedTicket.user.email)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {selectedTicket.user.name || selectedTicket.user.email.split('@')[0]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(selectedTicket.createdAt)}
                        </span>
                      </div>
                      <div className="rounded-lg bg-card border border-border p-4">
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
                        reply.isSupport 
                          ? "bg-primary" 
                          : getAvatarColor(selectedTicket.user.email)
                      )}>
                        {reply.isSupport ? (
                          <User className="w-5 h-5" />
                        ) : (
                          getInitials(selectedTicket.user.name, selectedTicket.user.email)
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {reply.isSupport 
                              ? (reply.supportUser?.name || reply.supportUser?.email?.split('@')[0] || "Support Team") 
                              : (selectedTicket.user.name || selectedTicket.user.email.split('@')[0])}
                          </span>
                          {reply.isSupport && (
                            <Badge variant="secondary" className="text-[10px] h-5">Staff</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDate(reply.createdAt)}
                          </span>
                        </div>
                        <div className={cn(
                          "rounded-lg p-4",
                          reply.isSupport 
                            ? "bg-primary/5 border border-primary/20" 
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
                  <div className="p-4 border-t border-border bg-muted/50 flex items-center justify-between">
                    <p className="text-muted-foreground text-sm">
                      {t.tickets?.ticketClosed || "This ticket has been closed"}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => reopenMutation.mutate()}
                      disabled={reopenMutation.isPending}
                      className="border-green-500/50 text-green-500 hover:bg-green-500 hover:text-white hover:border-green-500 dark:border-green-500/50 dark:text-green-400 dark:hover:bg-green-500 dark:hover:text-white"
                    >
                      {reopenMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Unlock className="w-4 h-4 mr-2" />
                      )}
                      {t.tickets?.reopenTicket || "Reopen Ticket"}
                    </Button>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Quick Access Sidebar - Right Panel */}
          {selectedTicket?.hosting && (
            <div className="hidden xl:flex w-[280px] flex-col border-l border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  {t.admin?.quickAccess || "Quick Access"}
                </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Hosting Info */}
                <div className="space-y-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">{t.admin?.domain || "Domain"}</p>
                    <p className="font-medium text-sm truncate">{selectedTicket.hosting.domain}</p>
                  </div>
                  
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">{t.admin?.username || "Username"}</p>
                    <p className="font-medium text-sm font-mono">{selectedTicket.hosting.vpUsername}</p>
                  </div>
                  
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">{t.admin?.hostingStatus || "Status"}</p>
                    <Badge 
                      variant={selectedTicket.hosting.status === 'ACTIVE' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {selectedTicket.hosting.status}
                    </Badge>
                    {selectedTicket.hosting.status === 'SUSPENDED' && selectedTicket.hosting.suspendReason && (
                      <p className="text-xs text-red-500 mt-1">
                        {isSuspendedByAdmin(selectedTicket.hosting.suspendReason) 
                          ? t.admin?.suspendedByAdmin || "Suspended by Admin" 
                          : t.admin?.suspendedByUser || "User Suspended"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t.admin?.actions || "Actions"}
                  </p>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={() => window.open(`https://cpanel.mofh.win/login.php?user=${selectedTicket.hosting.vpUsername}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                    {t.admin?.loginCPanel || "Login to cPanel"}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={() => window.open(`/admin/hostings/${selectedTicket.hosting?.vpUsername}`, '_blank')}
                  >
                    <Server className="w-4 h-4" />
                    {t.admin?.viewHosting || "View Hosting"}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={() => window.open(`/admin/users?search=${selectedTicket.user.email}`, '_blank')}
                  >
                    <User className="w-4 h-4" />
                    {t.admin?.viewUser || "View User"}
                  </Button>
                </div>

                {/* User Info */}
                <div className="pt-4 border-t border-border space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t.admin?.userInfo || "User Info"}
                  </p>
                  
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm",
                      getAvatarColor(selectedTicket.user.email)
                    )}>
                      {getInitials(selectedTicket.user.name, selectedTicket.user.email)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {selectedTicket.user.name || "No Name"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {selectedTicket.user.email}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminTickets;
