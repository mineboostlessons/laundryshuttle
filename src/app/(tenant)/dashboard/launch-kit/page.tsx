import type { Metadata } from "next";
import { getLaunchKitData } from "./actions";
import { LaunchKitView } from "./launch-kit-view";

export const metadata: Metadata = {
  title: "Launch Kit",
};

export default async function LaunchKitPage() {
  const data = await getLaunchKitData();
  return <LaunchKitView data={data} />;
}
