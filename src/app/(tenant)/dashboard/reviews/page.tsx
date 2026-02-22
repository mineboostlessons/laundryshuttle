import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getReviewsDashboard } from "./actions";
import { ReviewsView } from "./reviews-view";

export default async function ReviewsPage() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);

  const data = await getReviewsDashboard({});

  return (
    <ReviewsView
      reviews={data.reviews.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      }))}
      stats={data.stats}
      pagination={data.pagination}
    />
  );
}
