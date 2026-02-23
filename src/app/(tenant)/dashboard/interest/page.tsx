import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getServiceAreaInterests } from "./actions";
import { InterestList } from "./interest-list";

export default async function ServiceAreaInterestPage() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const interests = await getServiceAreaInterests();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Service Area Interests</h1>
        <p className="mt-1 text-muted-foreground">
          People who checked addresses outside your service area and left their email.
        </p>
      </div>
      <InterestList interests={interests} />
    </div>
  );
}
