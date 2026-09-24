"use client";

import { useState } from "react";
import type { GraphEdge, GraphNode } from "@/lib/types";

export function ClinicalGraph({
  nodes,
  edges,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
}) {
  const [selected, setSelected] = useState<string | null>(nodes[0]?.id ?? null);
  const active = nodes.find((node) => node.id === selected) ?? null;
  const links = edges.filter((edge) => edge.source_node_id === selected || edge.target_node_id === selected);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Clinical graph</p>
        <p className="mt-1 text-sm text-slate-500">
          Relationships come from stored visits, reports, allergies, and medications. The graph does not add a conclusion.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {nodes.map((node) => (
            <button
              key={node.id}
              type="button"
              onClick={() => setSelected(node.id)}
              className={`rounded-full px-3 py-1.5 text-sm ${
                node.id === selected ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {node.node_type}: {node.label}
            </button>
          ))}
        </div>
      </div>
      <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected node</p>
        {active ? (
          <>
            <p className="mt-2 text-lg font-semibold text-slate-900">{active.label}</p>
            <p className="text-sm text-slate-500">{active.node_type}</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {links.map((edge) => {
                const otherId = edge.source_node_id === active.id ? edge.target_node_id : edge.source_node_id;
                const other = nodes.find((node) => node.id === otherId);
                return (
                  <li key={edge.id}>
                    {edge.relationship} → {other?.label ?? otherId}
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Select a node.</p>
        )}
      </aside>
    </div>
  );
}
