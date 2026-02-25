import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getPaymentMethods } from "./actions";
import { PaymentMethodsView } from "./payment-methods-view";

export default async function PaymentMethodsPage() {
  await requireRole(UserRole.CUSTOMER);
  const methods = await getPaymentMethods();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <h1 className="text-2xl font-bold">Payment Methods</h1>
      <p className="mt-1 text-muted-foreground">
        Manage your saved cards for faster checkout.
      </p>
      <div className="mt-6">
        <PaymentMethodsView methods={methods} />
      </div>
    </div>
  );
}
