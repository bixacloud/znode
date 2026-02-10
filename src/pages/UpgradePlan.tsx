import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Crown,
  Check,
  Zap,
  Shield,
  Globe,
  Database,
  HardDrive,
  Wifi,
  ArrowLeft,
  ExternalLink,
  Loader2,
  Star,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";
import { cn } from "@/lib/utils";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";

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
  translations: Record<string, { name?: string; description?: string; features?: string[] }> | null;
}

const UpgradePlan = () => {
  const { username } = useParams();
  const { t, language } = useLanguage();
  usePageTitle(t.upgrade?.title || "Upgrade to Premium");

  // Fetch plans
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["premium-plans"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/premium-plans/public`);
      if (!res.ok) throw new Error("Failed to fetch plans");
      return res.json();
    },
  });

  // Helper to get translated content
  const getTranslated = (plan: PremiumPlan, field: "name" | "description" | "features") => {
    if (language !== "en" && plan.translations?.[language]?.[field]) {
      return plan.translations[language][field];
    }
    if (field === "features") return plan.features;
    return plan[field];
  };

  // Format price
  const formatPrice = (price: number, currency: string, cycle: string) => {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(price);

    const cycleLabel: Record<string, string> = {
      monthly: t.upgrade?.monthly || "/month",
      yearly: t.upgrade?.yearly || "/year",
      lifetime: t.upgrade?.lifetime || " lifetime",
    };

    return `${formatted}${cycleLabel[cycle] || ""}`;
  };

  // Spec icons
  const specIcons: Record<string, React.ElementType> = {
    disk: HardDrive,
    bandwidth: Wifi,
    domains: Globe,
    databases: Database,
    ssl: Shield,
    support: Zap,
  };

  const upgradeT = t.upgrade || {
    title: "Upgrade to Premium",
    subtitle: "Unlock more features with our premium hosting plans",
    back: "Back to Hosting",
    popular: "Most Popular",
    selectPlan: "Select Plan",
    features: "Features",
    specs: "Specifications",
    noPlans: "No premium plans available at the moment",
    monthly: "/month",
    yearly: "/year",
    lifetime: " lifetime",
    currentPlan: "Free Plan",
    currentPlanDesc: "You are currently on the free plan",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link to={username ? `/user/hosting/${username}` : "/user/hosting"}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {upgradeT.back}
                </Button>
              </Link>
            </div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
                <Crown className="w-6 h-6 text-white" />
              </div>
              {upgradeT.title}
            </h1>
            <p className="text-muted-foreground mt-1">{upgradeT.subtitle}</p>
          </div>
        </div>

        {/* Current Plan Banner */}
        <Card className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700">
                  <Sparkles className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </div>
                <div>
                  <p className="font-medium">{upgradeT.currentPlan}</p>
                  <p className="text-sm text-muted-foreground">{upgradeT.currentPlanDesc}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plans Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : plans.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Crown className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">{upgradeT.noPlans}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan: PremiumPlan) => (
              <Card
                key={plan.id}
                className={cn(
                  "relative overflow-hidden transition-all hover:shadow-lg",
                  plan.isPopular && "border-2 border-primary shadow-lg"
                )}
              >
                {plan.isPopular && (
                  <div className="absolute top-0 right-0">
                    <Badge className="rounded-none rounded-bl-lg bg-primary text-primary-foreground">
                      <Star className="w-3 h-3 mr-1" />
                      {upgradeT.popular}
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">{getTranslated(plan, "name")}</CardTitle>
                  {plan.description && (
                    <CardDescription>{getTranslated(plan, "description")}</CardDescription>
                  )}
                  <div className="pt-4">
                    <span className="text-4xl font-bold">
                      {formatPrice(plan.price, plan.currency, plan.billingCycle)}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Specs */}
                  {plan.specs && Object.keys(plan.specs).length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(plan.specs).map(([key, value]) => {
                        const Icon = specIcons[key] || Zap;
                        return (
                          <div
                            key={key}
                            className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50"
                          >
                            <Icon className="w-4 h-4 text-primary" />
                            <span className="font-medium">{value}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Features */}
                  {plan.features && plan.features.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">{upgradeT.features}</p>
                      <ul className="space-y-2">
                        {(getTranslated(plan, "features") as string[])?.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>

                <CardFooter>
                  {plan.affiliateUrl ? (
                    <a href={plan.affiliateUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                      <Button
                        className={cn(
                          "w-full",
                          plan.isPopular
                            ? "bg-gradient-to-r from-primary to-primary/80"
                            : ""
                        )}
                      >
                        {upgradeT.selectPlan}
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </a>
                  ) : (
                    <Button className="w-full" variant="outline" disabled>
                      {upgradeT.selectPlan}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default UpgradePlan;
