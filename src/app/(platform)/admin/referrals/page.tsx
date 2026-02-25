import type { Metadata } from "next";
import { getPlatformReferralAnalytics } from "./actions";

export const metadata: Metadata = {
  title: "Referral Analytics — Admin",
};

export default async function AdminReferralsPage() {
  const data = await getPlatformReferralAnalytics();

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    signed_up: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    rewarded: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Referral Analytics</h1>
        <p className="text-muted-foreground">
          Platform-wide referral program performance
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Total Referrals</div>
          <div className="mt-1 text-2xl font-bold">{data.stats.totalReferrals}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Completed</div>
          <div className="mt-1 text-2xl font-bold text-green-600">
            {data.stats.completedReferrals}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Rewarded</div>
          <div className="mt-1 text-2xl font-bold text-purple-600">
            {data.stats.rewardedReferrals}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Total Rewards</div>
          <div className="mt-1 text-2xl font-bold">
            ${data.stats.totalRewardsGiven.toFixed(2)}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Conversion Rate</div>
          <div className="mt-1 text-2xl font-bold">{data.stats.conversionRate}%</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Tenants Using</div>
          <div className="mt-1 text-2xl font-bold">
            {data.stats.tenantsUsingReferrals}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tenant Leaderboard */}
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">Top Tenants by Referrals</h2>
          {data.tenantLeaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground">No referral data yet</p>
          ) : (
            <div className="space-y-3">
              {data.tenantLeaderboard.map((entry, i) => (
                <div key={entry.tenantId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <div className="text-sm font-medium">{entry.businessName}</div>
                      <div className="text-xs text-muted-foreground">{entry.slug}</div>
                    </div>
                  </div>
                  <span className="text-sm font-medium">{entry.referralCount}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Referrals */}
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">Recent Referrals</h2>
          {data.recentReferrals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No referrals yet</p>
          ) : (
            <div className="space-y-3">
              {data.recentReferrals.map((ref) => (
                <div
                  key={ref.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <div>
                    <div className="text-sm font-medium">{ref.tenantName}</div>
                    <div className="text-xs text-muted-foreground">
                      {ref.referrerName} &rarr;{" "}
                      {ref.referredEmail ?? "Pending signup"}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        statusColors[ref.status] ?? "bg-gray-100"
                      }`}
                    >
                      {ref.status}
                    </span>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(ref.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
