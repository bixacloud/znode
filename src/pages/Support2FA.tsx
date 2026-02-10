import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Shield, ArrowLeft, Loader2, Send, User, MessageSquare,
  AlertCircle, CheckCircle, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import RichTextEditor from "@/components/RichTextEditor";
import { HtmlContentWithImages } from "@/components/ImageLightbox";

const API_URL = import.meta.env.VITE_API_URL || "https://demo.znode.app";

interface TicketReply {
  id: string;
  message: string;
  isSupport: boolean;
  createdAt: string;
  supportUser?: { id: string; name: string; email: string } | null;
}

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  replies: TicketReply[];
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const StatusBadge = ({ status, t }: { status: string; t: any }) => {
  const config: Record<string, { label: string; icon: any; className: string }> = {
    OPEN: {
      label: t.support2fa?.statusOpen || "Open",
      icon: AlertCircle,
      className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
    REPLIED: {
      label: t.support2fa?.statusReplied || "Replied",
      icon: MessageSquare,
      className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    },
    CLOSED: {
      label: t.support2fa?.statusClosed || "Closed",
      icon: CheckCircle,
      className: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
    },
  };
  const c = config[status] || config.OPEN;
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={cn("gap-1", c.className)}>
      <Icon className="w-3 h-3" />
      {c.label}
    </Badge>
  );
};

const Support2FA = () => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [supportToken, setSupportToken] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const { tempToken, email } = (location.state as {
    tempToken?: string;
    email?: string;
  }) || {};

  // Get the active auth token (supportToken from localStorage, or tempToken from navigation state)
  const savedSupportToken = localStorage.getItem('2fa_support_token');
  const savedEmail = localStorage.getItem('2fa_support_email');
  const activeToken = supportToken || savedSupportToken;
  const displayEmail = email || savedEmail || '';

  useEffect(() => {
    // If we have neither tempToken nor saved supportToken, redirect
    if (!tempToken && !savedSupportToken) {
      navigate("/login", { replace: true });
      return;
    }

    // Check for existing open 2FA support ticket on mount
    const checkExisting = async () => {
      try {
        const body: any = {};
        if (savedSupportToken) body.supportToken = savedSupportToken;
        if (tempToken) body.tempToken = tempToken;

        const res = await fetch(`${API_URL}/api/tickets/2fa-support/check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (res.ok && data.ticket) {
          setTicket(data.ticket);
          // Save or update the supportToken for persistent access
          if (data.supportToken) {
            setSupportToken(data.supportToken);
            localStorage.setItem('2fa_support_token', data.supportToken);
            if (email) localStorage.setItem('2fa_support_email', email);
          }
        } else if (!res.ok && savedSupportToken && !tempToken) {
          // supportToken is invalid and we have no tempToken - clear and redirect
          localStorage.removeItem('2fa_support_token');
          localStorage.removeItem('2fa_support_email');
          navigate("/login", { replace: true });
          return;
        }
      } catch {
        // If check fails, just show the form
      } finally {
        setIsChecking(false);
      }
    };
    checkExisting();
  }, [tempToken, navigate]);  // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Poll for ticket updates
  const fetchTicket = useCallback(async (ticketId: string, silent = false) => {
    const token = supportToken || localStorage.getItem('2fa_support_token') || tempToken;
    if (!token) return;
    if (!silent) setIsPolling(true);
    try {
      const body: any = { ticketId };
      // Determine which token type to send
      if (supportToken || localStorage.getItem('2fa_support_token')) {
        body.supportToken = supportToken || localStorage.getItem('2fa_support_token');
      } else {
        body.tempToken = tempToken;
      }

      const res = await fetch(`${API_URL}/api/tickets/2fa-support/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.ticket) {
        setTicket((prev) => {
          const newRepliesCount = data.ticket.replies?.length || 0;
          const oldRepliesCount = prev?.replies?.length || 0;
          if (newRepliesCount > oldRepliesCount) {
            setTimeout(scrollToBottom, 100);
          }
          return data.ticket;
        });
      }
    } catch {
      // silent fail for polling
    } finally {
      if (!silent) setIsPolling(false);
    }
  }, [tempToken, supportToken, scrollToBottom]);

  // Start polling when ticket exists
  useEffect(() => {
    if (ticket?.id && ticket.status !== "CLOSED") {
      pollIntervalRef.current = setInterval(() => {
        fetchTicket(ticket.id, true);
      }, 15000);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [ticket?.id, ticket?.status, fetchTicket]);

  // Scroll to bottom when ticket first loads
  useEffect(() => {
    if (ticket) {
      setTimeout(scrollToBottom, 200);
    }
  }, [ticket?.id, scrollToBottom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast({
        title: t.common?.error || "Error",
        description: t.support2fa?.fillAllFields || "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/tickets/2fa-support`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message, tempToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create ticket");
      setTicket(data.ticket);
      // Save supportToken for persistent access
      if (data.supportToken) {
        setSupportToken(data.supportToken);
        localStorage.setItem('2fa_support_token', data.supportToken);
        if (email) localStorage.setItem('2fa_support_email', email);
      }
      toast({
        title: t.support2fa?.ticketCreated || "Ticket Created",
        description: t.support2fa?.ticketCreatedDesc || "Your support ticket has been submitted.",
      });
    } catch (error: any) {
      toast({
        title: t.common?.error || "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendReply = async () => {
    const token = supportToken || localStorage.getItem('2fa_support_token') || tempToken;
    if (!replyText.trim() || !ticket?.id || !token) return;
    setIsSending(true);
    try {
      const body: any = { ticketId: ticket.id, message: replyText.trim() };
      if (supportToken || localStorage.getItem('2fa_support_token')) {
        body.supportToken = supportToken || localStorage.getItem('2fa_support_token');
      } else {
        body.tempToken = tempToken;
      }

      const res = await fetch(`${API_URL}/api/tickets/2fa-support/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send reply");
      setReplyText("");
      // Refresh ticket to get latest state
      await fetchTicket(ticket.id);
    } catch (error: any) {
      toast({
        title: t.common?.error || "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleBack = () => {
    if (tempToken) {
      navigate("/2fa-verify", {
        state: { tempToken, email },
        replace: true,
      });
    } else {
      navigate("/login", { replace: true });
    }
  };

  if (!tempToken && !activeToken) return null;

  // ─── Loading: checking for existing ticket ───
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {t.support2fa?.checking || "Checking existing tickets..."}
          </p>
        </div>
      </div>
    );
  }

  // ─── Conversation View ───
  if (ticket) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-semibold text-sm md:text-base truncate">
                  {ticket.subject}
                </h1>
                <StatusBadge status={ticket.status} t={t} />
              </div>
              {displayEmail && (
                <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fetchTicket(ticket.id)}
              disabled={isPolling}
              className="shrink-0"
            >
              <RefreshCw className={cn("w-4 h-4", isPolling && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
            {/* Original message */}
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {t.support2fa?.you || "You"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(ticket.createdAt)}
                  </span>
                </div>
                <div className="rounded-lg bg-card border border-border p-3 md:p-4">
                  <HtmlContentWithImages html={ticket.message} className="prose-content text-sm" />
                </div>
              </div>
            </div>

            {/* Replies */}
            {ticket.replies.map((reply) => (
              <div key={reply.id} className="flex gap-3">
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0",
                    reply.isSupport ? "bg-green-600" : "bg-primary"
                  )}
                >
                  <User className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={cn("font-medium text-sm", reply.isSupport && "text-green-600 dark:text-green-400")}>
                      {reply.isSupport
                        ? reply.supportUser?.name || (t.support2fa?.supportTeam || "Support")
                        : t.support2fa?.you || "You"}
                    </span>
                    {reply.isSupport && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                        {t.support2fa?.staff || "Staff"}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDate(reply.createdAt)}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "rounded-lg p-3 md:p-4",
                      reply.isSupport
                        ? "bg-green-500/5 border border-green-500/20"
                        : "bg-card border border-border"
                    )}
                  >
                    <HtmlContentWithImages html={reply.message} className="prose-content text-sm" />
                  </div>
                </div>
              </div>
            ))}

            {/* Waiting indicator when no replies yet */}
            {ticket.replies.length === 0 && ticket.status === "OPEN" && (
              <div className="flex items-center justify-center py-6">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t.support2fa?.waitingReply || "Waiting for support team reply..."}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Reply input */}
        {ticket.status !== "CLOSED" ? (
          <div className="border-t border-border bg-card p-4">
            <div className="max-w-2xl mx-auto">
              <RichTextEditor
                value={replyText}
                onChange={setReplyText}
                placeholder={t.support2fa?.replyPlaceholder || "Type your reply..."}
                minHeight={120}
                simple
              />
              <div className="flex justify-end mt-3">
                <Button
                  onClick={handleSendReply}
                  disabled={isSending || !replyText.trim()}
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {t.support2fa?.sendReply || "Send Reply"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-t border-border bg-muted/50 p-4">
            <div className="max-w-2xl mx-auto flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                {t.support2fa?.ticketClosed || "This ticket has been closed."}
              </p>
              <Button variant="outline" size="sm" onClick={() => {
                localStorage.removeItem('2fa_support_token');
                localStorage.removeItem('2fa_support_email');
                navigate("/login", { replace: true });
              }}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t.support2fa?.backToLogin || "Back to Login"}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Create Ticket Form ───
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center mb-4">
            <Shield className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            {t.support2fa?.title || "2FA Support"}
          </h1>
          <p className="text-muted-foreground text-center text-sm">
            {t.support2fa?.subtitle || "Can't access your authenticator app? Submit a support ticket and we'll help you regain access."}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t.support2fa?.createTicket || "Create Support Ticket"}
            </CardTitle>
            <CardDescription>
              {displayEmail && (
                <span>{t.support2fa?.loggedAs || "Account"}: <span className="font-medium text-foreground">{displayEmail}</span></span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Alert>
                <AlertDescription className="text-sm">
                  {t.support2fa?.verifyNote || "For security, our team may ask you to verify your identity before disabling 2FA on your account."}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="subject">{t.support2fa?.subject || "Subject"}</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t.support2fa?.subjectPlaceholder || "e.g., Lost access to authenticator app"}
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">{t.support2fa?.message || "Message"}</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t.support2fa?.messagePlaceholder || "Describe your situation. Why can't you access your authenticator app?"}
                  rows={4}
                />
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={handleBack} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t.common?.back || "Back"}
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !subject.trim() || !message.trim()}
                  className="flex-1"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {t.support2fa?.submit || "Submit Ticket"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Support2FA;
