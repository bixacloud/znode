import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Search,
  Check,
  X,
  Loader2,
  Globe,
  ArrowRight,
  AlertTriangle,
  Server,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";

interface AllowedDomain {
  id: string;
  domain: string;
}

interface HostingStats {
  total: number;
  active: number;
  pending: number;
  suspended: number;
  limit: number;
  canCreate: boolean;
}

interface CreateHostingResult {
  hosting: {
    username: string;
    domain: string;
  };
}

interface NameserverCheckResult {
  valid: boolean;
  currentNameservers: string[];
  requiredNameservers: string[];
  message: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const CreateHosting = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  usePageTitle(t.hosting?.createNew || 'Create Hosting');
  
  // Common state
  const [activeTab, setActiveTab] = useState<"subdomain" | "custom">("subdomain");
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<"available" | "taken" | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [label, setLabel] = useState("");
  
  // Subdomain state
  const [subdomain, setSubdomain] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  
  // Custom domain state
  const [customDomain, setCustomDomain] = useState("");
  const [nsCheckResult, setNsCheckResult] = useState<NameserverCheckResult | null>(null);
  const [isCheckingNs, setIsCheckingNs] = useState(false);
  const [requiredNameservers, setRequiredNameservers] = useState<string[]>([]);

  // Fetch allowed domains
  const { data: domainsData, isLoading: loadingDomains } = useQuery({
    queryKey: ["allowed-domains-public"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/settings/domains/public`);
      if (!response.ok) throw new Error("Failed to fetch domains");
      return response.json();
    },
  });

  const domains: AllowedDomain[] = domainsData?.domains || [];

  // Fetch hosting stats
  const { data: statsData, isLoading: loadingStats } = useQuery({
    queryKey: ["hosting-stats"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/hosting/stats/summary`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  const stats: HostingStats = statsData || { total: 0, limit: 3, canCreate: true };

  // Fetch required nameservers
  useQuery({
    queryKey: ["required-nameservers"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/hosting/nameservers`);
      if (!response.ok) throw new Error("Failed to fetch nameservers");
      const data = await response.json();
      setRequiredNameservers(data.nameservers || []);
      return data;
    },
  });

  // Set default domain when loaded
  useEffect(() => {
    if (domains.length > 0 && !selectedDomain) {
      setSelectedDomain(domains[0].domain);
    }
  }, [domains, selectedDomain]);

  // Reset state when switching tabs
  useEffect(() => {
    setCheckResult(null);
    setShowConfig(false);
    setNsCheckResult(null);
  }, [activeTab]);

  // Check domain mutation (for subdomain)
  const checkDomainMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/hosting/check-domain`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subdomain,
          domain: selectedDomain,
        }),
      });
      return response.json();
    },
    onSuccess: (data) => {
      setIsChecking(false);
      if (data.available) {
        setCheckResult("available");
        setShowConfig(true);
      } else {
        setCheckResult("taken");
        setShowConfig(false);
      }
    },
    onError: () => {
      setIsChecking(false);
      toast({
        title: t.messages.error,
        description: t.createHosting.cannotCheckDomain,
        variant: "destructive",
      });
    },
  });

  // Check nameservers mutation (for custom domain)
  const checkNameserversMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/hosting/check-nameservers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          domain: customDomain,
        }),
      });
      return response.json();
    },
    onSuccess: (data: NameserverCheckResult) => {
      setIsCheckingNs(false);
      setNsCheckResult(data);
      if (data.valid) {
        setCheckResult("available");
        setShowConfig(true);
      } else {
        setCheckResult("taken");
        setShowConfig(false);
      }
    },
    onError: () => {
      setIsCheckingNs(false);
      toast({
        title: t.messages.error,
        description: t.createHosting?.cannotCheckNameservers || "Cannot check nameservers",
        variant: "destructive",
      });
    },
  });

  // Create hosting mutation
  const createHostingMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("accessToken");
      const isCustom = activeTab === "custom";
      
      const response = await fetch(`${API_URL}/api/hosting/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(isCustom ? {
          customDomain: customDomain,
          isCustomDomain: true,
          label,
        } : {
          subdomain,
          domain: selectedDomain,
          label,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create hosting");
      }
      return data as CreateHostingResult;
    },
    onSuccess: (data) => {
      toast({
        title: t.messages.success,
        description: t.messages.hostingCreated,
      });
      // Navigate directly to hosting details page
      navigate(`/user/hosting/${data.hosting.username}`);
    },
    onError: (error: Error) => {
      toast({
        title: t.messages.error,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCheckDomain = () => {
    if (!subdomain.trim() || !selectedDomain) return;
    setIsChecking(true);
    setCheckResult(null);
    checkDomainMutation.mutate();
  };

  const handleCheckNameservers = () => {
    if (!customDomain.trim()) return;
    setIsCheckingNs(true);
    setCheckResult(null);
    setNsCheckResult(null);
    checkNameserversMutation.mutate();
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createHostingMutation.mutate();
  };

  const getDisplayDomain = () => {
    if (activeTab === "custom") {
      return customDomain;
    }
    return `${subdomain}.${selectedDomain}`;
  };

  // Check if can create
  if (!loadingStats && !stats.canCreate) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t.hosting.createNew}</h1>
            <p className="text-muted-foreground">
              {t.createHosting.chooseSubdomainAndCreate}
            </p>
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t.createHosting.limitReached}</AlertTitle>
            <AlertDescription>
              {t.createHosting.maxAccountsUsed.replace('{limit}', stats.limit.toString())}
            </AlertDescription>
          </Alert>

          <Button onClick={() => navigate("/user/hosting")} variant="outline">
            {t.createHosting.backToHostingList}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t.hosting.createNew}</h1>
          <p className="text-muted-foreground">
            {t.createHosting.chooseSubdomainAndCreate}
          </p>
        </div>

        {/* Limit notice */}
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
          <p className="text-sm text-foreground">
            <span className="font-medium">{t.hostingList.limit}:</span> {t.hostingList.usingAccounts}{" "}
            <span className="font-bold text-primary">{stats.total}</span>/{stats.limit} {t.hostingList.freeHostingAccounts}.
          </p>
        </div>

        {/* Domain check form */}
        <div className="rounded-2xl bg-card border border-border p-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "subdomain" | "custom")}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="subdomain" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                {t.createHosting?.subdomainTab || "Subdomain"}
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex items-center gap-2">
                <Server className="w-4 h-4" />
                {t.createHosting?.customDomainTab || "Custom Domain"}
              </TabsTrigger>
            </TabsList>

            {/* Subdomain Tab */}
            <TabsContent value="subdomain">
              {loadingDomains ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : domains.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{t.createHosting.noDomain}</AlertTitle>
                  <AlertDescription>
                    {t.createHosting.noDomainConfigured}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label>{t.createHosting.subdomain}</Label>
                    <div className="flex gap-2 mt-2">
                      <div className="flex-1">
                        <Input
                          placeholder="mywebsite"
                          value={subdomain}
                          onChange={(e) => {
                            const value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
                            setSubdomain(value);
                            setCheckResult(null);
                            setShowConfig(false);
                          }}
                          maxLength={8}
                          className="h-12 text-base"
                        />
                      </div>
                      <select
                        value={selectedDomain}
                        onChange={(e) => {
                          setSelectedDomain(e.target.value);
                          setCheckResult(null);
                          setShowConfig(false);
                        }}
                        className="h-12 px-4 rounded-lg border border-input bg-background text-foreground"
                      >
                        {domains.map((d) => (
                          <option key={d.id} value={d.domain}>
                            .{d.domain}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {t.createHosting.subdomainHelp}
                    </p>
                  </div>

                  <Button
                    onClick={handleCheckDomain}
                    disabled={!subdomain.trim() || subdomain.length < 3 || isChecking}
                    size="lg"
                    className="w-full"
                  >
                    {isChecking ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t.createHosting.checking}
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        {t.createHosting.checkDomain}
                      </>
                    )}
                  </Button>

                  {/* Check result for subdomain */}
                  {checkResult && activeTab === "subdomain" && (
                    <div
                      className={`p-4 rounded-xl flex items-center gap-3 ${
                        checkResult === "available"
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {checkResult === "available" ? (
                        <>
                          <Check className="w-5 h-5" />
                          <span className="font-medium">
                            {subdomain}.{selectedDomain} {t.createHosting.isAvailable}
                          </span>
                        </>
                      ) : (
                        <>
                          <X className="w-5 h-5" />
                          <span className="font-medium">
                            {subdomain}.{selectedDomain} {t.createHosting.isTaken}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Custom Domain Tab */}
            <TabsContent value="custom">
              <div className="space-y-4">
                {/* Required nameservers info */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>{t.createHosting?.requiredNameservers || "Required Nameservers"}</AlertTitle>
                  <AlertDescription>
                    <p className="mb-2">{t.createHosting?.nsInstructions || "Point your domain to the following nameservers before registering:"}</p>
                    <div className="bg-muted/50 rounded-lg p-3 space-y-1 font-mono text-sm">
                      {requiredNameservers.length > 0 ? (
                        requiredNameservers.map((ns, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Server className="w-3 h-3 text-muted-foreground" />
                            <span>{ns}</span>
                          </div>
                        ))
                      ) : (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                    </div>
                  </AlertDescription>
                </Alert>

                <div>
                  <Label>{t.createHosting?.customDomain || "Custom Domain"}</Label>
                  <Input
                    placeholder="example.com"
                    value={customDomain}
                    onChange={(e) => {
                      setCustomDomain(e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, ""));
                      setCheckResult(null);
                      setShowConfig(false);
                      setNsCheckResult(null);
                    }}
                    className="h-12 text-base mt-2"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    {t.createHosting?.customDomainHelp || "Enter your domain name (e.g., example.com or subdomain.example.com)"}
                  </p>
                </div>

                <Button
                  onClick={handleCheckNameservers}
                  disabled={!customDomain.trim() || customDomain.length < 4 || isCheckingNs}
                  size="lg"
                  className="w-full"
                >
                  {isCheckingNs ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t.createHosting?.checkingNameservers || "Checking Nameservers..."}
                    </>
                  ) : (
                    <>
                      <Server className="w-5 h-5" />
                      {t.createHosting?.checkNameservers || "Check Nameservers"}
                    </>
                  )}
                </Button>

                {/* Nameserver check result */}
                {nsCheckResult && (
                  <div
                    className={`p-4 rounded-xl ${
                      nsCheckResult.valid
                        ? "bg-success/10 border border-success/20"
                        : "bg-destructive/10 border border-destructive/20"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {nsCheckResult.valid ? (
                        <>
                          <Check className="w-5 h-5 text-success" />
                          <span className="font-medium text-success">
                            {t.createHosting?.nsValid || "Nameservers configured correctly!"}
                          </span>
                        </>
                      ) : (
                        <>
                          <X className="w-5 h-5 text-destructive" />
                          <span className="font-medium text-destructive">
                            {t.createHosting?.nsInvalid || "Nameservers not configured correctly"}
                          </span>
                        </>
                      )}
                    </div>
                    
                    {nsCheckResult.currentNameservers && nsCheckResult.currentNameservers.length > 0 && (
                      <div className="text-sm">
                        <p className="text-muted-foreground mb-1">
                          {t.createHosting?.currentNameservers || "Current nameservers:"}
                        </p>
                        <div className="bg-background/50 rounded p-2 font-mono text-xs space-y-1">
                          {nsCheckResult.currentNameservers.map((ns, idx) => (
                            <div key={idx} className={nsCheckResult.valid ? "text-success" : "text-destructive"}>
                              {ns}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {!nsCheckResult.valid && (
                      <p className="text-sm text-muted-foreground mt-3">
                        {t.createHosting?.nsChangeNote || "Please update your domain's nameservers at your registrar and wait for DNS propagation (can take up to 48 hours)."}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Account configuration */}
        {showConfig && (
          <div className="rounded-2xl bg-card border border-border p-6 animate-slide-up">
            <h2 className="text-lg font-semibold text-foreground mb-6">
              {t.createHosting.hostingConfig}
            </h2>

            <form onSubmit={handleCreate} className="space-y-6">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3">
                <Globe className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">{t.createHosting.selectedDomain}</p>
                  <p className="font-medium text-foreground">
                    {getDisplayDomain()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfig(false);
                    setCheckResult(null);
                    setNsCheckResult(null);
                  }}
                  className="ml-auto text-sm text-primary hover:underline"
                >
                  {t.createHosting.change}
                </button>
              </div>

              <div>
                <Label htmlFor="label">{t.createHosting.displayName}</Label>
                <Input
                  id="label"
                  placeholder={t.createHosting.displayNamePlaceholder}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="h-12 mt-2"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  {t.createHosting.displayNameHelp}
                </p>
              </div>

              {/* Features included */}
              <div className="border-t border-border pt-6">
                <h3 className="font-medium text-foreground mb-4">
                  {t.createHosting.featuresIncluded}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    "5GB SSD Storage",
                    "Unlimited Bandwidth",
                    "Free SSL",
                    "cPanel Access",
                    "1 MySQL Database",
                    "Softaculous",
                  ].map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="w-4 h-4 text-success" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={createHostingMutation.isPending}
              >
                {createHostingMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t.createHosting.creating}
                  </>
                ) : (
                  <>
                    {t.createHosting.createHosting}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CreateHosting;
