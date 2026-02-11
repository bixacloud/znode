import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Globe,
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle,
  XCircle,
  Edit2,
  AlertTriangle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import AdminLayout from "@/components/admin/AdminLayout";
import { useLanguage } from "@/contexts/LanguageContext";

interface AllowedDomain {
  id: string;
  domain: string;
  enabled: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const DomainsSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();
  const dt = t.admin?.domains || {} as any;
  const dateLocale = { en: 'en-US', vi: 'vi-VN', zh: 'zh-CN', fil: 'fil-PH' }[language] || 'en-US';
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState<AllowedDomain | null>(null);
  const [newDomain, setNewDomain] = useState({
    domain: "",
    description: "",
    enabled: true,
  });

  // Fetch allowed domains
  const { data: domainsData, isLoading } = useQuery({
    queryKey: ["allowed-domains"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/settings/domains`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch domains");
      return response.json();
    },
  });

  const domains: AllowedDomain[] = domainsData?.domains || [];

  // Add domain mutation
  const addMutation = useMutation({
    mutationFn: async (data: { domain: string; description: string; enabled: boolean }) => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/settings/domains`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add domain");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allowed-domains"] });
      setIsAddDialogOpen(false);
      setNewDomain({ domain: "", description: "", enabled: true });
      toast({
        title: "Success",
        description: dt.addSuccess || "Domain added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: dt.error || "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update domain mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; domain: string; description: string; enabled: boolean }) => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/settings/domains/${data.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update domain");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allowed-domains"] });
      setIsEditDialogOpen(false);
      setEditingDomain(null);
      toast({
        title: "Success",
        description: dt.updateSuccess || "Domain updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: dt.error || "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete domain mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/settings/domains/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete domain");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allowed-domains"] });
      toast({
        title: "Success",
        description: dt.deleteSuccess || "Domain deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: dt.error || "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle domain status
  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/settings/domains/${id}/toggle`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) throw new Error("Failed to toggle domain");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allowed-domains"] });
    },
  });

  const handleAddDomain = () => {
    if (!newDomain.domain.trim()) {
      toast({
        title: dt.error || "Error",
        description: dt.enterDomain || "Please enter domain name",
        variant: "destructive",
      });
      return;
    }
    addMutation.mutate(newDomain);
  };

  const handleEditDomain = () => {
    if (!editingDomain) return;
    updateMutation.mutate({
      id: editingDomain.id,
      domain: editingDomain.domain,
      description: editingDomain.description,
      enabled: editingDomain.enabled,
    });
  };

  const handleToggle = (id: string, currentEnabled: boolean) => {
    toggleMutation.mutate({ id, enabled: !currentEnabled });
  };

  const openEditDialog = (domain: AllowedDomain) => {
    setEditingDomain({ ...domain });
    setIsEditDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{dt.title || 'Domain Management'}</h1>
            <p className="text-muted-foreground mt-1">
              {dt.subtitle || 'Manage the list of domains that allow users to create subdomains'}
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {dt.addDomain || 'Add Domain'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{dt.addDomainTitle || 'Add New Domain'}</DialogTitle>
                <DialogDescription>
                  {dt.addDomainDesc || 'Add a new domain to the allowed list. Users can create subdomains on these domains.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="domain">{dt.domainName || 'Domain Name'}</Label>
                  <Input
                    id="domain"
                    placeholder={dt.domainPlaceholder || 'example.com'}
                    value={newDomain.domain}
                    onChange={(e) => setNewDomain({ ...newDomain, domain: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {dt.domainHint || 'Example: freehost.vn, myhost.net (no www)'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">{dt.description || 'Description (optional)'}</Label>
                  <Input
                    id="description"
                    placeholder={dt.descriptionPlaceholder || 'Description for this domain'}
                    value={newDomain.description}
                    onChange={(e) => setNewDomain({ ...newDomain, description: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enabled"
                    checked={newDomain.enabled}
                    onCheckedChange={(checked) => setNewDomain({ ...newDomain, enabled: checked })}
                  />
                  <Label htmlFor="enabled">{dt.enabled || 'Enabled'}</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  {dt.cancel || 'Cancel'}
                </Button>
                <Button onClick={handleAddDomain} disabled={addMutation.isPending}>
                  {addMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {dt.adding || 'Adding...'}
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      {dt.add || 'Add'}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Info Alert */}
        <Alert>
          <Globe className="h-4 w-4" />
          <AlertTitle>{dt.guide || 'Guide'}</AlertTitle>
          <AlertDescription>
            {dt.guideDesc || 'Add domains that you want to allow users to create subdomains. For example: if you add "freehost.vn", users can create hosting with subdomains like "username.freehost.vn".'}
          </AlertDescription>
        </Alert>

        {/* Domains Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              {dt.domainList || 'Domain List'}
            </CardTitle>
            <CardDescription>
              {(dt.domainCount || '{count} domains configured').replace('{count}', String(domains.length))}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : domains.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Globe className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">{dt.noDomains || 'No domains yet'}</h3>
                <p className="text-muted-foreground max-w-sm mb-4">
                  {dt.noDomainsDesc || 'Add the first domain to allow users to create subdomains.'}
                </p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  {dt.addDomain || 'Add Domain'}
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{dt.domain || 'Domain'}</TableHead>
                    <TableHead>{dt.description || 'Description'}</TableHead>
                    <TableHead>{dt.status || 'Status'}</TableHead>
                    <TableHead>{dt.createdAt || 'Created'}</TableHead>
                    <TableHead className="text-right">{dt.actions || 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {domains.map((domain) => (
                    <TableRow key={domain.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-muted-foreground" />
                          {domain.domain}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {domain.description || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={domain.enabled}
                            onCheckedChange={() => handleToggle(domain.id, domain.enabled)}
                            disabled={toggleMutation.isPending}
                          />
                          <Badge variant={domain.enabled ? "default" : "secondary"}>
                            {domain.enabled ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {dt.active || 'Active'}
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 mr-1" />
                                {dt.inactive || 'Disabled'}
                              </>
                            )}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(domain.createdAt).toLocaleDateString(dateLocale)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(domain)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{dt.confirmDelete || 'Confirm Delete'}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {(dt.confirmDeleteDesc || 'Are you sure you want to delete domain "{domain}"? This action cannot be undone.').replace('{domain}', domain.domain)}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{dt.cancel || 'Cancel'}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(domain.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {deleteMutation.isPending ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      {dt.deleting || 'Deleting...'}
                                    </>
                                  ) : (
                                    dt.delete || 'Delete'
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{dt.editDomain || 'Edit Domain'}</DialogTitle>
              <DialogDescription>
                {dt.editDomainDesc || 'Update domain information'}
              </DialogDescription>
            </DialogHeader>
            {editingDomain && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-domain">{dt.domainName || 'Domain Name'}</Label>
                  <Input
                    id="edit-domain"
                    value={editingDomain.domain}
                    onChange={(e) => setEditingDomain({ ...editingDomain, domain: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">{dt.description || 'Description'}</Label>
                  <Input
                    id="edit-description"
                    value={editingDomain.description}
                    onChange={(e) => setEditingDomain({ ...editingDomain, description: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-enabled"
                    checked={editingDomain.enabled}
                    onCheckedChange={(checked) => setEditingDomain({ ...editingDomain, enabled: checked })}
                  />
                  <Label htmlFor="edit-enabled">{dt.enabled || 'Enabled'}</Label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                {dt.cancel || 'Cancel'}
              </Button>
              <Button onClick={handleEditDomain} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {dt.saving || 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {dt.save || 'Save'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default DomainsSettings;
