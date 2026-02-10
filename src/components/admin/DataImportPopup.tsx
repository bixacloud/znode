import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Import, SkipForward } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const DataImportPopup = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const di = t.admin?.dataImport || {} as Record<string, any>;

  useEffect(() => {
    checkImportStatus();
  }, []);

  const checkImportStatus = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/api/admin/import/status`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (!res.ok) return;

      const data = await res.json();
      if (data.showPopup) {
        setOpen(true);
      }
    } catch {
      // Silently fail
    }
  };

  const handleDismiss = async () => {
    setOpen(false);
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`${API_URL}/api/admin/import/dismiss-popup`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
    } catch {
      // Silently fail
    }
  };

  const handleImport = () => {
    setOpen(false);
    navigate('/admin/data-import');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Import className="w-5 h-5" />
            {di.popupTitle || 'Import Data from Old System?'}
          </DialogTitle>
          <DialogDescription>
            {di.popupDesc || 'We detected this is a fresh installation. Would you like to import data from your old Bixa PHP system?'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleDismiss}>
            <SkipForward className="w-4 h-4 mr-2" />
            {di.popupSkip || 'Skip'}
          </Button>
          <Button onClick={handleImport}>
            <Import className="w-4 h-4 mr-2" />
            {di.popupImport || 'Import Data'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DataImportPopup;
