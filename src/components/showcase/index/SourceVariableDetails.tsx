'use client';
import React from 'react';
import type { IndexVariable } from '@/lib/sigara-index-types';
import { PILLARS, DATA_SOURCES } from '@/lib/sigara-index-sources';
import { Database, CheckCircle2, Clock, AlertTriangle, HelpCircle } from 'lucide-react';

type Props = {
  variables: IndexVariable[];
};

export default function SourceVariableDetails({ variables }: Props) {
  const getStatusBadge = (status: IndexVariable['integrationStatus'], avail: IndexVariable['availability']) => {
    if (avail === 'available') {
      return <span className="status-badge available"><CheckCircle2 size={12} /> Tersedia</span>;
    }
    if (avail === 'not_applicable') {
      return <span className="status-badge na">Tidak berlaku untuk kasus ini</span>;
    }
    if (status === 'demo_only') {
      return <span className="status-badge demo">Simulasi Demo</span>;
    }
    return <span className="status-badge planned"><Clock size={12} /> Rencana Integrasi</span>;
  };

  return (
    <div className="source-variable-details" aria-label="Tabel Variabel dan Provenance Sumber Data">
      <div className="details-header">
        <Database size={16} />
        <h4>Inventaris 12 Variabel Penelaahan &amp; Provenance Data</h4>
      </div>

      <div className="table-responsive">
        <table className="variables-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Variabel Turunan</th>
              <th>Sumber Data Asal</th>
              <th>Pilar Tujuan</th>
              <th>Nilai / Status Kasus</th>
              <th>Metode Pengolahan</th>
              <th>Status Integrasi</th>
            </tr>
          </thead>
          <tbody>
            {variables.map((v, i) => {
              const pillarMeta = PILLARS[v.pillarId];
              const sourceMeta = DATA_SOURCES.find((s) => s.id === v.sourceId);

              return (
                <tr key={v.id}>
                  <td>{i + 1}</td>
                  <td>
                    <strong>{v.label}</strong>
                    {v.unit && <span className="unit-sub">({v.unit})</span>}
                  </td>
                  <td>
                    <span className="source-tag">{sourceMeta?.shortLabel || v.sourceName}</span>
                  </td>
                  <td>
                    <span className="pillar-chip" style={{ color: pillarMeta.color, borderColor: pillarMeta.color }}>
                      {pillarMeta.shortName}
                    </span>
                  </td>
                  <td>
                    {v.value !== null ? (
                      <span className="val-text">{String(v.value)}</span>
                    ) : (
                      <span className="val-empty">Belum tersedia</span>
                    )}
                  </td>
                  <td>
                    <span className="method-text">{v.method}</span>
                  </td>
                  <td>
                    {getStatusBadge(v.integrationStatus, v.availability)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
