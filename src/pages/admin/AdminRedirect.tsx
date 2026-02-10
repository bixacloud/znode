import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const AdminRedirect = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is logged in and is admin, redirect to admin dashboard
  if (user && user.role === "ADMIN") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // If user is logged in but not admin, redirect to user dashboard
  if (user) {
    return <Navigate to="/user/dashboard" replace />;
  }

  // Otherwise redirect to login
  return <Navigate to="/login" replace />;
};

export default AdminRedirect;
