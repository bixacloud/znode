import prisma from './prisma.js';
import { NotificationType } from '@prisma/client';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

// Get country from IP using free API
async function getCountryFromIP(ip: string): Promise<string | null> {
  try {
    // Skip for localhost/private IPs
    if (ip === '127.0.0.1' || ip === 'localhost' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip === 'Unknown') {
      return null;
    }
    
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode`);
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'success') {
        return data.country || null;
      }
    }
  } catch (error) {
    console.error('Failed to get country from IP:', error);
  }
  return null;
}

export async function createNotification(params: CreateNotificationParams) {
  const { userId, type, title, message, metadata } = params;
  
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}

// Helper functions for common notifications

export async function notifyLogin(userId: string, ip: string, userAgent?: string) {
  const country = await getCountryFromIP(ip);
  return createNotification({
    userId,
    type: 'LOGIN',
    title: 'Đăng nhập mới',
    message: `Bạn đã đăng nhập từ IP: ${ip}`,
    metadata: { ip, country, userAgent },
  });
}

export async function notifyLogout(userId: string, ip: string) {
  const country = await getCountryFromIP(ip);
  return createNotification({
    userId,
    type: 'LOGOUT',
    title: 'Đăng xuất',
    message: `Bạn đã đăng xuất từ IP: ${ip}`,
    metadata: { ip, country },
  });
}

export async function notifyPasswordChange(userId: string, ip: string) {
  return createNotification({
    userId,
    type: 'PASSWORD_CHANGE',
    title: 'Đổi mật khẩu',
    message: `Mật khẩu của bạn đã được thay đổi từ IP: ${ip}`,
    metadata: { ip },
  });
}

export async function notifyOtpEnabled(userId: string, ip: string) {
  return createNotification({
    userId,
    type: 'OTP_ENABLED',
    title: 'Bật xác thực 2 bước',
    message: `Xác thực 2 bước đã được bật từ IP: ${ip}`,
    metadata: { ip },
  });
}

export async function notifyOtpDisabled(userId: string, ip: string) {
  return createNotification({
    userId,
    type: 'OTP_DISABLED',
    title: 'Tắt xác thực 2 bước',
    message: `Xác thực 2 bước đã được tắt từ IP: ${ip}`,
    metadata: { ip },
  });
}

export async function notifyProfileUpdate(userId: string, ip: string, changes: string[]) {
  return createNotification({
    userId,
    type: 'PROFILE_UPDATE',
    title: 'Cập nhật hồ sơ',
    message: `Thông tin đã thay đổi: ${changes.join(', ')}`,
    metadata: { ip, changes },
  });
}

export async function notifyHostingCreated(userId: string, domain: string, username: string) {
  return createNotification({
    userId,
    type: 'HOSTING_CREATED',
    title: 'Tạo hosting mới',
    message: `Hosting ${domain} (${username}) đã được tạo`,
    metadata: { domain, username },
  });
}

export async function notifyHostingActivated(userId: string, domain: string, username: string) {
  return createNotification({
    userId,
    type: 'HOSTING_ACTIVATED',
    title: 'Hosting đã kích hoạt',
    message: `Hosting ${domain} (${username}) đã được kích hoạt`,
    metadata: { domain, username },
  });
}

export async function notifyHostingSuspended(userId: string, domain: string, username: string, reason?: string) {
  return createNotification({
    userId,
    type: 'HOSTING_SUSPENDED',
    title: 'Hosting bị tạm ngưng',
    message: `Hosting ${domain} (${username}) đã bị tạm ngưng${reason ? `: ${reason}` : ''}`,
    metadata: { domain, username, reason },
  });
}

export async function notifyHostingReactivated(userId: string, domain: string, username: string) {
  return createNotification({
    userId,
    type: 'HOSTING_REACTIVATED',
    title: 'Hosting đã kích hoạt lại',
    message: `Hosting ${domain} (${username}) đã được kích hoạt lại`,
    metadata: { domain, username },
  });
}

export async function notifyHostingDeleted(userId: string, domain: string, username: string) {
  return createNotification({
    userId,
    type: 'HOSTING_DELETED',
    title: 'Hosting đã xóa',
    message: `Hosting ${domain} (${username}) đã bị xóa`,
    metadata: { domain, username },
  });
}

export async function notifyTicketCreated(userId: string, ticketId: string, subject: string) {
  return createNotification({
    userId,
    type: 'TICKET_CREATED',
    title: 'Ticket mới được tạo',
    message: `Ticket "${subject}" đã được tạo`,
    metadata: { ticketId, subject },
  });
}

export async function notifyTicketReplied(userId: string, ticketId: string, subject: string, isFromAdmin: boolean) {
  return createNotification({
    userId,
    type: 'TICKET_REPLIED',
    title: isFromAdmin ? 'Admin đã trả lời ticket' : 'Có trả lời mới',
    message: `Ticket "${subject}" có phản hồi mới`,
    metadata: { ticketId, subject, isFromAdmin },
  });
}

export async function notifyTicketClosed(userId: string, ticketId: string, subject: string) {
  return createNotification({
    userId,
    type: 'TICKET_CLOSED',
    title: 'Ticket đã đóng',
    message: `Ticket "${subject}" đã được đóng`,
    metadata: { ticketId, subject },
  });
}

export async function notifyAdminBlocked(userId: string, reason?: string) {
  return createNotification({
    userId,
    type: 'ADMIN_BLOCKED',
    title: 'Tài khoản bị khóa',
    message: `Tài khoản của bạn đã bị admin khóa${reason ? `: ${reason}` : ''}`,
    metadata: { reason },
  });
}

export async function notifyAdminUnblocked(userId: string) {
  return createNotification({
    userId,
    type: 'ADMIN_UNBLOCKED',
    title: 'Tài khoản đã mở khóa',
    message: 'Tài khoản của bạn đã được admin mở khóa',
  });
}

export default {
  createNotification,
  notifyLogin,
  notifyLogout,
  notifyPasswordChange,
  notifyOtpEnabled,
  notifyOtpDisabled,
  notifyProfileUpdate,
  notifyHostingCreated,
  notifyHostingActivated,
  notifyHostingSuspended,
  notifyHostingReactivated,
  notifyHostingDeleted,
  notifyTicketCreated,
  notifyTicketReplied,
  notifyTicketClosed,
  notifyAdminBlocked,
  notifyAdminUnblocked,
};
