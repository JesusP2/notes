import { createFileRoute } from "@tanstack/react-router";
import { CanvasEditor } from "@/components/canvas/canvas-editor";

export const Route = createFileRoute("/_/canvas/$canvasId")({
  component: CanvasPage,
});

function CanvasPage() {
  const { canvasId } = Route.useParams();
  return <CanvasEditor key={canvasId} canvasId={canvasId} />;
}
