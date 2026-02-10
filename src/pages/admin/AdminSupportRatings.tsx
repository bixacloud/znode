import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Star,
  User,
  TrendingUp,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdminLayout from "@/components/admin/AdminLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";
import { cn, stripHtmlTags } from "@/lib/utils";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface SupportUserStats {
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
    role: string;
  };
  totalRatings: number;
  avgRating: number;
  ratingCounts: Array<{ rating: number; count: number }>;
}

interface RecentRating {
  id: string;
  rating: number;
  ratingComment: string | null;
  ratedAt: string;
  message: string;
  supportUser: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  } | null;
  ticket: {
    id: string;
    subject: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  };
}

interface RatingsData {
  stats: SupportUserStats[];
  overallStats: {
    totalRatings: number;
    avgRating: number;
  };
  recentRatings: RecentRating[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const AdminSupportRatings = () => {
  const { t } = useLanguage();
  usePageTitle(t.admin?.supportRatings || 'Support Ratings');
  
  const [page, setPage] = useState(1);
  const [selectedSupportId, setSelectedSupportId] = useState<string>("all");

  const { data, isLoading, error } = useQuery<RatingsData>({
    queryKey: ["admin-ratings", page, selectedSupportId],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (selectedSupportId && selectedSupportId !== "all") {
        params.set("supportUserId", selectedSupportId);
      }
      const response = await fetch(`${API_URL}/api/tickets/admin/ratings?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Ratings API error:', response.status, errorData);
        throw new Error(errorData.error || "Failed to fetch ratings");
      }
      return response.json();
    },
  });

  // Log any errors for debugging
  if (error) {
    console.error('Ratings query error:', error);
  }

  const stats = data?.stats || [];
  const overallStats = data?.overallStats || { totalRatings: 0, avgRating: 0 };
  const recentRatings = data?.recentRatings || [];
  const pagination = data?.pagination;

  const renderStars = (rating: number, size: "sm" | "md" = "md") => {
    const starClass = size === "sm" ? "w-3 h-3" : "w-4 h-4";
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              starClass,
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-border"
            )}
          />
        ))}
      </div>
    );
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return "text-green-600 dark:text-green-400";
    if (rating >= 3.5) return "text-blue-600 dark:text-blue-400";
    if (rating >= 2.5) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-destructive">{t.common?.error || "Error"}: {(error as Error).message}</p>
          <Button onClick={() => window.location.reload()}>
            {t.common?.retry || "Retry"}
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500" />
            {t.admin?.supportRatings || "Support Ratings"}
          </h1>
          <p className="text-muted-foreground">
            {t.admin?.supportRatingsDesc || "View support team performance based on user ratings"}
          </p>
        </div>

        {/* Overall Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t.admin?.totalRatings || "Total Ratings"}
              </CardTitle>
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.totalRatings}</div>
              <p className="text-xs text-muted-foreground">
                {t.admin?.allTimeRatings || "All time ratings received"}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t.admin?.averageRating || "Average Rating"}
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", getRatingColor(overallStats.avgRating))}>
                {overallStats.avgRating.toFixed(1)}
              </div>
              <div className="mt-1">
                {renderStars(Math.round(overallStats.avgRating))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t.admin?.supportMembers || "Support Members"}
              </CardTitle>
              <User className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.length}</div>
              <p className="text-xs text-muted-foreground">
                {t.admin?.activeSupport || "Active support staff"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Support Staff Ratings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {t.admin?.staffPerformance || "Staff Performance"}
            </CardTitle>
            <CardDescription>
              {t.admin?.staffPerformanceDesc || "Rating breakdown by support team member"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t.admin?.noRatingsYet || "No ratings yet"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.admin?.staff || "Staff"}</TableHead>
                    <TableHead className="text-center">{t.admin?.totalRatings || "Total"}</TableHead>
                    <TableHead className="text-center">{t.admin?.avgRating || "Avg"}</TableHead>
                    <TableHead className="hidden md:table-cell">{t.admin?.distribution || "Distribution"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.map((stat) => (
                    <TableRow key={stat.user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            {stat.user.avatar ? (
                              <img src={stat.user.avatar} alt="" className="w-8 h-8 rounded-full" />
                            ) : (
                              <span className="text-sm font-medium">
                                {(stat.user.name || stat.user.email).charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{stat.user.name || stat.user.email.split('@')[0]}</p>
                            <p className="text-xs text-muted-foreground">{stat.user.email}</p>
                          </div>
                          <Badge variant={stat.user.role === 'ADMIN' ? 'default' : 'secondary'} className="text-[10px]">
                            {stat.user.role}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{stat.totalRatings}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={cn("font-bold", getRatingColor(stat.avgRating))}>
                            {stat.avgRating.toFixed(1)}
                          </span>
                          {renderStars(Math.round(stat.avgRating), "sm")}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1">
                          {stat.ratingCounts.map((rc) => (
                            <div
                              key={rc.rating}
                              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted text-xs"
                              title={`${rc.rating} stars: ${rc.count}`}
                            >
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span>{rc.rating}</span>
                              <span className="text-muted-foreground">({rc.count})</span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Ratings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  {t.admin?.recentRatings || "Recent Ratings"}
                </CardTitle>
                <CardDescription>
                  {t.admin?.recentRatingsDesc || "Latest feedback from users"}
                </CardDescription>
              </div>
              <Select value={selectedSupportId} onValueChange={setSelectedSupportId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t.admin?.filterByStaff || "Filter by staff"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.admin?.allStaff || "All Staff"}</SelectItem>
                  {stats.map((stat) => (
                    <SelectItem key={stat.user.id} value={stat.user.id}>
                      {stat.user.name || stat.user.email.split('@')[0]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {recentRatings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t.admin?.noRecentRatings || "No recent ratings"}
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {recentRatings.map((rating) => (
                    <div key={rating.id} className="flex gap-4 p-4 rounded-lg bg-muted/50 border">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {renderStars(rating.rating)}
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs",
                              rating.supportUser?.role === 'ADMIN' && "bg-red-500/10 text-red-500 border-red-500/20",
                              rating.supportUser?.role === 'SUPPORT' && "bg-blue-500/10 text-blue-500 border-blue-500/20"
                            )}
                          >
                            {rating.supportUser?.name || rating.supportUser?.email?.split('@')[0] || "Support"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {rating.ratedAt ? formatDate(rating.ratedAt) : "-"}
                          </span>
                        </div>
                        <p className="text-sm font-medium truncate">
                          {rating.ticket.subject}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {t.admin?.ratedBy || "Rated by"}: {rating.ticket.user.name || rating.ticket.user.email}
                        </p>
                        {rating.ratingComment && (
                          <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-sm">
                            <p className="text-yellow-700 dark:text-yellow-400 italic">
                              "{rating.ratingComment}"
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {stripHtmlTags(rating.message)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      {t.admin?.page || "Page"} {pagination.page} / {pagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        {t.common?.previous || "Previous"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => setPage((p) => p + 1)}
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
    </AdminLayout>
  );
};

export default AdminSupportRatings;
