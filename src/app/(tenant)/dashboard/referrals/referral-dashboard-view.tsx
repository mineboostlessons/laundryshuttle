"use client";

import { useActionState } from "react";
import { updateReferralConfig, type ReferralDashboardData } from "./actions";

interface ReferralDashboardViewProps {
  data: ReferralDashboardData;
}

export function ReferralDashboardView({ data }: ReferralDashboardViewProps) {
  const [state, formAction, isPending] = useActionState(updateReferralConfig, {
    success: false,
  });

  const { config, stats, leaderboard, recentReferrals } = data;

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    signed_up: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    rewarded: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Referral Program</h1>
        <p className="text-muted-foreground">
          Reward customers for bringing in new business
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Referrals" value={stats.totalReferrals} />
        <StatCard label="Pending" value={stats.pendingReferrals} />
        <StatCard label="Completed" value={stats.completedReferrals} />
        <StatCard label="Rewarded" value={stats.rewardedReferrals} />
        <StatCard
          label="Total Rewards"
          value={`$${stats.totalRewardsGiven.toFixed(2)}`}
        />
      </div>

      {/* Configuration Form */}
      <div className="rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-semibold">Program Settings</h2>

        {state.success && (
          <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
            Settings saved successfully
          </div>
        )}
        {state.error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="enabled"
              id="enabled"
              defaultChecked={config.enabled}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="enabled" className="text-sm font-medium">
              Enable Referral Program
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Reward Amount ($)
              </label>
              <input
                type="number"
                name="rewardAmount"
                defaultValue={config.rewardAmount}
                min={0}
                max={1000}
                step={0.01}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Reward Type
              </label>
              <select
                name="rewardType"
                defaultValue={config.rewardType}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="credit">Wallet Credit</option>
                <option value="promo_code">Promo Code</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Min Order Value ($)
              </label>
              <input
                type="number"
                name="minOrderValue"
                defaultValue={config.minOrderValue}
                min={0}
                step={0.01}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Referred customer must place an order of at least this amount
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Code Prefix
              </label>
              <input
                type="text"
                name="codePrefix"
                defaultValue={config.codePrefix ?? ""}
                maxLength={10}
                placeholder="e.g. FRESH"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Referral codes will start with this prefix
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Expiry Days
              </label>
              <input
                type="number"
                name="expiryDays"
                defaultValue={config.expiryDays}
                min={1}
                max={365}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Days before a referral code expires
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save Settings"}
          </button>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Leaderboard */}
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">Top Referrers</h2>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground">No referrals yet</p>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((entry, i) => (
                <div
                  key={entry.userId}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        i === 0
                          ? "bg-yellow-100 text-yellow-700"
                          : i === 1
                            ? "bg-gray-100 text-gray-700"
                            : i === 2
                              ? "bg-orange-100 text-orange-700"
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium">{entry.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {entry.referralCount} referral{entry.referralCount !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Referrals */}
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">Recent Referrals</h2>
          {recentReferrals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No referrals yet</p>
          ) : (
            <div className="space-y-3">
              {recentReferrals.slice(0, 10).map((ref) => (
                <div
                  key={ref.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <div>
                    <div className="text-sm font-medium">{ref.referrerName}</div>
                    <div className="text-xs text-muted-foreground">
                      {ref.referredEmail
                        ? `Referred: ${ref.referredEmail}`
                        : "Waiting for signup"}
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
                    {ref.rewardAmount && (
                      <div className="mt-1 text-xs text-green-600">
                        +${ref.rewardAmount.toFixed(2)}
                      </div>
                    )}
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

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
