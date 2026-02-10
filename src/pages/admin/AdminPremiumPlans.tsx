import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Crown,
  Plus,
  Edit,
  Trash2,
  Loader2,
  MoreVertical,
  Eye,
  EyeOff,
  Star,
  GripVertical,
  ExternalLink,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminLayout from "@/components/admin/AdminLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";

interface Translations {
  [locale: string]: { name?: string; description?: string; features?: string[] };
}

interface PremiumPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  currency: string;
  billingCycle: string;
  features: string[] | null;
  specs: Record<string, string> | null;
  affiliateUrl: string | null;
  isPopular: boolean;
  isActive: boolean;
  order: number;
  translations: Translations | null;
  createdAt: string;
}

const CURRENCIES = ["USD", "EUR", "GBP", "VND", "JPY", "AUD", "CAD"];
const BILLING_CYCLES = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "lifetime", label: "Lifetime" },
];

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
];

const AdminPremiumPlans = () => {
  const { t } = useLanguage();
  usePageTitle(t.admin?.premiumPlans || "Premium Plans");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<PremiumPlan | null>(null);
  const [deletePlan, setDeletePlan] = useState<PremiumPlan | null>(null);
  const [editLang, setEditLang] = useState("en");

  // Form state
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    price: "",
    currency: "USD",
    billingCycle: "monthly",
    features: [] as string[],
    specs: {} as Record<string, string>,
    affiliateUrl: "",
    isPopular: false,
    isActive: true,
    translations: {} as Translations,
  });
  const [featureInput, setFeatureInput] = useState("");

  // Query
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["admin-premium-plans"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/api/premium-plans/admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
  });

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const token = localStorage.getItem("accessToken");
      const url = editPlan
        ? `${API_URL}/api/premium-plans/admin/${editPlan.id}`
        : `${API_URL}/api/premium-plans/admin`;
      const res = await fetch(url, {
        method: editPlan ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-premium-plans"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: "Success" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/api/premium-plans/admin/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-premium-plans"] });
      setDeletePlan(null);
      toast({ title: "Deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setEditPlan(null);
    setEditLang("en");
    setForm({
      name: "",
      slug: "",
      description: "",
      price: "",
      currency: "USD",
      billingCycle: "monthly",
      features: [],
      specs: {},
      affiliateUrl: "",
      isPopular: false,
      isActive: true,
      translations: {},
    });
    setFeatureInput("");
  };

  const openEdit = (plan: PremiumPlan) => {
    setEditPlan(plan);
    setEditLang("en");
    setForm({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || "",
      price: plan.price.toString(),
      currency: plan.currency,
      billingCycle: plan.billingCycle,
      features: plan.features || [],
      specs: plan.specs || {},
      affiliateUrl: plan.affiliateUrl || "",
      isPopular: plan.isPopular,
      isActive: plan.isActive,
      translations: plan.translations || {},
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editLang === "en") {
      if (!form.name || !form.slug || !form.price) {
        toast({ title: "Error", description: "Name, slug and price are required", variant: "destructive" });
        return;
      }
    }
    saveMutation.mutate(form);
  };

  const addFeature = () => {
    if (!featureInput.trim()) return;
    if (editLang === "en") {
      setForm((f) => ({ ...f, features: [...f.features, featureInput.trim()] }));
    } else {
      setForm((f) => ({
        ...f,
        translations: {
          ...f.translations,
          [editLang]: {
            ...f.translations[editLang],
            features: [...(f.translations[editLang]?.features || []), featureInput.trim()],
          },
        },
      }));
    }
    setFeatureInput("");
  };

  const removeFeature = (idx: number) => {
    if (editLang === "en") {
      setForm((f) => ({ ...f, features: f.features.filter((_, i) => i !== idx) }));
    } else {
      setForm((f) => ({
        ...f,
        translations: {
          ...f.translations,
          [editLang]: {
            ...f.translations[editLang],
            features: (f.translations[editLang]?.features || []).filter((_, i) => i !== idx),
          },
        },
      }));
    }
  };

  const updateSpec = (key: string, value: string) => {
    setForm((f) => ({
      ...f,
      specs: { ...f.specs, [key]: value },
    }));
  };

  const removeSpec = (key: string) => {
    const { [key]: _, ...rest } = form.specs;
    setForm((f) => ({ ...f, specs: rest }));
  };

  // Get current features based on language
  const getCurrentFeatures = () => {
    if (editLang === "en") return form.features;
    return form.translations[editLang]?.features || [];
  };

  // Get/Set translated field
  const getField = (field: "name" | "description") => {
    if (editLang === "en") return form[field];
    return form.translations[editLang]?.[field] || "";
  };

  const setField = (field: "name" | "description", value: string) => {
    if (editLang === "en") {
      setForm((f) => ({ ...f, [field]: value }));
    } else {
      setForm((f) => ({
        ...f,
        translations: {
          ...f.translations,
          [editLang]: { ...f.translations[editLang], [field]: value },
        },
      }));
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(price);
  };

  const adminT = t.admin?.premiumPlans || {};

  return (
    <AdminLayout defaultCollapsed>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Crown className="w-7 h-7 text-amber-500" />
              {adminT.title || "Premium Plans"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {adminT.subtitle || "Configure premium hosting plans for upgrade"}
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            {adminT.addPlan || "Add Plan"}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {adminT.totalPlans || "Total Plans"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{plans.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {adminT.activePlans || "Active Plans"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {plans.filter((p: PremiumPlan) => p.isActive).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {adminT.popularPlan || "Popular Plan"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">
                {plans.find((p: PremiumPlan) => p.isPopular)?.name || "-"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Plans Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{adminT.name || "Name"}</TableHead>
                <TableHead>{adminT.price || "Price"}</TableHead>
                <TableHead>{adminT.cycle || "Cycle"}</TableHead>
                <TableHead className="text-center">{adminT.status || "Status"}</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {adminT.noPlans || "No plans yet"}
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((plan: PremiumPlan) => (
                  <TableRow key={plan.id} className={cn(!plan.isActive && "opacity-50")}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{plan.name}</span>
                        {plan.isPopular && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                            <Star className="w-3 h-3 mr-1" />
                            Popular
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{plan.slug}</p>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(plan.price, plan.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{plan.billingCycle}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {plan.isActive ? (
                        <Badge variant="default" className="bg-green-500">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Hidden</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(plan)}>
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          {plan.affiliateUrl && (
                            <DropdownMenuItem onClick={() => window.open(plan.affiliateUrl!, "_blank")}>
                              <ExternalLink className="w-4 h-4 mr-2" /> View Link
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeletePlan(plan)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Plan Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editPlan ? "Edit Plan" : "Add Plan"}</DialogTitle>
          </DialogHeader>

          {/* Language Tabs */}
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-muted-foreground" />
            {LANGUAGES.map((lang) => (
              <Button
                key={lang.code}
                variant={editLang === lang.code ? "default" : "outline"}
                size="sm"
                onClick={() => setEditLang(lang.code)}
              >
                {lang.flag} {lang.name}
              </Button>
            ))}
          </div>

          <div className="space-y-4">
            {/* Basic Info - only for EN */}
            {editLang === "en" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Name *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Premium Plan"
                    />
                  </div>
                  <div>
                    <Label>Slug *</Label>
                    <Input
                      value={form.slug}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                        }))
                      }
                      placeholder="premium-plan"
                    />
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Plan description..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Price *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder="9.99"
                    />
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <Select
                      value={form.currency}
                      onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Billing Cycle</Label>
                    <Select
                      value={form.billingCycle}
                      onValueChange={(v) => setForm((f) => ({ ...f, billingCycle: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BILLING_CYCLES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Affiliate URL</Label>
                  <Input
                    value={form.affiliateUrl}
                    onChange={(e) => setForm((f) => ({ ...f, affiliateUrl: e.target.value }))}
                    placeholder="https://example.com/signup?ref=..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    External link where users will be redirected when selecting this plan
                  </p>
                </div>

                {/* Specs */}
                <div>
                  <Label className="mb-2 block">Specifications</Label>
                  <div className="space-y-2">
                    {Object.entries(form.specs).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <Input value={key} disabled className="w-32" />
                        <Input
                          value={value}
                          onChange={(e) => updateSpec(key, e.target.value)}
                          className="flex-1"
                        />
                        <Button variant="ghost" size="icon" onClick={() => removeSpec(key)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        placeholder="disk, bandwidth, etc."
                        className="w-32"
                        id="new-spec-key"
                      />
                      <Input placeholder="Value" className="flex-1" id="new-spec-value" />
                      <Button
                        variant="outline"
                        onClick={() => {
                          const keyEl = document.getElementById("new-spec-key") as HTMLInputElement;
                          const valEl = document.getElementById("new-spec-value") as HTMLInputElement;
                          if (keyEl?.value && valEl?.value) {
                            updateSpec(keyEl.value, valEl.value);
                            keyEl.value = "";
                            valEl.value = "";
                          }
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.isPopular}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, isPopular: v }))}
                    />
                    <Label>Popular</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.isActive}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                    />
                    <Label>Active</Label>
                  </div>
                </div>
              </>
            )}

            {/* Translated fields */}
            {editLang !== "en" && (
              <>
                <div>
                  <Label>Name ({LANGUAGES.find((l) => l.code === editLang)?.name})</Label>
                  <Input
                    value={getField("name")}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder={form.name || "Plan name..."}
                  />
                </div>
                <div>
                  <Label>Description ({LANGUAGES.find((l) => l.code === editLang)?.name})</Label>
                  <Textarea
                    value={getField("description")}
                    onChange={(e) => setField("description", e.target.value)}
                    placeholder={form.description || "Description..."}
                    rows={2}
                  />
                </div>
              </>
            )}

            {/* Features - for all languages */}
            <div>
              <Label className="mb-2 block">
                Features {editLang !== "en" && `(${LANGUAGES.find((l) => l.code === editLang)?.name})`}
              </Label>
              <div className="space-y-2">
                {getCurrentFeatures().map((feature, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input value={feature} disabled className="flex-1" />
                    <Button variant="ghost" size="icon" onClick={() => removeFeature(idx)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    placeholder="Add a feature..."
                    onKeyDown={(e) => e.key === "Enter" && addFeature()}
                  />
                  <Button variant="outline" onClick={addFeature}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePlan} onOpenChange={() => setDeletePlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletePlan?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePlan && deleteMutation.mutate(deletePlan.id)}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminPremiumPlans;
