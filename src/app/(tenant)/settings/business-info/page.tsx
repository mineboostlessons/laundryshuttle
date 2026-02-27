import { getBusinessInfo } from "./actions";
import { BusinessInfoForm } from "./business-info-form";

export default async function BusinessInfoPage() {
  const data = await getBusinessInfo();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Business Info</h1>
        <p className="text-muted-foreground">
          Update your business details and primary location
        </p>
      </div>

      <BusinessInfoForm initialData={data} />
    </div>
  );
}
