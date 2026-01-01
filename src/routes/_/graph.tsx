import { createFileRoute } from "@tanstack/react-router";
import { GraphView } from "@/components/graph/graph-view";

export const Route = createFileRoute("/_/graph")({
  component: GraphPage,
});

function GraphPage() {
  return <GraphView />;
}
