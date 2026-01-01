import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, { type ForceGraphMethods, type NodeObject } from "react-force-graph-2d";
import type { Edge, Node } from "@/db/schema/graph";
import { useGraphData } from "@/lib/graph-hooks";
import { GraphNodePreview } from "./graph-node-preview";

interface GraphNode {
  id: string;
  name: string;
  type: Node["type"];
  color: string;
  val: number;
}

interface GraphLink {
  source: string;
  target: string;
  type: Edge["type"];
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const NODE_COLORS: Record<Node["type"], string> = {
  note: "#3b82f6",
  folder: "#f59e0b",
  tag: "#22c55e",
};

const NODE_SIZES: Record<Node["type"], number> = {
  note: 4,
  folder: 6,
  tag: 3,
};

export function GraphView() {
  const { nodes, edges } = useGraphData();
  const navigate = useNavigate();
  const graphRef = useRef<ForceGraphMethods<NodeObject<GraphNode>>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const graphData: GraphData = useMemo(() => {
    const graphNodes: GraphNode[] = nodes.map((node) => ({
      id: node.id,
      name: node.title,
      type: node.type,
      color: NODE_COLORS[node.type],
      val: NODE_SIZES[node.type],
    }));

    const graphLinks: GraphLink[] = edges.map((edge) => ({
      source: edge.sourceId,
      target: edge.targetId,
      type: edge.type,
    }));

    return { nodes: graphNodes, links: graphLinks };
  }, [nodes, edges]);

  const nodesById = useMemo(() => {
    const map = new Map<string, Node>();
    for (const node of nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [nodes]);

  const handleNodeClick = useCallback(
    (graphNode: NodeObject<GraphNode>, event: MouseEvent) => {
      const node = nodesById.get(graphNode.id as string);
      if (node) {
        setSelectedNode(node);
        setPreviewPosition({ x: event.clientX, y: event.clientY });
      }
    },
    [nodesById],
  );

  const handleClosePreview = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleNavigateToNote = useCallback(() => {
    if (selectedNode?.type === "note") {
      navigate({ to: "/notes/$noteId", params: { noteId: selectedNode.id } });
    }
    setSelectedNode(null);
  }, [selectedNode, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      graphRef.current?.zoomToFit(400, 50);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div ref={containerRef} className="relative h-full w-full bg-background">
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        nodeColor={(node) => node.color}
        nodeLabel={(node) => node.name}
        nodeVal={(node) => node.val}
        onNodeClick={handleNodeClick}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        linkColor={() => "rgba(150, 150, 150, 0.4)"}
        backgroundColor="transparent"
        nodeCanvasObjectMode={() => "after"}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.name;
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "rgba(200, 200, 200, 0.9)";
          const x = node.x ?? 0;
          const y = node.y ?? 0;
          ctx.fillText(label, x, y + (node.val ?? 4) + fontSize);
        }}
      />
      {selectedNode && (
        <GraphNodePreview
          node={selectedNode}
          position={previewPosition}
          onClose={handleClosePreview}
          onNavigate={handleNavigateToNote}
        />
      )}
    </div>
  );
}
