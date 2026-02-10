import { prisma } from './prisma.js';

export interface TurnstileSettings {
  turnstileEnabled: boolean;
  turnstileSiteKey: string;
  turnstileSecretKey: string;
  // Services that require turnstile
  turnstileServices: {
    emailVerify: boolean;       // Always enabled, cannot be turned off
    createHosting: boolean;
    hostingSettings: boolean;   // Password change, deactivate
    createSSL: boolean;
    createTicket: boolean;
    replyTicket: boolean;
  };
}

const DEFAULT_TURNSTILE_SERVICES = {
  emailVerify: true,       // Default enabled, cannot be disabled
  createHosting: false,
  hostingSettings: false,
  createSSL: false,
  createTicket: false,
  replyTicket: false,
};

/**
 * Get Turnstile settings from database
 */
export async function getTurnstileSettings(): Promise<TurnstileSettings | null> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'general_settings' },
    });
    
    if (!setting) return null;
    
    const settings = JSON.parse(setting.value);
    return {
      turnstileEnabled: settings.turnstileEnabled || false,
      turnstileSiteKey: settings.turnstileSiteKey || '',
      turnstileSecretKey: settings.turnstileSecretKey || '',
      turnstileServices: {
        ...DEFAULT_TURNSTILE_SERVICES,
        ...settings.turnstileServices,
        emailVerify: true, // Always true
      },
    };
  } catch (error) {
    console.error('Error getting Turnstile settings:', error);
    return null;
  }
}

/**
 * Verify Turnstile captcha token
 */
export async function verifyTurnstile(turnstileToken: string): Promise<boolean> {
  try {
    const settings = await getTurnstileSettings();
    
    if (!settings || !settings.turnstileEnabled || !settings.turnstileSecretKey) {
      return true; // Turnstile not enabled, skip
    }
    
    // Verify with Cloudflare
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: settings.turnstileSecretKey,
        response: turnstileToken,
      }),
    });
    
    const result = await response.json() as { success: boolean };
    return result.success;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
}

/**
 * Check if Turnstile is required for a specific service
 */
export async function isTurnstileRequiredFor(service: keyof TurnstileSettings['turnstileServices']): Promise<boolean> {
  try {
    const settings = await getTurnstileSettings();
    
    if (!settings || !settings.turnstileEnabled || !settings.turnstileSecretKey) {
      return false;
    }
    
    // emailVerify is always required if turnstile is enabled
    if (service === 'emailVerify') {
      return true;
    }
    
    return settings.turnstileServices[service] || false;
  } catch (error) {
    console.error('Error checking Turnstile requirement:', error);
    return false;
  }
}

/**
 * Middleware-style function to verify turnstile for a service
 * Returns { valid: true } if OK, or { valid: false, error: string } if failed
 */
export async function verifyTurnstileForService(
  service: keyof TurnstileSettings['turnstileServices'],
  turnstileToken?: string
): Promise<{ valid: boolean; error?: string }> {
  const isRequired = await isTurnstileRequiredFor(service);
  
  if (!isRequired) {
    return { valid: true };
  }
  
  if (!turnstileToken) {
    return { valid: false, error: 'Captcha verification is required' };
  }
  
  const isValid = await verifyTurnstile(turnstileToken);
  
  if (!isValid) {
    return { valid: false, error: 'Captcha verification failed. Please try again.' };
  }
  
  return { valid: true };
}
