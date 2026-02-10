import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format suspend reason for display
 * - If starts with [BY ADMIN], extract admin name and reason
 * - Otherwise show the raw reason
 */
export function formatSuspendReason(reason: string | null | undefined, adminLabel = "Admin suspended"): string {
  if (!reason) return "";
  
  // Check if suspended by admin
  if (reason.startsWith('[BY ADMIN]')) {
    // Extract the reason part after [BY ADMIN]
    const adminPart = reason.replace('[BY ADMIN]', '').trim();
    // Extract admin name and reason from format: "[Admin: name] reason"
    const match = adminPart.match(/\[Admin:\s*([^\]]+)\]\s*(.*)/);
    if (match) {
      const adminName = match[1].trim();
      const suspendReason = match[2].trim();
      // Return just the name and reason without label prefix
      return `${adminName}: ${suspendReason}`;
    }
    return adminPart;
  }
  
  return reason;
}

/**
 * Check if account was suspended by admin
 */
export function isSuspendedByAdmin(reason: string | null | undefined): boolean {
  return reason?.startsWith('[BY ADMIN]') ?? false;
}

/**
 * Strip HTML tags from a string
 * Useful for displaying plain text previews of HTML content
 */
export function stripHtmlTags(html: string | null | undefined): string {
  if (!html) return "";
  // Create a temporary div to parse HTML and extract text content
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || "";
}
