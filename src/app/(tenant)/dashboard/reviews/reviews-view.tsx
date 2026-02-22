"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/star-rating";
import { Eye, EyeOff, Star, TrendingUp } from "lucide-react";
import { toggleReviewVisibility } from "./actions";

interface ReviewData {
  id: string;
  rating: number;
  text: string | null;
  isPublic: boolean;
  routedToGoogle: boolean;
  managerAlerted: boolean;
  createdAt: string | Date;
  user: { firstName: string | null; lastName: string | null; email: string };
  order: { orderNumber: string; id: string };
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: Array<{ rating: number; count: number }>;
}

interface ReviewsViewProps {
  reviews: ReviewData[];
  stats: ReviewStats;
  pagination: { page: number; total: number; totalPages: number };
}

export function ReviewsView({ reviews, stats, pagination }: ReviewsViewProps) {
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<string>("all");

  const handleToggleVisibility = (reviewId: string) => {
    startTransition(async () => {
      await toggleReviewVisibility(reviewId);
    });
  };

  const maxCount = Math.max(...stats.distribution.map((d) => d.count), 1);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reviews</h1>
        <p className="text-muted-foreground">
          Monitor customer feedback and manage reviews
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">Average Rating</p>
                <p className="text-2xl font-bold">
                  {stats.averageRating.toFixed(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Total Reviews</p>
                <p className="text-2xl font-bold">{stats.totalReviews}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-xs text-muted-foreground">Distribution</p>
            {[5, 4, 3, 2, 1].map((star) => {
              const entry = stats.distribution.find((d) => d.rating === star);
              const count = entry?.count ?? 0;
              const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-right">{star}</span>
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-muted-foreground">
                    {count}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {["all", "5", "4", "3", "2", "1"].map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : `${f} Star`}
          </Button>
        ))}
      </div>

      {/* Review List */}
      <div className="space-y-4">
        {reviews
          .filter(
            (r) => filter === "all" || r.rating === parseInt(filter, 10)
          )
          .map((review) => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <StarRating
                        value={review.rating}
                        readOnly
                        size="sm"
                      />
                      <span className="text-sm text-muted-foreground">
                        {review.user.firstName ?? review.user.email}
                        {review.user.lastName
                          ? ` ${review.user.lastName}`
                          : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Order: {review.order.orderNumber}
                    </p>
                    {review.text && (
                      <p className="text-sm">{review.text}</p>
                    )}
                    <div className="flex gap-2">
                      {review.managerAlerted && (
                        <Badge variant="destructive">Low Rating Alert</Badge>
                      )}
                      {review.routedToGoogle && (
                        <Badge variant="success">Google Eligible</Badge>
                      )}
                      {!review.isPublic && (
                        <Badge variant="secondary">Hidden</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleVisibility(review.id)}
                    disabled={isPending}
                    title={review.isPublic ? "Hide review" : "Show review"}
                  >
                    {review.isPublic ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

        {reviews.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No reviews yet. Reviews will appear here once customers submit
              them.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
