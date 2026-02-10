import { useEffect, useState } from "react";
import { 
  Trash2, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Loader2,
  Edit,
  MoreVertical,
  Shield,
  ShieldOff,
  User as UserIcon,
  Mail,
  Calendar,
  Key,
  Eye,
  EyeOff,
  Headphones,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import AdminLayout from "@/components/admin/AdminLayout";
import authService, { User } from "@/services/auth";
import { useToast } from "@/hooks/use-toast";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const AdminUsers = () => {
  const { t } = useLanguage();
  usePageTitle(t.admin?.users || 'Admin Users');
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    name: "",
    role: "USER",
  });
  
  // Edit user state
  const [editUser, setEditUser] = useState<User | null>(null);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "USER",
    emailVerified: false,
    twoFactorEnabled: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    loadUsers(1);
  }, []);

  const loadUsers = async (page: number) => {
    setIsLoading(true);
    try {
      const response = await authService.getUsers(page, 10);
      setUsers(response.users);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast({
        title: t.messages.error,
        description: t.admin.cannotLoadUsers,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    try {
      await authService.deleteUser(deleteUserId);
      toast({
        title: t.messages.success,
        description: t.admin.userDeleted,
      });
      loadUsers(pagination.page);
    } catch (error: unknown) {
      const err = error as { error?: string };
      toast({
        title: t.messages.error,
        description: err.error || t.admin.cannotDeleteUser,
        variant: "destructive",
      });
    } finally {
      setDeleteUserId(null);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password) {
      toast({
        title: t.messages.error,
        description: t.admin.enterEmailPassword,
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newUser),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      toast({
        title: t.messages.success,
        description: t.admin.userCreated,
      });
      setShowCreateDialog(false);
      setNewUser({ email: "", password: "", name: "", role: "USER" });
      loadUsers(1);
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: t.messages.error,
        description: err.message || t.admin.cannotDeleteUser,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const openEditUser = (user: User) => {
    setEditUser(user);
    setEditForm({
      name: user.name || "",
      email: user.email,
      password: "",
      role: user.role || "USER",
      emailVerified: !!user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled || false,
    });
    setShowEditSheet(true);
  };

  const handleUpdateUser = async () => {
    if (!editUser) return;

    setIsUpdating(true);
    try {
      const token = localStorage.getItem("accessToken");
      const updateData: { name?: string; email?: string; password?: string; role?: string; emailVerified?: boolean; twoFactorEnabled?: boolean } = {};
      
      if (editForm.name !== editUser.name) updateData.name = editForm.name;
      if (editForm.email !== editUser.email) updateData.email = editForm.email;
      if (editForm.password) updateData.password = editForm.password;
      if (editForm.role !== editUser.role) updateData.role = editForm.role;
      if (editForm.emailVerified !== !!editUser.emailVerified) updateData.emailVerified = editForm.emailVerified;
      // Only send twoFactorEnabled when admin is disabling it (can't enable from here)
      if (editUser.twoFactorEnabled && !editForm.twoFactorEnabled) updateData.twoFactorEnabled = false;

      const response = await fetch(`${API_URL}/api/admin/users/${editUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update user");
      }

      toast({
        title: t.messages.success,
        description: t.admin?.userUpdated || "User updated successfully",
      });
      setShowEditSheet(false);
      setEditUser(null);
      loadUsers(pagination.page);
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: t.messages.error,
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  // Mobile user card component
  const UserCard = ({ user }: { user: User }) => (
    <div className="p-4 border-b border-border last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-medium">
                {user.name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{user.name || 'No name'}</p>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="flex-shrink-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEditUser(user)}>
              <Edit className="w-4 h-4 mr-2" />
              {t.common.edit}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeleteUserId(user.id)}
              disabled={user.role === 'ADMIN'}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t.common.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${
          user.role === 'ADMIN' 
            ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' 
            : user.role === 'SUPPORT'
            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
        }`}>
          {user.role === 'ADMIN' ? <Shield className="w-3 h-3" /> : user.role === 'SUPPORT' ? <Headphones className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
          {user.role || 'USER'}
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '-'}
        </span>
        {user.accounts && user.accounts.length > 0 && (
          <div className="flex gap-1">
            {user.accounts.map((acc) => (
              <span 
                key={acc.provider}
                className="px-2 py-0.5 rounded bg-muted text-xs"
              >
                {acc.provider}
              </span>
            ))}
          </div>
        )}
        {user.twoFactorEnabled && (
          <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium inline-flex items-center gap-1">
            <Shield className="w-3 h-3" />
            2FA
          </span>
        )}
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t.admin.users}</h1>
            <p className="text-sm sm:text-base text-muted-foreground">{t.admin.usersDescription}</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            {t.admin.createUser}
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Users ({pagination.total})</CardTitle>
                <CardDescription className="text-sm">
                  {t.admin.usersManagement}
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t.admin.searchUsers}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground px-4">
                {t.admin.noUsersFound}
              </div>
            ) : (
              <>
                {/* Desktop Table - Hidden on mobile */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>{t.admin.role}</TableHead>
                        <TableHead>{t.admin?.emailVerifiedCol || 'Email'}</TableHead>
                        <TableHead>OAuth</TableHead>
                        <TableHead>2FA</TableHead>
                        <TableHead>{t.admin.joinedAt}</TableHead>
                        <TableHead className="text-right">{t.common.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                {user.avatar ? (
                                  <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-sm font-medium">
                                    {user.name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{user.name || 'No name'}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${
                              user.role === 'ADMIN' 
                                ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' 
                                : user.role === 'SUPPORT'
                                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            }`}>
                              {user.role === 'ADMIN' ? <Shield className="w-3 h-3" /> : user.role === 'SUPPORT' ? <Headphones className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                              {user.role || 'USER'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {user.emailVerified ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell>
                            {user.accounts && user.accounts.length > 0 ? (
                              <div className="flex gap-1">
                                {user.accounts.map((acc: { provider: string }) => (
                                  <span key={acc.provider} className="px-2 py-0.5 rounded bg-muted text-xs capitalize">
                                    {acc.provider}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.twoFactorEnabled ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell>
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditUser(user)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteUserId(user.id)}
                                disabled={user.role === 'ADMIN'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards - Visible only on mobile */}
                <div className="md:hidden divide-y divide-border">
                  {filteredUsers.map((user) => (
                    <UserCard key={user.id} user={user} />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 px-4 sm:px-0 pb-4 sm:pb-0">
                    <p className="text-sm text-muted-foreground order-2 sm:order-1">
                      {t.admin.page} {pagination.page} / {pagination.totalPages}
                    </p>
                    <div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadUsers(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="flex-1 sm:flex-none"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        {t.common?.previous || "Previous"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadUsers(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        className="flex-1 sm:flex-none"
                      >
                        {t.common?.next || "Next"}
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.deleteUser}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.admin.deleteUserConfirm}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="mt-0">{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.admin.createUserTitle}</DialogTitle>
            <DialogDescription>
              {t.admin.createUserDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                {t.auth.password} *
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder={t.auth.minChars}
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                {t.admin.name}
              </Label>
              <Input
                id="name"
                placeholder={t.admin.name}
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                {t.admin.role}
              </Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({ ...newUser, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.admin.role} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">{t.admin.userRole}</SelectItem>
                  <SelectItem value="SUPPORT">{t.admin?.supportRole || "Support"}</SelectItem>
                  <SelectItem value="ADMIN">{t.admin.adminRole}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="w-full sm:w-auto">
              {t.common.cancel}
            </Button>
            <Button onClick={handleCreateUser} disabled={isCreating} className="w-full sm:w-auto">
              {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t.admin.createUser}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Sheet (better for mobile) */}
      <Sheet open={showEditSheet} onOpenChange={setShowEditSheet}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              {t.common.edit} User
            </SheetTitle>
            <SheetDescription>
              {t.admin?.editUserDesc || "Update user information"}
            </SheetDescription>
          </SheetHeader>
          
          {editUser && (
            <div className="space-y-6 py-6">
              {/* User avatar preview */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {editUser.avatar ? (
                    <img src={editUser.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-medium">
                      {editUser.name?.charAt(0)?.toUpperCase() || editUser.email.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-medium">{editUser.name || 'No name'}</p>
                  <p className="text-sm text-muted-foreground">ID: {editUser.id.slice(0, 8)}...</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4" />
                    {t.admin.name}
                  </Label>
                  <Input
                    id="edit-name"
                    placeholder={t.admin.name}
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </Label>
                  <Input
                    id="edit-email"
                    type="email"
                    placeholder="user@example.com"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-password" className="flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    {t.admin?.newPassword || "New Password"} ({t.admin?.optional || "optional"})
                  </Label>
                  <div className="relative">
                    <Input
                      id="edit-password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t.admin?.leaveBlank || "Leave blank to keep current"}
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t.auth.minChars}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-role" className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    {t.admin.role}
                  </Label>
                  <Select
                    value={editForm.role}
                    onValueChange={(value) => setEditForm({ ...editForm, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.admin.role} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4" />
                          {t.admin.userRole}
                        </div>
                      </SelectItem>
                      <SelectItem value="SUPPORT">
                        <div className="flex items-center gap-2">
                          <Headphones className="w-4 h-4" />
                          {t.admin?.supportRole || "Support"}
                        </div>
                      </SelectItem>
                      <SelectItem value="ADMIN">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          {t.admin.adminRole}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-emailVerified"
                    checked={editForm.emailVerified}
                    onCheckedChange={(checked) => 
                      setEditForm({ ...editForm, emailVerified: checked as boolean })
                    }
                  />
                  <Label
                    htmlFor="edit-emailVerified"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    {t.admin?.emailVerified || "Email Verified"}
                  </Label>
                </div>

                {editUser.twoFactorEnabled && (
                  <div className="rounded-lg border border-border p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
                      {t.admin?.twoFactorStatus || "Two-Factor Authentication"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t.admin?.twoFactorActiveNote || "This user has 2FA enabled. Disabling it will remove their TOTP secret and recovery codes."}
                    </p>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="edit-twoFactor"
                        checked={editForm.twoFactorEnabled}
                        onCheckedChange={(checked) =>
                          setEditForm({ ...editForm, twoFactorEnabled: checked as boolean })
                        }
                      />
                      <Label
                        htmlFor="edit-twoFactor"
                        className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
                      >
                        <ShieldOff className="w-4 h-4" />
                        {t.admin?.keep2FAEnabled || "Keep 2FA enabled"}
                      </Label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <SheetFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowEditSheet(false)}
              className="w-full sm:w-auto"
            >
              {t.common.cancel}
            </Button>
            <Button 
              onClick={handleUpdateUser} 
              disabled={isUpdating}
              className="w-full sm:w-auto"
            >
              {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t.common.save}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
};

export default AdminUsers;
