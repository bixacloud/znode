import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export interface TurnstileServices {
  emailVerify: boolean;
  createHosting: boolean;
  hostingSettings: boolean;
  createSSL: boolean;
  createTicket: boolean;
  replyTicket: boolean;
}

export interface TurnstileConfig {
  enabled: boolean;
  siteKey: string;
  services: TurnstileServices;
}

export function useTurnstileConfig() {
  return useQuery({
    queryKey: ['turnstile-config'],
    queryFn: async (): Promise<TurnstileConfig> => {
      try {
        const response = await fetch(`${API_URL}/api/settings/general/public`);
        if (!response.ok) {
          return { enabled: false, siteKey: '', services: getDefaultServices() };
        }
        const data = await response.json();
        return {
          enabled: data.turnstileEnabled || false,
          siteKey: data.turnstileSiteKey || '',
          services: {
            ...getDefaultServices(),
            ...data.turnstileServices,
            emailVerify: true, // Always true
          },
        };
      } catch {
        return { enabled: false, siteKey: '', services: getDefaultServices() };
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

function getDefaultServices(): TurnstileServices {
  return {
    emailVerify: true,
    createHosting: false,
    hostingSettings: false,
    createSSL: false,
    createTicket: false,
    replyTicket: false,
  };
}

export function isTurnstileRequired(
  config: TurnstileConfig | undefined, 
  service: keyof TurnstileServices
): boolean {
  if (!config?.enabled || !config?.siteKey) {
    return false;
  }
  return config.services[service] || false;
}
