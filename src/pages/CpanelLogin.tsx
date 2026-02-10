import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Settings, Loader2, AlertCircle, ExternalLink, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface Hosting {
  id: string;
  vpUsername: string;
  password: string | null;
  domain: string;
  status: string;
  cpanelApproved?: boolean;
}

const CpanelLogin = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  usePageTitle(t.hosting?.cpanel || 'Control Panel Login');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isMarkingApproved, setIsMarkingApproved] = useState(false);

  // Fetch hosting details (public route - no auth required for cpanel login)
  const { data, isLoading, error } = useQuery({
    queryKey: ["hosting-cpanel", username],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/hosting/${username}/cpanel-login`);
      if (!response.ok) {
        throw new Error("Failed to fetch hosting details");
      }
      return response.json();
    },
  });

  const hosting: Hosting | null = data?.hosting || null;
  // Remove https:// or http:// prefix if present
  const rawCpanelUrl = data?.cpanelUrl || 'cpanel.byethost.com';
  const cpanelUrl = rawCpanelUrl.replace(/^https?:\/\//, '');

  // Mark hosting as approved when user opens cPanel
  const markApproved = async () => {
    if (!hosting) return;
    
    try {
      setIsMarkingApproved(true);
      const token = localStorage.getItem("accessToken");
      if (!token) return; // User not logged in, can't mark approved
      
      await fetch(`${API_URL}/api/hosting/${hosting.vpUsername}/mark-approved`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      console.error('Failed to mark hosting as approved:', err);
    } finally {
      setIsMarkingApproved(false);
    }
  };

  // Function to open cPanel in new tab with auto-login
  const openCpanel = async () => {
    if (!hosting || !hosting.password) return;

    // Create a form dynamically
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `https://${cpanelUrl}/login.php`;
    form.target = '_blank';

    // Add hidden fields
    const usernameField = document.createElement('input');
    usernameField.type = 'hidden';
    usernameField.name = 'uname';
    usernameField.value = hosting.vpUsername;
    form.appendChild(usernameField);

    const passwordField = document.createElement('input');
    passwordField.type = 'hidden';
    passwordField.name = 'passwd';
    passwordField.value = hosting.password;
    form.appendChild(passwordField);

    // Append to body, submit, and remove
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);

    setIsSubmitted(true);
    
    // Mark as approved after opening cPanel
    await markApproved();
  };

  // Auto-open cPanel when data is loaded
  useEffect(() => {
    if (hosting && hosting.password && !isSubmitted) {
      const timer = setTimeout(() => {
        openCpanel();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hosting, isSubmitted]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t.cpanelLogin?.loading || "Đang tải thông tin..."}</p>
        </div>
      </div>
    );
  }

  if (error || !hosting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t.cpanelLogin?.error || "Lỗi"}</AlertTitle>
            <AlertDescription>
              {t.cpanelLogin?.notFound || "Không tìm thấy tài khoản hosting hoặc bạn không có quyền truy cập."}
            </AlertDescription>
          </Alert>
          <Button 
            className="w-full mt-4" 
            variant="outline"
            onClick={() => navigate('/hosting')}
          >
            {t.cpanelLogin?.backToList || "Quay lại danh sách hosting"}
          </Button>
        </div>
      </div>
    );
  }

  if (!hosting.password) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t.cpanelLogin?.noPassword || "Không có mật khẩu"}</AlertTitle>
            <AlertDescription>
              {t.cpanelLogin?.noPasswordDesc || "Không tìm thấy mật khẩu cho tài khoản này. Vui lòng đăng nhập cPanel thủ công."}
            </AlertDescription>
          </Alert>
          <div className="flex gap-3 mt-4">
            <Button 
              variant="outline"
              className="flex-1"
              onClick={() => navigate(`/hosting/${username}`)}
            >
              {t.cpanelLogin?.back || "Quay lại"}
            </Button>
            <Button 
              className="flex-1"
              onClick={() => window.open(`https://${cpanelUrl}`, '_blank')}
            >
              {t.cpanelLogin?.openManually || "Mở cPanel thủ công"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          {/* Icon */}
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            {isSubmitted ? (
              <CheckCircle className="w-10 h-10 text-green-500" />
            ) : (
              <Settings className="w-10 h-10 text-primary animate-spin" style={{ animationDuration: '3s' }} />
            )}
          </div>

          {/* Content */}
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {isSubmitted 
              ? (t.cpanelLogin?.opened || 'Đã mở cPanel')
              : (t.cpanelLogin?.title || 'Đăng nhập vào cPanel')}
          </h1>
          <p className="text-muted-foreground mb-6">
            {isSubmitted 
              ? (t.cpanelLogin?.openedDesc || 'cPanel đã được mở trong tab mới. Nếu popup bị chặn, hãy nhấn nút bên dưới.')
              : (t.cpanelLogin?.opening || 'Vui lòng đợi, đang mở Control Panel...')}
          </p>

          <Button 
            onClick={openCpanel}
            className="w-full"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            {isSubmitted 
              ? (t.cpanelLogin?.reopen || 'Mở lại cPanel')
              : (t.cpanelLogin?.openNow || 'Mở cPanel ngay')}
          </Button>

          <Button 
            variant="outline"
            className="w-full mt-3"
            onClick={() => navigate(`/hosting/${username}`)}
          >
            {t.cpanelLogin?.backToDetails || "Quay lại chi tiết hosting"}
          </Button>

          <p className="text-xs text-muted-foreground mt-4">
            {t.cpanelLogin?.popupHint || "Nếu trình duyệt chặn popup, hãy cho phép popup từ trang này."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CpanelLogin;
