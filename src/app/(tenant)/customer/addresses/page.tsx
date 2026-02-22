import { getCustomerAddresses } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { AddressList } from "./address-list";

export default async function AddressesPage() {
  const addresses = await getCustomerAddresses();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Addresses</h1>
        <p className="text-muted-foreground text-sm">
          Manage your pickup and delivery addresses.
        </p>
      </div>

      {addresses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No addresses saved yet. Add one to get started.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <AddressList initialAddresses={addresses} />
    </div>
  );
}
