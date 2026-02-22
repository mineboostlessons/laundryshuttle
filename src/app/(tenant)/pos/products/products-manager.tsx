"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  createRetailProduct,
  updateRetailProduct,
  deleteRetailProduct,
} from "../actions";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Package,
  Search,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface RetailProduct {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  sku: string | null;
  price: number;
  costPrice: number | null;
  imageUrl: string | null;
  category: string | null;
  inStock: boolean;
  stockQuantity: number | null;
  taxable: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductFormData {
  name: string;
  description: string;
  sku: string;
  price: string;
  costPrice: string;
  category: string;
  taxable: boolean;
  stockQuantity: string;
  sortOrder: string;
}

const emptyForm: ProductFormData = {
  name: "",
  description: "",
  sku: "",
  price: "",
  costPrice: "",
  category: "",
  taxable: true,
  stockQuantity: "",
  sortOrder: "0",
};

// =============================================================================
// Component
// =============================================================================

export function RetailProductsManager({
  initialProducts,
}: {
  initialProducts: RetailProduct[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [products, setProducts] = useState(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<RetailProduct | null>(
    null
  );
  const [form, setForm] = useState<ProductFormData>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  // Filter products
  const query = searchQuery.toLowerCase();
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(query) ||
      (p.sku?.toLowerCase().includes(query) ?? false) ||
      (p.category?.toLowerCase().includes(query) ?? false)
  );

  // Group by category
  const byCategory = filteredProducts.reduce<Record<string, RetailProduct[]>>(
    (acc, p) => {
      const cat = p.category ?? "Uncategorized";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(p);
      return acc;
    },
    {}
  );

  const openCreate = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (product: RetailProduct) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description ?? "",
      sku: product.sku ?? "",
      price: product.price.toString(),
      costPrice: product.costPrice?.toString() ?? "",
      category: product.category ?? "",
      taxable: product.taxable,
      stockQuantity: product.stockQuantity?.toString() ?? "",
      sortOrder: product.sortOrder.toString(),
    });
    setError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    setError(null);

    const payload = {
      name: form.name,
      description: form.description || undefined,
      sku: form.sku || undefined,
      price: parseFloat(form.price),
      costPrice: form.costPrice ? parseFloat(form.costPrice) : undefined,
      category: form.category || undefined,
      taxable: form.taxable,
      stockQuantity: form.stockQuantity
        ? parseInt(form.stockQuantity, 10)
        : undefined,
      sortOrder: parseInt(form.sortOrder, 10) || 0,
    };

    if (!payload.name || isNaN(payload.price) || payload.price <= 0) {
      setError("Name and a valid price are required.");
      return;
    }

    if (editingProduct) {
      const result = await updateRetailProduct({
        id: editingProduct.id,
        ...payload,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
    } else {
      const result = await createRetailProduct(payload);
      if (!result.success) {
        setError(result.error);
        return;
      }
    }

    setShowForm(false);
    startTransition(() => router.refresh());
    // Optimistic — refetch
    const updated = await import("../actions").then((m) =>
      m.getAllRetailProducts()
    );
    setProducts(updated);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this product from POS? (It will be marked out of stock)"))
      return;

    const result = await deleteRetailProduct(id);
    if (result.success) {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, inStock: false } : p))
      );
    }
  };

  const handleToggleStock = async (product: RetailProduct) => {
    const result = await updateRetailProduct({
      id: product.id,
      inStock: !product.inStock,
    });
    if (result.success) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, inStock: !p.inStock } : p
        )
      );
    }
  };

  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-background px-6 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/pos")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to POS
          </Button>
          <div>
            <h1 className="text-lg font-bold">Retail Products</h1>
            <p className="text-sm text-muted-foreground">
              {products.length} products
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Add Product
        </Button>
      </header>

      {/* Search */}
      <div className="border-b px-6 py-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Product list */}
      <div className="flex-1 overflow-y-auto p-6">
        {Object.keys(byCategory).length === 0 ? (
          <div className="flex flex-col items-center py-12 text-muted-foreground">
            <Package className="mb-2 h-8 w-8" />
            <p className="text-sm">
              {searchQuery ? "No products match your search" : "No retail products yet"}
            </p>
            {!searchQuery && (
              <Button variant="outline" className="mt-3" onClick={openCreate}>
                <Plus className="mr-1 h-4 w-4" />
                Add your first product
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(byCategory).map(([cat, items]) => (
              <div key={cat}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {cat}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((product) => (
                    <Card
                      key={product.id}
                      className={cn(
                        "p-4",
                        !product.inStock && "opacity-60"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{product.name}</p>
                          {product.sku && (
                            <p className="text-xs text-muted-foreground">
                              SKU: {product.sku}
                            </p>
                          )}
                          {product.description && (
                            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                              {product.description}
                            </p>
                          )}
                        </div>
                        <div className="ml-2 text-right">
                          <p className="font-semibold">
                            {formatCurrency(product.price)}
                          </p>
                          {product.costPrice !== null && (
                            <p className="text-xs text-muted-foreground">
                              Cost: {formatCurrency(product.costPrice)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <Badge
                          variant={product.inStock ? "secondary" : "outline"}
                          className="cursor-pointer"
                          onClick={() => handleToggleStock(product)}
                        >
                          {product.inStock ? "In Stock" : "Out of Stock"}
                        </Badge>
                        {product.stockQuantity !== null && (
                          <Badge variant="outline">
                            Qty: {product.stockQuantity}
                          </Badge>
                        )}
                        {product.taxable && (
                          <Badge variant="outline">Taxable</Badge>
                        )}
                        <div className="flex-1" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(product)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Product" : "New Product"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? "Update product details."
                : "Add a new retail product to your POS catalog."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Detergent Pod Pack"
                />
              </div>

              <div>
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                  placeholder="5.99"
                />
              </div>

              <div>
                <Label htmlFor="costPrice">Cost Price</Label>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.costPrice}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, costPrice: e.target.value }))
                  }
                  placeholder="3.50"
                />
              </div>

              <div>
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={form.sku}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sku: e.target.value }))
                  }
                  placeholder="DET-001"
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                  placeholder="Supplies"
                />
              </div>

              <div>
                <Label htmlFor="stockQuantity">Stock Quantity</Label>
                <Input
                  id="stockQuantity"
                  type="number"
                  min="0"
                  value={form.stockQuantity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, stockQuantity: e.target.value }))
                  }
                  placeholder="Leave empty for unlimited"
                />
              </div>

              <div>
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sortOrder: e.target.value }))
                  }
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Optional description"
                />
              </div>

              <div className="col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.taxable}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, taxable: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm">Taxable</span>
                </label>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {editingProduct ? "Save Changes" : "Create Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
