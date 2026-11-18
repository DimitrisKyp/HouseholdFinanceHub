"use client";

// The column chart in its own JavaScript chunk, loaded only on pages that show it (Insights).
// A Server Component can't code-split a Client Component it imports, so this thin client
// wrapper does it with next/dynamic. The chart is still rendered on the server.
import dynamic from "next/dynamic";
import Skeleton from "@/components/ui/Skeleton";

const ColumnChart = dynamic(() => import("@/components/Insights/ColumnChart"), {
  loading: () => <Skeleton className="h-60 w-full" />,
});

export default function LazyColumnChart(props) {
  return <ColumnChart {...props} />;
}
