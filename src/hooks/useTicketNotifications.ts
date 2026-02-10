import { useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Bell } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface TicketNotification {
  id: string;
  subject: string;
  type: 'new_ticket' | 'new_reply';
  isSupport: boolean;
  userName?: string;
}

// Hook for admin to get notifications about new tickets from users
export function useAdminTicketNotifications(enabled: boolean = true, interval: number = 30000) {
  const { toast } = useToast();
  const { user } = useAuth();
  const lastCheckRef = useRef<string | null>(null);
  const seenTicketsRef = useRef<Set<string>>(new Set());

  const checkNewTickets = useCallback(async () => {
    if (!enabled || user?.role !== 'ADMIN') return;

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const params = new URLSearchParams({
        limit: '10',
        status: 'OPEN',
      });

      const response = await fetch(`${API_URL}/api/tickets/admin/all?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return;

      const data = await response.json();
      const tickets = data.tickets || [];

      // On first load, just record existing tickets
      if (!lastCheckRef.current) {
        tickets.forEach((t: any) => seenTicketsRef.current.add(t.id));
        lastCheckRef.current = new Date().toISOString();
        return;
      }

      // Check for new tickets
      tickets.forEach((ticket: any) => {
        if (!seenTicketsRef.current.has(ticket.id)) {
          seenTicketsRef.current.add(ticket.id);
          toast({
            title: "🎫 New Support Ticket",
            description: `${ticket.user?.name || ticket.user?.email?.split('@')[0] || 'User'}: ${ticket.subject}`,
            duration: 10000,
          });
        }
      });

      lastCheckRef.current = new Date().toISOString();
    } catch (error) {
      console.error('Failed to check new tickets:', error);
    }
  }, [enabled, user, toast]);

  useEffect(() => {
    if (!enabled || user?.role !== 'ADMIN') return;

    // Initial check
    checkNewTickets();

    // Set up polling
    const intervalId = setInterval(checkNewTickets, interval);

    return () => clearInterval(intervalId);
  }, [enabled, user, interval, checkNewTickets]);
}

// Hook for user to get notifications about admin replies
export function useUserTicketNotifications(enabled: boolean = true, interval: number = 30000) {
  const { toast } = useToast();
  const { user } = useAuth();
  const lastCheckRef = useRef<string | null>(null);
  const seenRepliesRef = useRef<Set<string>>(new Set());

  const checkNewReplies = useCallback(async () => {
    if (!enabled || !user || user.role === 'ADMIN') return;

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const params = new URLSearchParams({
        limit: '20',
        status: 'REPLIED',
      });

      const response = await fetch(`${API_URL}/api/tickets?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return;

      const data = await response.json();
      const tickets = data.tickets || [];

      // On first load, just record existing replied tickets
      if (!lastCheckRef.current) {
        tickets.forEach((t: any) => {
          if (t.replies) {
            t.replies.forEach((r: any) => {
              if (r.isSupport) seenRepliesRef.current.add(r.id);
            });
          }
        });
        lastCheckRef.current = new Date().toISOString();
        return;
      }

      // Check for new admin replies
      for (const ticket of tickets) {
        if (!ticket.replies) continue;
        
        for (const reply of ticket.replies) {
          if (reply.isSupport && !seenRepliesRef.current.has(reply.id)) {
            seenRepliesRef.current.add(reply.id);
            
            // Only notify if reply is recent (within last 2 minutes)
            const replyTime = new Date(reply.createdAt).getTime();
            const now = Date.now();
            if (now - replyTime < 120000) {
              toast({
                title: "💬 New Reply from Support",
                description: `Ticket: ${ticket.subject}`,
                duration: 10000,
              });
            }
          }
        }
      }

      lastCheckRef.current = new Date().toISOString();
    } catch (error) {
      console.error('Failed to check new replies:', error);
    }
  }, [enabled, user, toast]);

  useEffect(() => {
    if (!enabled || !user || user.role === 'ADMIN') return;

    // Initial check
    checkNewReplies();

    // Set up polling
    const intervalId = setInterval(checkNewReplies, interval);

    return () => clearInterval(intervalId);
  }, [enabled, user, interval, checkNewReplies]);
}

export default { useAdminTicketNotifications, useUserTicketNotifications };
