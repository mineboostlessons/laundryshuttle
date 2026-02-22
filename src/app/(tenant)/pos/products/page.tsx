import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getAllRetailProducts } from "../actions";
import { RetailProductsManager } from "./products-manager";

export default async function RetailProductsPage() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const products = await getAllRetailProducts();

  return (
    <div className="flex min-h-screen flex-col">
      <RetailProductsManager initialProducts={products} />
    </div>
  );
}
