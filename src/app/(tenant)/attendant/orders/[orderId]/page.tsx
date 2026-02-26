import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getAttendantOrderDetail } from "../../actions";
import { AttendantOrderDetailView } from "./attendant-order-detail-view";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Props {
  params: Promise<{ orderId: string }>;
}

export default async function AttendantOrderDetailPage({ params }: Props) {
  await requireRole(UserRole.OWNER, UserRole.MANAGER, UserRole.ATTENDANT);
  const { orderId } = await params;
  const data = await getAttendantOrderDetail(orderId);

  if (!data) notFound();

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/attendant"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Order Queue
          </Link>
          <h1 className="text-xl font-bold">Order {data.order.orderNumber}</h1>
        </div>
      </header>
      <div className="mx-auto max-w-4xl p-6">
        <AttendantOrderDetailView
          order={data.order}
          equipment={data.equipment}
          services={data.services}
        />
      </div>
    </main>
  );
}
