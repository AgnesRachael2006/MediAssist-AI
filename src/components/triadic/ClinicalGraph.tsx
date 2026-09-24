"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ListFilter, Maximize2, Minimize2, Minus, Plus, RefreshCw, RotateCcw, Scan, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import type { GraphEdge, GraphNode } from "@/lib/types";
import {
  buildGraphModel,
  FILTERABLE_KINDS,
  KIND_META,
  linkGeometry,
  modelBounds,
  type EntityKind,
  type GraphContext,
  type GraphEntity,
  type GraphModel,
} from "./clinicalGraphModel";
import { ClinicalGraphInspector } from "./ClinicalGraphInspector";
import { ClinicalGraphNode } from "./ClinicalGraphNode";

type View = { x: number; y: number; k: number };
type Size = { w: number; h: number };

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2;
const PANEL_W = 360;
const GRID = 24;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/* Width/height of the canvas area the inspector does not cover. */
function visibleArea(size: Size, panelOpen: boolean) {
  if (!panelOpen) return { w: size.w, h: size.h };
  return size.w >= 640 ? { w: size.w - PANEL_W, h: size.h } : { w: size.w, h: size.h * 0.38 };
}

function fitView(entities: GraphEntity[], model: GraphModel, size: Size, panelOpen: boolean): View {
  const bounds = modelBounds(entities, model.captions);
  const area = visibleArea(size, panelOpen);
  const pad = size.w < 640 ? 20 : 36;
  let k = clamp(
    Math.min((area.w - pad * 2) / (bounds.maxX - bounds.minX), (area.h - pad * 2) / (bounds.maxY - bounds.minY)),
    MIN_ZOOM,
    1,
  );
  // On narrow screens keep records legible and let the user pan instead.
  if (size.w < 640) k = Math.max(k, 0.6);
  return {
    k,
    x: (area.w - (bounds.maxX - bounds.minX) * k) / 2 - bounds.minX * k,
    y: (area.h - (bounds.maxY - bounds.minY) * k) / 2 - bounds.minY * k,
  };
}

function zoomAt(view: View, factor: number, px: number, py: number): View {
  const k = clamp(view.k * factor, MIN_ZOOM, MAX_ZOOM);
  return { k, x: px - ((px - view.x) * k) / view.k, y: py - ((py - view.y) * k) / view.k };
}

export function ClinicalGraph({
  nodes,
  edges,
  context,
  title,
  description,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  context: GraphContext;
  title?: string;
  description?: string;
}) {
  const built = useMemo(() => {
    try {
      return { model: buildGraphModel({ nodes, edges }, context), error: null };
    } catch (error) {
      return { model: null, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }, [nodes, edges, context]);
  const model = built.model;

  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View | null>(null);
  const dragRef = useRef<{ px: number; py: number; view: View; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);
  const animTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [size, setSize] = useState<Size | null>(null);
  // null = follow "fit to screen" until the user pans or zooms.
  const [manualView, setManualView] = useState<View | null>(null);
  const [animating, setAnimating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelId, setPanelId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hidden, setHidden] = useState<EntityKind[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const entities = useMemo(
    () => (model ? model.entities.filter((entity) => !hidden.includes(entity.kind)) : []),
    [model, hidden],
  );
  const byId = useMemo(() => new Map(entities.map((entity) => [entity.id, entity])), [entities]);
  const links = useMemo(
    () => (model ? model.links.filter((link) => byId.has(link.source) && byId.has(link.target)) : []),
    [model, byId],
  );
  const captions = model
    ? model.captions.filter((caption) =>
        caption.id === "timeline"
          ? !hidden.includes("visit")
          : caption.id === "issues"
            ? !hidden.includes("issue")
            : !(hidden.includes("medication") && hidden.includes("allergy")),
      )
    : [];

  const activeId = selectedId && byId.has(selectedId) ? selectedId : null;
  const panelOpen = activeId !== null;
  const fitted = size && model ? fitView(entities, model, size, false) : null;
  const view = manualView ?? fitted ?? { x: 0, y: 0, k: 1 };

  // Selection lights the entity, its direct neighbours, and the chain back to the patient.
  const lit = useMemo(() => {
    const focus = activeId ?? hoverId;
    if (!focus) return null;
    const ids = new Set([focus]);
    const linkIds = new Set<string>();
    for (const link of links) {
      if (link.source === focus || link.target === focus) {
        linkIds.add(link.id);
        ids.add(link.source);
        ids.add(link.target);
      }
    }
    const queue = [focus];
    const seen = new Set(queue);
    while (queue.length) {
      const current = queue.shift()!;
      for (const link of links) {
        if (link.target !== current || link.relationship === "FOLLOWED_BY" || seen.has(link.source)) continue;
        seen.add(link.source);
        ids.add(link.source);
        linkIds.add(link.id);
        queue.push(link.source);
      }
    }
    return { ids, linkIds, fromHover: !activeId };
  }, [activeId, hoverId, links]);

  useEffect(() => {
    viewRef.current = view;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [built.error]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (event: WheelEvent) => {
      const current = viewRef.current;
      if (!current) return;
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const factor = Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0015));
      setAnimating(false);
      setManualView(zoomAt(current, factor, event.clientX - rect.left, event.clientY - rect.top));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [built.error]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => () => clearTimeout(animTimer.current), []);

  function animateTo(next: View | null) {
    clearTimeout(animTimer.current);
    setAnimating(true);
    setManualView(next);
    animTimer.current = setTimeout(() => setAnimating(false), 420);
  }

  function zoomBy(factor: number) {
    if (!size) return;
    const area = visibleArea(size, panelOpen);
    animateTo(zoomAt(view, factor, area.w / 2, area.h / 2));
  }

  function resetView() {
    setSelectedId(null);
    setFilterOpen(false);
    animateTo(null);
  }

  function select(id: string) {
    if (suppressClickRef.current) return;
    const entity = byId.get(id);
    if (!entity) return;
    setSelectedId(id);
    setPanelId(id);
    if (!size) return;
    // Bring the entity into the part of the canvas the inspector leaves visible.
    const area = visibleArea(size, true);
    const sx = entity.x * view.k + view.x;
    const sy = entity.y * view.k + view.y;
    const halfW = (entity.w / 2) * view.k;
    const halfH = (entity.h / 2) * view.k;
    const margin = 24;
    const hiddenX = sx - halfW < margin || sx + halfW > area.w - margin;
    const hiddenY = sy - halfH < margin || sy + halfH > area.h - margin;
    if (hiddenX || hiddenY) {
      animateTo({
        k: view.k,
        x: hiddenX ? area.w / 2 - entity.x * view.k : view.x,
        y: hiddenY ? area.h / 2 - entity.y * view.k : view.y,
      });
    }
  }

  async function toggleFullscreen() {
    const frame = frameRef.current;
    if (!frame) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await frame.requestFullscreen();
    } catch {
      // Fullscreen can be blocked by the browser; the canvas still works inline.
    }
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    suppressClickRef.current = false;
    dragRef.current = { px: event.clientX, py: event.clientY, view, moved: false };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.px;
    const dy = event.clientY - drag.py;
    if (!drag.moved) {
      if (Math.hypot(dx, dy) < 4) return;
      drag.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setAnimating(false);
    }
    setManualView({ ...drag.view, x: drag.view.x + dx, y: drag.view.y + dy });
  }

  function onPointerUp() {
    suppressClickRef.current = Boolean(dragRef.current?.moved);
    dragRef.current = null;
  }

  function onCanvasClick(event: React.MouseEvent<HTMLDivElement>) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (!(event.target as HTMLElement).closest("[data-graph-node]")) setSelectedId(null);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") setSelectedId(null);
    else if (event.key === "+" || event.key === "=") zoomBy(1.2);
    else if (event.key === "-") zoomBy(1 / 1.2);
    else if (event.key === "0") animateTo(null);
  }

  function toggleKind(kind: EntityKind) {
    setHidden((current) => (current.includes(kind) ? current.filter((item) => item !== kind) : [...current, kind]));
  }

  const reportIds = useMemo(() => new Set(context.reports.map((report) => report.id)), [context.reports]);
  const onlyPatient = model !== null && model.entities.length <= 1;
  const allHidden = !onlyPatient && entities.length <= 1;
  const countByKind = (kind: EntityKind) => model?.entities.filter((entity) => entity.kind === kind).length ?? 0;
  const transition = animating ? "420ms cubic-bezier(0.2, 0.8, 0.2, 1)" : "0ms";

  return (
    <div className="space-y-4">
      <div className={cn("flex flex-wrap items-end gap-3", title ? "justify-between" : "justify-end")}>
        {title ? (
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
            {description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p> : null}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          {model ? (
            <p className="mr-2 flex items-center gap-2 text-xs text-slate-500 tabular-nums">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>
                <span className="font-medium text-slate-700">{entities.length}</span> entities
              </span>
              <span className="text-slate-300">·</span>
              <span>
                <span className="font-medium text-slate-700">{links.length}</span> relationships
              </span>
            </p>
          ) : null}
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((open) => !open)}
              aria-expanded={filterOpen}
              aria-haspopup="true"
              disabled={!model}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-lg border bg-white px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50",
                hidden.length ? "border-indigo-200 text-indigo-700" : "border-slate-200",
              )}
            >
              <ListFilter size={14} />
              Filter
              {hidden.length ? (
                <span className="rounded bg-indigo-50 px-1 text-[11px] tabular-nums">{FILTERABLE_KINDS.length - hidden.length}/{FILTERABLE_KINDS.length}</span>
              ) : null}
            </button>
            {filterOpen ? (
              <>
                <button
                  type="button"
                  aria-label="Close filters"
                  className="fixed inset-0 z-30 cursor-default"
                  onClick={() => setFilterOpen(false)}
                />
                <div className="absolute right-0 top-full z-40 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.25)]">
                  <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Show entities
                  </p>
                  {FILTERABLE_KINDS.map((kind) => {
                    const on = !hidden.includes(kind);
                    return (
                      <button
                        key={kind}
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={on}
                        onClick={() => toggleKind(kind)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
                      >
                        <span
                          className={cn(
                            "flex h-4 w-4 items-center justify-center rounded border",
                            on ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white",
                          )}
                        >
                          {on ? <Check size={11} strokeWidth={3} /> : null}
                        </span>
                        <span className={cn("h-1.5 w-1.5 rounded-full", KIND_META[kind].dot)} />
                        <span className="flex-1">{KIND_META[kind].plural}</span>
                        <span className="text-xs tabular-nums text-slate-400">{countByKind(kind)}</span>
                      </button>
                    );
                  })}
                  {hidden.length ? (
                    <button
                      type="button"
                      onClick={() => setHidden([])}
                      className="mt-1 w-full rounded-lg border-t border-slate-100 px-2.5 py-2 text-left text-xs font-medium text-indigo-700 hover:bg-slate-50"
                    >
                      Show all
                    </button>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
          <button
            type="button"
            onClick={resetView}
            disabled={!model}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RotateCcw size={14} />
            Reset view
          </button>
        </div>
      </div>

      <div
        ref={frameRef}
        className={cn(
          "relative overflow-hidden border border-slate-200 bg-[#f9fafb]",
          fullscreen ? "h-screen w-screen" : "h-[calc(100dvh-12.5rem)] min-h-[560px] rounded-2xl",
        )}
      >
        {built.error ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <TriangleAlert size={18} />
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-900">The clinical graph could not be built</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Some stored records could not be read. Your records are unchanged — reload to try again.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={14} />
              Reload
            </button>
          </div>
        ) : (
          <>
            <div
              ref={canvasRef}
              tabIndex={0}
              aria-label="Clinical knowledge graph canvas. Drag to pan, scroll to zoom, Escape to clear selection."
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onClick={onCanvasClick}
              onKeyDown={onKeyDown}
              className="absolute inset-0 cursor-grab touch-none outline-none active:cursor-grabbing"
              style={{
                backgroundImage: "radial-gradient(circle, #e2e8f0 1px, transparent 1.2px)",
                backgroundSize: `${GRID * view.k}px ${GRID * view.k}px`,
                backgroundPosition: `${view.x}px ${view.y}px`,
                transition: `background-position ${transition}, background-size ${transition}`,
              }}
            >
              {size && model ? (
                <div
                  className="absolute left-0 top-0 origin-top-left"
                  style={{
                    transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
                    transition: `transform ${transition}`,
                  }}
                >
                  <svg className="absolute left-0 top-0 overflow-visible" width={1} height={1} aria-hidden>
                    <defs>
                      {[
                        ["arrow", "#cbd5e1"],
                        ["arrow-lit", "#6366f1"],
                        ["arrow-warn", "#fb7185"],
                      ].map(([id, color]) => (
                        <marker
                          key={id}
                          id={`graph-${id}`}
                          viewBox="0 0 10 10"
                          refX="9"
                          refY="5"
                          markerWidth="7"
                          markerHeight="7"
                          markerUnits="userSpaceOnUse"
                          orient="auto-start-reverse"
                        >
                          <path d="M 1 1.5 L 9 5 L 1 8.5" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </marker>
                      ))}
                    </defs>
                    {links.map((link) => {
                      const source = byId.get(link.source)!;
                      const target = byId.get(link.target)!;
                      const { path } = linkGeometry(link, source, target);
                      const on = lit?.linkIds.has(link.id) ?? false;
                      const strong = on && !lit?.fromHover;
                      const warn = link.tone === "warning";
                      const color = strong ? (warn ? "#e11d48" : "#6366f1") : on ? "#94a3b8" : warn ? "#fda4af" : "#cbd5e1";
                      return (
                        <g key={link.id} style={{ opacity: lit && !lit.fromHover && !on ? 0.3 : 1, transition: "opacity 200ms" }}>
                          <path
                            d={path}
                            fill="none"
                            stroke={color}
                            strokeWidth={strong ? 1.75 : 1.25}
                            strokeDasharray={warn && !strong ? "4 4" : undefined}
                            vectorEffect="non-scaling-stroke"
                            markerEnd={`url(#graph-${strong ? (warn ? "arrow-warn" : "arrow-lit") : warn ? "arrow-warn" : "arrow"})`}
                            style={{ transition: "stroke 200ms, stroke-width 200ms" }}
                          />
                          {strong ? (
                            <path
                              d={path}
                              fill="none"
                              stroke={warn ? "#fecdd3" : "#c7d2fe"}
                              strokeWidth={1.75}
                              strokeDasharray="3 13"
                              strokeLinecap="round"
                              vectorEffect="non-scaling-stroke"
                              className="graph-edge-flow"
                            />
                          ) : null}
                        </g>
                      );
                    })}
                  </svg>

                  {captions.map((caption) => (
                    <div
                      key={caption.id}
                      className="pointer-events-none absolute flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400"
                      style={{ left: caption.x, top: caption.y, width: caption.w }}
                    >
                      {caption.timeline ? (
                        <>
                          <span>Earlier</span>
                          <span className="h-px flex-1 bg-slate-200" />
                          <span className="text-slate-500">Clinical timeline</span>
                          <span className="h-px flex-1 bg-slate-200" />
                          <span>Latest →</span>
                        </>
                      ) : (
                        <span className={cn("flex items-center gap-1.5", caption.id === "safety" && "w-full justify-center")}>
                          {caption.id === "issues" ? <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> : null}
                          {caption.text}
                        </span>
                      )}
                    </div>
                  ))}

                  {links.map((link) => {
                    const { label } = linkGeometry(link, byId.get(link.source)!, byId.get(link.target)!);
                    const on = lit?.linkIds.has(link.id) ?? false;
                    const strong = on && !lit?.fromHover;
                    const warn = link.tone === "warning";
                    return (
                      <span
                        key={link.id}
                        className={cn(
                          "pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-[0.06em] transition-[color,background-color,border-color,opacity] duration-200",
                          strong
                            ? warn
                              ? "border-rose-200 bg-white text-rose-600"
                              : "border-indigo-200 bg-white text-indigo-600"
                            : warn
                              ? "border-rose-100 bg-rose-50 text-rose-500"
                              : "border-transparent bg-[#f9fafb] text-slate-400",
                          lit && !lit.fromHover && !on && "opacity-30",
                        )}
                        style={{ left: label.x, top: label.y }}
                      >
                        {link.label}
                      </span>
                    );
                  })}

                  {entities.map((entity) => (
                    <ClinicalGraphNode
                      key={entity.id}
                      entity={entity}
                      selected={entity.id === activeId}
                      dimmed={Boolean(lit && !lit.fromHover && !lit.ids.has(entity.id))}
                      onSelect={select}
                      onHover={setHoverId}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            {!size ? <LoadingGraph /> : null}

            {size && (onlyPatient || allHidden) ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-20 flex justify-center px-6">
                <div className="pointer-events-auto max-w-sm rounded-xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">
                    {onlyPatient ? "No clinical records linked yet" : "All entity types are hidden"}
                  </p>
                  <p className="mt-1 text-[13px] text-slate-500">
                    {onlyPatient
                      ? "Visits, reports, medications, and allergies appear here once they are stored for this patient."
                      : "Turn entity types back on to see how this patient's records connect."}
                  </p>
                  {allHidden ? (
                    <button
                      type="button"
                      onClick={() => setHidden([])}
                      className="mt-2 text-[13px] font-medium text-indigo-700 hover:text-indigo-800"
                    >
                      Show all
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            <p className="pointer-events-none absolute left-4 top-3.5 hidden text-[11px] text-slate-400 sm:block">
              Links built from stored records · does not diagnose
            </p>

            <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3">
              <div className="flex items-center rounded-xl border border-slate-200 bg-white/95 p-0.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
                <ControlButton label="Zoom out" onClick={() => zoomBy(1 / 1.2)}>
                  <Minus size={14} />
                </ControlButton>
                <button
                  type="button"
                  onClick={() => size && animateTo(zoomAt(view, 1 / view.k, visibleArea(size, panelOpen).w / 2, visibleArea(size, panelOpen).h / 2))}
                  title="Zoom to 100%"
                  className="h-8 w-11 rounded-lg text-[11px] font-medium tabular-nums text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                >
                  {Math.round(view.k * 100)}%
                </button>
                <ControlButton label="Zoom in" onClick={() => zoomBy(1.2)}>
                  <Plus size={14} />
                </ControlButton>
                <span className="mx-0.5 h-4 w-px bg-slate-200" />
                <ControlButton label="Fit to screen" onClick={() => animateTo(size && model ? fitView(entities, model, size, panelOpen) : null)}>
                  <Scan size={14} />
                </ControlButton>
                <ControlButton label={fullscreen ? "Exit full screen" : "Full screen"} onClick={toggleFullscreen}>
                  {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </ControlButton>
              </div>
              <p className="hidden text-[11px] text-slate-400 md:block">Scroll to zoom · drag to pan · click a record to inspect</p>
            </div>

            {model ? (
              <ClinicalGraphInspector
                entity={panelId ? model.entities.find((entity) => entity.id === panelId) : undefined}
                open={panelOpen}
                entities={entities}
                links={links}
                reportIds={reportIds}
                onSelect={select}
                onClose={() => setSelectedId(null)}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function ControlButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900"
    >
      {children}
    </button>
  );
}

function LoadingGraph() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6" aria-live="polite">
      <div className="relative h-40 w-72 animate-pulse">
        <span className="absolute left-1/2 top-1/2 h-12 w-28 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white" />
        {[
          "left-0 top-0",
          "right-0 top-0",
          "left-0 bottom-0",
          "right-0 bottom-0",
          "left-1/2 top-0 -translate-x-1/2",
        ].map((position) => (
          <span key={position} className={cn("absolute h-9 w-20 rounded-lg border border-slate-200 bg-white", position)} />
        ))}
      </div>
      <p className="flex items-center gap-2 text-[13px] text-slate-500">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
        Building clinical graph…
      </p>
    </div>
  );
}
