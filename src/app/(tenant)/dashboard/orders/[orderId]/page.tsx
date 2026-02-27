import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getOrderDetail } from "../actions";
import { OrderDetailView } from "./order-detail-view";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Props {
  params: Promise<{ orderId: string }>;
}

export default async function OrderDetailPage({ params }: Props) {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const { orderId } = await params;
  const order = await getOrderDetail(orderId);

  if (!order) notFound();

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/dashboard/orders"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Orders
          </Link>
          <h1 className="text-xl font-bold">Order {order.orderNumber}</h1>
        </div>
      </header>
      <div className="mx-auto max-w-4xl p-6">
        <OrderDetailView order={order as Parameters<typeof OrderDetailView>[0]["order"]} />
      </div>
    </main>
  );
}
