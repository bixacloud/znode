import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useSite } from '@/contexts/SiteContext';
import { useAuth } from '@/contexts/AuthContext';
import Maintenance from '@/pages/Maintenance';

interface MaintenanceWrapperProps {
  children: ReactNode;
}

// Routes that are always accessible during maintenance
const bypassRoutes = [
  '/admin',
  '/install',
  '/verify-email',
];

const MaintenanceWrapper = ({ children }: MaintenanceWrapperProps) => {
  const { settings, isLoading } = useSite();
  const { user } = useAuth();
  const location = useLocation();

  // Don't show maintenance page while loading settings
  if (isLoading) {
    return <>{children}</>;
  }

  // If maintenance mode is not enabled, show normal content
  if (!settings.maintenanceMode) {
    return <>{children}</>;
  }

  // Check if current route should bypass maintenance
  const shouldBypass = bypassRoutes.some(route => 
    location.pathname.startsWith(route)
  );

  if (shouldBypass) {
    return <>{children}</>;
  }

  // Admin users can bypass maintenance mode
  if (user?.role === 'ADMIN') {
    return <>{children}</>;
  }

  // Show maintenance page
  return <Maintenance />;
};

export default MaintenanceWrapper;
