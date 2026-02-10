import { Heart } from "lucide-react";
import { APP_NAME, APP_VERSION, APP_AUTHOR } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";

export const DashboardFooter = () => {
  const { t } = useLanguage();
  
  return (
    <footer className="border-t border-border bg-background/50 backdrop-blur-sm py-3 px-4 md:px-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="font-semibold text-foreground">{APP_NAME}</span>
          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">v{APP_VERSION}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>{t.footer?.madeWith || "Made with"}</span>
          <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
          <span>{t.footer?.by || "by"}</span>
          <a 
            href="https://bixacloud.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            {APP_AUTHOR}
          </a>
        </div>
      </div>
    </footer>
  );
};
