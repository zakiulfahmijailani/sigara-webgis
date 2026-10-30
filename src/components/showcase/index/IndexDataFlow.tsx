'use client';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DATA_SOURCES, PILLARS, VARIABLE_BLUEPRINTS } from '@/lib/sigara-index-sources';
import { buildSankeyGraph, type SankeyNode, type SankeyLink } from '@/lib/sigara-index-graph';
import type { PillarId, EpisodeIndexExplanation } from '@/lib/sigara-index-types';
import { Sparkles, Info, Filter, ArrowRight, ExternalLink } from 'lucide-react';

type Props = {
  explanation?: EpisodeIndexExplanation | null;
  mode?: 'structure' | 'contribution';
  globalTitle?: string;
  onNavigateToGeoAI?: () => void;
  hasGeoAIImage?: boolean;
};

export default function IndexDataFlow({
  explanation,
  mode = 'structure',
  globalTitle = 'Aliran Data SIGARA Index — Transparansi Metodologi',
  onNavigateToGeoAI,
  hasGeoAIImage = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1050);
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  // Measure container width responsively
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry?.contentRect?.width) {
        setContainerWidth(Math.max(340, Math.floor(entry.contentRect.width)));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const effectiveMode = explanation ? explanation.graphMode : mode;
  const height = 710;

  // Build graph data
  const graph = useMemo(() => {
    const pillarContribs: Record<PillarId, number | null> = {
      services: null,
      patterns: null,
      geoai: null,
      access: null,
    };

    if (explanation) {
      explanation.pillars.forEach((p) => {
        pillarContribs[p.id] = p.contributionPoints;
      });
    }

    return buildSankeyGraph(
      containerWidth,
      height,
      effectiveMode,
      pillarContribs,
      explanation?.score ?? null
    );
  }, [containerWidth, height, effectiveMode, explanation]);

  // Compute set of connected node IDs based on selected source or hovered node
  const activeIds = useMemo(() => {
    const set = new Set<string>();
    set.add('index');

    if (activeNodeId) {
      set.add(activeNodeId);
      // Add incoming/outgoing connected nodes
      graph.links.forEach((l) => {
        if (l.sourceId === activeNodeId) set.add(l.targetId);
        if (l.targetId === activeNodeId) set.add(l.sourceId);
      });
      return set;
    }

    if (selectedSource === 'all') {
      graph.nodes.forEach((n) => set.add(n.id));
      return set;
    }

    // Filter by selected source
    set.add(selectedSource);
    const relatedVars = VARIABLE_BLUEPRINTS.filter((v) => v.sourceId === selectedSource);
    relatedVars.forEach((v) => {
      set.add(v.id);
      set.add(v.pillarId);
    });

    return set;
  }, [selectedSource, activeNodeId, graph]);

  // Description text in the details box
  const activeDetailText = useMemo(() => {
    if (activeNodeId) {
      const node = graph.nodes.find((n) => n.id === activeNodeId);
      if (node) {
        if (node.kind === 'source') {
          const s = DATA_SOURCES.find((x) => x.id === node.id);
          return `${s?.name}: ${s?.description} [Status: ${s?.statusBadge}]`;
        }
        if (node.kind === 'variable') {
          const v = VARIABLE_BLUEPRINTS.find((x) => x.id === node.id);
          return `Variabel “${node.name}”: ${v?.method} → ${PILLARS[v!.pillarId].name}.`;
        }
        if (node.kind === 'pillar') {
          const p = PILLARS[node.id as PillarId];
          return `Pilar “${p.name}”: ${p.description}`;
        }
        return 'SIGARA Index: Indeks prioritas penelaahan rujukan terpadu (skala 0–100).';
      }
    }

    if (selectedSource !== 'all') {
      const s = DATA_SOURCES.find((x) => x.id === selectedSource);
      return s ? `${s.name}: ${s.description}` : '';
    }

    return 'GeoAI menjadi pilar utama pembentuk model multipilar bersama kesesuaian layanan, akses geografis, serta pola dan pembenaran rujukan.';
  }, [activeNodeId, selectedSource, graph.nodes]);

  // Cubic bezier path generator for horizontal ribbon
  const linkPath = (l: SankeyLink) => {
    const dx = (l.x1 - l.x0) * 0.45;
    return `M ${l.x0} ${l.y0} C ${l.x0 + dx} ${l.y0}, ${l.x1 - dx} ${l.y1}, ${l.x1} ${l.y1}`;
  };

  const isMobile = containerWidth < 680;

  return (
    <section
      id="index-data-flow"
      ref={containerRef}
      className="index-data-flow-container"
      aria-label="Aliran Data SIGARA Index dan Transparansi Metodologi"
    >
      <div className="flow-header">
        <div>
          <span className="flow-kicker">DATA FLOW — TRANSPARANSI METODOLOGI</span>
          <h2>{globalTitle}</h2>
          <p className="flow-subtitle">
            Sumber data → variabel turunan → pilar penelaahan → SIGARA Index per episode.
          </p>
        </div>

        {/* Source Filter Picker */}
        <div className="flow-controls">
          <label className="picker-label">
            <Filter size={14} />
            <span>Telusuri sumber:</span>
            <select
              value={selectedSource}
              onChange={(e) => {
                setSelectedSource(e.target.value);
                setActiveNodeId(null);
              }}
              aria-label="Telusuri sumber data pada diagram Sankey"
            >
              <option value="all">Semua sumber (8 sumber)</option>
              {DATA_SOURCES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.number} · {s.shortLabel}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="flow-banner">
        <span className="schematic-badge">
          {effectiveMode === 'structure' ? (
            <>
              <strong>Struktur model — bukan kontribusi skor satu episode.</strong> Ketebalan aliran ilustratif; bukan bobot atau kontribusi skor aktual.
            </>
          ) : (
            <>
              <strong>Kontribusi episode terukur.</strong> Lebar ribbon pilar → indeks mencerminkan kontribusi poin aktual yang menyusun skor final.
            </>
          )}
        </span>
      </div>

      {/* Interactive Surface */}
      <div className="flow-surface">
        {isMobile ? (
          /* Mobile Vertical Fallback View */
          <div className="flow-mobile-view" aria-label="Aliran sumber dan pilar untuk layar kecil">
            {(['services', 'patterns', 'geoai', 'access'] as PillarId[]).map((pid) => {
              const meta = PILLARS[pid];
              const vars = VARIABLE_BLUEPRINTS.filter((v) => v.pillarId === pid);
              const isPillarActive = activeIds.has(pid);

              return (
                <div
                  key={pid}
                  className="mobile-pillar-lane"
                  style={{
                    borderLeftColor: meta.color,
                    opacity: isPillarActive ? 1 : 0.4,
                  }}
                >
                  <div className="lane-header">
                    <span className="lane-dot" style={{ backgroundColor: meta.color }} />
                    <h4>{meta.name}</h4>
                  </div>
                  <ul className="lane-var-list">
                    {vars.map((v) => {
                      const src = DATA_SOURCES.find((s) => s.id === v.sourceId);
                      const isVarActive = selectedSource === 'all' || selectedSource === v.sourceId;
                      return (
                        <li key={v.id} style={{ opacity: isVarActive ? 1 : 0.4 }}>
                          <div className="var-source-tag">{src?.shortLabel}</div>
                          <div className="var-title">→ {v.name}</div>
                          <span className="var-method-sub">{v.method}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
            <div className="mobile-flow-end">
              <span>Keempat Pilar → SIGARA Index</span>
            </div>
          </div>
        ) : (
          /* Full Desktop / Tablet Interactive SVG Sankey */
          <div className="svg-wrapper">
            <svg
              className="sankey-svg"
              width={containerWidth}
              height={height}
              viewBox={`0 0 ${containerWidth} ${height}`}
              role="img"
              aria-label="Sankey diagram delapan sumber data, variabel turunan, empat pilar, dan SIGARA Index"
            >
              <title>Aliran Data SIGARA Index Delapan Sumber</title>
              <desc>
                Diagram Sankey interaktif yang memetakan ketergantungan dari delapan sumber data ke variabel, empat pilar, dan indeks per episode.
              </desc>

              {/* Column Headings */}
              <g className="headings-group">
                <text x={140} y={22} className="col-heading text-left">
                  1. SUMBER DATA (8)
                </text>
                <text x={140 + (containerWidth - 225) * 0.38} y={22} className="col-heading text-left">
                  2. VARIABEL TURUNAN
                </text>
                <text x={140 + (containerWidth - 225) * 0.72} y={22} className="col-heading text-left">
                  3. PILAR UTAMA (4)
                </text>
                <text x={containerWidth - 85} y={22} className="col-heading text-right">
                  4. HASIL INDEKS
                </text>
              </g>

              {/* Links (Ribbons) */}
              <g className="links-group">
                {graph.links.map((link) => {
                  const isLinkActive =
                    activeIds.has(link.sourceId) && activeIds.has(link.targetId);
                  const opacity =
                    selectedSource === 'all' && !activeNodeId
                      ? 0.28
                      : isLinkActive
                      ? 0.72
                      : 0.05;

                  return (
                    <path
                      key={link.id}
                      d={linkPath(link)}
                      fill="none"
                      stroke={link.color}
                      strokeWidth={Math.max(1.2, link.width)}
                      strokeOpacity={opacity}
                      strokeLinecap="round"
                      className="sankey-ribbon"
                    />
                  );
                })}
              </g>

              {/* Nodes */}
              <g className="nodes-group">
                {graph.nodes.map((node) => {
                  const isNodeActive = activeIds.has(node.id);
                  const isLeftAlign = node.column <= 1;
                  const textX = isLeftAlign ? node.x0 - 10 : node.x1 + 10;
                  const textAnchor = isLeftAlign ? 'end' : 'start';
                  const midY = (node.y0 + node.y1) / 2;

                  return (
                    <g
                      key={node.id}
                      className={`sankey-node ${isNodeActive ? 'active' : 'dimmed'}`}
                      tabIndex={0}
                      role="button"
                      aria-label={`${node.name} (${node.kind})`}
                      onMouseEnter={() => setActiveNodeId(node.id)}
                      onMouseLeave={() => setActiveNodeId(null)}
                      onFocus={() => setActiveNodeId(node.id)}
                      onBlur={() => setActiveNodeId(null)}
                      onClick={() => {
                        if (node.kind === 'source') {
                          setSelectedSource(node.id === selectedSource ? 'all' : node.id);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (node.kind === 'source') {
                            setSelectedSource(node.id === selectedSource ? 'all' : node.id);
                          }
                        }
                      }}
                    >
                      {/* Node Rect */}
                      <rect
                        x={node.x0}
                        y={node.y0}
                        width={8}
                        height={Math.max(3, node.y1 - node.y0)}
                        fill={node.color}
                        opacity={isNodeActive ? 1 : 0.25}
                        rx={2}
                      />

                      {/* Multiline Text */}
                      <text
                        x={textX}
                        y={midY - (node.lines.length - 1) * 6.5}
                        textAnchor={textAnchor}
                        dominantBaseline="middle"
                        opacity={isNodeActive ? 1 : 0.35}
                        fontWeight={node.kind === 'pillar' || node.kind === 'index' ? 600 : 400}
                        fontSize={node.kind === 'index' ? 13 : 11}
                        fill="currentColor"
                      >
                        {node.lines.map((line, lIdx) => (
                          <tspan key={lIdx} x={textX} dy={lIdx === 0 ? 0 : 13}>
                            {line}
                          </tspan>
                        ))}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        )}

        {/* Dynamic Detail Callout Footer */}
        <div className="flow-detail-callout" aria-live="polite">
          <div className="detail-inner">
            <Info size={16} className="detail-icon" />
            <p className="detail-text">{activeDetailText}</p>
          </div>

          {/* Bidirectional Link to GeoAI Viewer if related to Copernicus / GeoAI */}
          {(activeNodeId === 'satellite' ||
            activeNodeId === 'water' ||
            activeNodeId === 'vegetation' ||
            activeNodeId === 'burn' ||
            activeNodeId === 'geoai' ||
            selectedSource === 'satellite') && (
            <div className="geoai-shortcut-bar">
              {hasGeoAIImage && onNavigateToGeoAI ? (
                <button
                  type="button"
                  className="geoai-action-btn"
                  onClick={onNavigateToGeoAI}
                >
                  <Sparkles size={14} />
                  <span>Lihat bukti GeoAI pada episode ini</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <span className="geoai-unavail-note">
                  <Info size={13} />
                  {hasGeoAIImage
                    ? 'Buka tab Bukti GeoAI untuk memeriksa citra Sentinel-2 dan overlay spektral.'
                    : 'Episode ini belum memiliki aset raster ilustrasi penginderaan jauh.'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Legend & Provenance Footnote */}
      <div className="flow-footer-legend">
        <div className="legend-items">
          <span className="legend-chip">
            <i style={{ backgroundColor: PILLARS.services.color }} />
            {PILLARS.services.name}
          </span>
          <span className="legend-chip">
            <i style={{ backgroundColor: PILLARS.patterns.color }} />
            {PILLARS.patterns.name}
          </span>
          <span className="legend-chip">
            <i style={{ backgroundColor: PILLARS.geoai.color }} />
            {PILLARS.geoai.name}
          </span>
          <span className="legend-chip">
            <i style={{ backgroundColor: PILLARS.access.color }} />
            {PILLARS.access.name}
          </span>
          <span className="legend-chip">
            <i style={{ backgroundColor: '#20a897' }} />
            SIGARA Index (Hasil Akhir)
          </span>
        </div>
        <p className="footnote-p">
          Pengayaan sintetis mengisi variabel skenario untuk pengujian alur, bukan bukti independen tambahan. Status observasi, tanggal citra, dan kualitas cakupan dicatat transparan pada setiap variabel.
        </p>
      </div>
    </section>
  );
}
