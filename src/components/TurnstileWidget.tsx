import { useEffect, useRef, useCallback, useState } from 'react';
import { Loader2 } from 'lucide-react';

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        'error-callback'?: () => void;
        'expired-callback'?: () => void;
        theme?: 'light' | 'dark' | 'auto';
        size?: 'normal' | 'compact';
      }) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
  className?: string;
}

export function TurnstileWidget({
  siteKey,
  onVerify,
  onError,
  onExpire,
  theme = 'auto',
  size = 'normal',
  className = '',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const renderWidget = useCallback(() => {
    if (!window.turnstile || !containerRef.current) return;
    
    // Remove existing widget if any
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    // Clear container
    containerRef.current.innerHTML = '';
    
    setIsLoading(false);
    
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onVerify,
      'error-callback': onError,
      'expired-callback': onExpire,
      theme,
      size,
    });
  }, [siteKey, onVerify, onError, onExpire, theme, size]);

  useEffect(() => {
    // Check if script already loaded
    if (window.turnstile) {
      renderWidget();
      return;
    }
    
    // Check if script is being loaded
    const existingScript = document.querySelector('script[src*="turnstile"]');
    if (existingScript) {
      existingScript.addEventListener('load', renderWidget);
      return;
    }
    
    // Load Turnstile script
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.onload = renderWidget;
    script.onerror = () => {
      setIsLoading(false);
      onError?.();
    };
    document.head.appendChild(script);
    
    return () => {
      // Cleanup widget on unmount
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [renderWidget, onError]);

  return (
    <div className={className}>
      {isLoading && (
        <div className="flex items-center justify-center p-4 border rounded-lg bg-muted/50">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading captcha...</span>
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
}

export function resetTurnstile(widgetId: string) {
  if (window.turnstile) {
    window.turnstile.reset(widgetId);
  }
}
