"use client";

import { useState } from "react";
import type { CustomerReferralPageData } from "./actions";

interface CustomerReferralViewProps {
  data: CustomerReferralPageData;
}

export function CustomerReferralView({ data }: CustomerReferralViewProps) {
  const { config, referralInfo } = data;
  const [copied, setCopied] = useState(false);

  if (!config.enabled) {
    return (
      <div className="p-6 lg:p-8 rounded-lg border text-center">
        <h1 className="text-2xl font-bold">Refer a Friend</h1>
        <p className="mt-2 text-muted-foreground">
          The referral program is not currently available. Check back soon!
        </p>
      </div>
    );
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(referralInfo.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(referralInfo.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const statusLabels: Record<string, string> = {
    pending: "Waiting",
    signed_up: "Signed Up",
    completed: "Order Placed",
    rewarded: "Reward Earned",
  };

  return (
    <div className="p-6 lg:p-8 mx-auto max-w-2xl space-y-6">
      {/* Hero */}
      <div className="rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 p-6 text-center">
        <h1 className="text-2xl font-bold">Refer a Friend, Earn Rewards</h1>
        <p className="mt-2 text-muted-foreground">
          Share your referral code and earn{" "}
          <strong className="text-primary">
            ${config.rewardAmount.toFixed(2)}
          </strong>{" "}
          {config.rewardType === "credit" ? "in wallet credit" : "as a promo code"}{" "}
          for every friend who places their first order
          {config.minOrderValue > 0 && ` of $${config.minOrderValue}+`}.
        </p>
      </div>

      {/* Referral Code */}
      <div className="rounded-lg border p-6">
        <h2 className="mb-3 text-lg font-semibold">Your Referral Code</h2>
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-md border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-center font-mono text-lg font-bold tracking-wider">
            {referralInfo.referralCode}
          </div>
          <button
            onClick={handleCopyCode}
            className="rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm text-muted-foreground">
            Or share this link:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={referralInfo.shareUrl}
              className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm"
            />
            <button
              onClick={handleCopyLink}
              className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
            >
              Copy Link
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold">{referralInfo.totalReferrals}</div>
          <div className="text-xs text-muted-foreground">Friends Referred</div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {referralInfo.successfulReferrals}
          </div>
          <div className="text-xs text-muted-foreground">Successful</div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-primary">
            ${referralInfo.totalEarned.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">Total Earned</div>
        </div>
      </div>

      {/* How It Works */}
      <div className="rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-semibold">How It Works</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
              1
            </div>
            <div className="text-sm font-medium">Share Your Code</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Send your referral code or link to friends
            </div>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
              2
            </div>
            <div className="text-sm font-medium">Friend Signs Up</div>
            <div className="mt-1 text-xs text-muted-foreground">
              They create an account using your code
            </div>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
              3
            </div>
            <div className="text-sm font-medium">Earn Rewards</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Get ${config.rewardAmount.toFixed(2)} when they place their first order
            </div>
          </div>
        </div>
      </div>

      {/* Referral History */}
      {referralInfo.referrals.length > 0 && (
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">Referral History</h2>
          <div className="space-y-3">
            {referralInfo.referrals.map((ref) => (
              <div
                key={ref.id}
                className="flex items-center justify-between border-b pb-2 last:border-0"
              >
                <div>
                  <div className="text-sm">
                    {ref.referredEmail ?? "Pending signup"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(ref.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium">
                    {statusLabels[ref.status] ?? ref.status}
                  </span>
                  {ref.rewardAmount && (
                    <div className="text-xs text-green-600">
                      +${ref.rewardAmount.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
