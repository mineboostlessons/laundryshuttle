import type { Metadata } from "next";
import { getBenchmarks } from "./actions";
import { BenchmarksView } from "./benchmarks-view";

export const metadata: Metadata = {
  title: "Performance Benchmarks",
};

export default async function BenchmarksPage() {
  const data = await getBenchmarks("monthly");
  return <BenchmarksView initialData={data} />;
}
