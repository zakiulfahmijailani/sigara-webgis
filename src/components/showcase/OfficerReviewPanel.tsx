'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, FileText, UserCheck } from 'lucide-react';
import type { Episode } from '@/lib/showcase';
import { loadAgentState, saveAgentState, type AgentReport } from '@/lib/agent-activity';
import { getCaseForEpisode } from '@/lib/clarification-demo';
import { demoStorageAvailable } from '@/lib/demo-storage';
import { approveOfficerReview, emptyOfficerDraft, latestOfficerReport, REVIEW_OPTIONS, REVIEW_REASONS, reviewValidation, type OfficerDecision, type OfficerReviewDraft } from '@/lib/officer-review';
import ReportViewerModal from './ReportViewerModal';

export default function OfficerReviewPanel({ episode }: { episode: Episode }) {
  const [draft, setDraft] = useState(() => emptyOfficerDraft(episode.id));
  const [latest, setLatest] = useState<AgentReport>();
  const [editing, setEditing] = useState(true);
  const [preview, setPreview] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeReport, setActiveReport] = useState<AgentReport | null>(null);

  useEffect(() => {
    const state = loadAgentState();
    const report = latestOfficerReport(state, episode.id);
    setLatest(report);
    setDraft(state.officerDrafts?.[episode.id] || emptyOfficerDraft(episode.id));
    setEditing(Boolean(state.officerDrafts?.[episode.id]) || !report);
    setReady(true);
  }, [episode.id]);

  useEffect(() => {
    if (error) document.getElementById('officer-review-error')?.focus();
    else if (preview) document.getElementById('officer-review-preview')?.focus();
  }, [error, preview]);

  const update = (change: Partial<OfficerReviewDraft>) => {
    setDraft(current => ({ ...current, ...change }));
    setMessage(''); setError(''); setPreview(false);
  };
  const saveDraft = () => {
    const state = loadAgentState();
    saveAgentState({ ...state, officerDrafts: { ...state.officerDrafts, [episode.id]: draft } });
    setMessage(demoStorageAvailable() ? 'Draf tersimpan di browser perangkat ini.' : 'Draf tersimpan sementara. Penyimpanan browser tidak tersedia; perubahan hilang saat halaman dimuat ulang.');
  };
  const approve = () => {
    try {
      const result = approveOfficerReview(loadAgentState(), episode, draft, getCaseForEpisode(episode.id) || undefined);
      saveAgentState(result.state);
      setLatest(result.report); setEditing(false); setPreview(false);
      setMessage(demoStorageAvailable() ? 'Keputusan disahkan dan laporan tersimpan di browser perangkat ini.' : 'Keputusan tersimpan sementara. Cetak laporan sebelum menutup halaman karena penyimpanan browser tidak tersedia.');
      setActiveReport(result.report);
    } catch (e) { setError(e instanceof Error ? e.message : 'Keputusan belum tersimpan.'); }
  };
  const startRevision = () => {
    const report = latestOfficerReport(loadAgentState(), episode.id);
    if (!report?.officerReview) return;
    setLatest(report);
    setDraft({ ...report.officerReview, reasons: [...report.officerReview.reasons], acknowledged: false, baseRevision: report.officerReview.revision });
    setEditing(true); setMessage(''); setError('');
  };
  const selected = draft.decision ? REVIEW_OPTIONS[draft.decision] : null;
  const review = latest?.officerReview;

  return <section id="keputusan-petugas" className="officer-review" aria-labelledby="officer-review-title">
    <div className="officer-review-heading">
      <div><span className="officer-eyebrow"><UserCheck size={16} /> TELAAH MANUSIA</span>
        <h2 id="officer-review-title">Keputusan Petugas</h2>
        <p>Tentukan hasil telaah episode ini. Keputusan, dasar bukti, dan tindak lanjut akan tercantum dalam laporan.</p></div>
      <span className="officer-status">{editing ? 'Draf keputusan' : review?.status === 'final' ? 'Keputusan akhir disahkan' : 'Menunggu tindak lanjut'}</span>
    </div>
    <ol className="officer-steps" aria-label="Tahapan penelaahan"><li>1. Telaah bukti &amp; klarifikasi</li><li aria-current={editing ? 'step' : undefined}>2. Keputusan petugas</li><li aria-current={!editing ? 'step' : undefined}>3. Laporan hasil</li></ol>
    <div className="officer-episode"><strong>{episode.fromName} → {episode.toName}</strong><span>Episode {episode.id}</span></div>
    {message && <p className="officer-feedback" role="status">{message}</p>}
    {error && <p id="officer-review-error" className="officer-error" role="alert" tabIndex={-1}>{error}</p>}
    {!ready ? <p>Memuat telaah…</p> : !editing && review ? <>
      <div className="officer-result"><CheckCircle2 size={24} /><div><h3>{REVIEW_OPTIONS[review.decision].label}</h3><p>{review.notes}</p><p><strong>Tindak lanjut:</strong> {review.followup}</p><small>Disahkan oleh {review.officerName} · {review.officerRole} · {new Date(review.approvedAt).toLocaleString('id-ID')} · Revisi {review.revision}</small></div></div>
      <div className="officer-actions"><button className="officer-primary" onClick={() => setActiveReport(latest!)}><FileText size={16} /> Buka laporan hasil</button><button onClick={startRevision}>Buat revisi keputusan</button></div>
      <p className="officer-storage-note">Tersimpan di browser perangkat ini. Laporan versi sebelumnya tetap tersedia di riwayat.</p>
      <details className="officer-history"><summary>Riwayat keputusan petugas</summary>{Object.values(loadAgentState().reports).filter(r => r.episodeId === episode.id && r.officerReview).sort((a, b) => b.officerReview!.revision - a.officerReview!.revision).map(r => <button key={r.id} onClick={() => setActiveReport(r)}>Revisi {r.officerReview!.revision} · {REVIEW_OPTIONS[r.officerReview!.decision].label} · {r.officerReview!.officerName}</button>)}</details>
    </> : <form onSubmit={event => {
      event.preventDefault(); const errors = reviewValidation(draft);
      if (errors.length) { setError(errors.join(' ')); return; }
      setError(''); setPreview(true);
    }}>
      <fieldset className="officer-choices"><legend>Bagaimana hasil penelaahan Anda?</legend>
        {(Object.entries(REVIEW_OPTIONS) as [OfficerDecision, typeof REVIEW_OPTIONS[OfficerDecision]][]).map(([value, option]) => <label key={value} className={`officer-choice ${draft.decision === value ? 'selected' : ''}`}>
          <input type="radio" name="officer-decision" value={value} checked={draft.decision === value} onChange={() => update({ decision: value, followup: option.followup, acknowledged: false })} required />
          <span><strong>{option.label}</strong><small>{option.description}</small></span>
        </label>)}
      </fieldset>
      <div className="officer-fields">
        <label>Nama petugas<input value={draft.officerName} onChange={e => update({ officerName: e.target.value })} required maxLength={120} autoComplete="name" placeholder="Nama lengkap penelaah" /></label>
        <label>Jabatan / unit<input value={draft.officerRole} onChange={e => update({ officerRole: e.target.value })} required maxLength={160} placeholder="Contoh: Verifikator Rujukan — Cabang Kupang" /></label>
      </div>
      <fieldset className="officer-reasons"><legend>Dasar pertimbangan <small>— dapat memilih lebih dari satu</small></legend>{REVIEW_REASONS.map(reason => <label key={reason}><input type="checkbox" checked={draft.reasons.includes(reason)} onChange={e => update({ reasons: e.target.checked ? [...draft.reasons, reason] : draft.reasons.filter(r => r !== reason) })} />{reason}</label>)}</fieldset>
      <div className="officer-field"><label htmlFor="officer-evidence">{draft.decision === 'confirmed_fraud' ? 'Referensi hasil pemeriksaan / dokumen penetapan' : 'Bukti yang ditelaah'}</label><textarea id="officer-evidence" value={draft.evidence} onChange={e => update({ evidence: e.target.value })} required rows={2} maxLength={4000} placeholder="Sebutkan dokumen, tanggal klarifikasi, atau temuan pada episode ini yang menjadi dasar keputusan." /></div>
      <div className="officer-field"><label htmlFor="officer-notes">Alasan keputusan</label><textarea id="officer-notes" value={draft.notes} onChange={e => update({ notes: e.target.value })} required rows={3} maxLength={6000} placeholder="Jelaskan hubungan antara bukti dan keputusan Anda." /></div>
      <div className="officer-field"><label htmlFor="officer-followup">Tindak lanjut</label><textarea id="officer-followup" value={draft.followup} onChange={e => update({ followup: e.target.value })} required rows={2} maxLength={3000} placeholder="Langkah berikutnya, penanggung jawab, dan tenggat bila diperlukan." /></div>
      <label className="officer-attestation"><input type="checkbox" checked={draft.acknowledged} onChange={e => update({ acknowledged: e.target.checked })} required />Saya telah menelaah bukti dan menyetujui keputusan serta tindak lanjut di atas.</label>
      {preview ? <div id="officer-review-preview" className="officer-preview" role="region" aria-label="Ringkasan sebelum pengesahan" tabIndex={-1}><h3>Periksa sebelum mengesahkan</h3><p><strong>{selected?.label}</strong></p><p>{draft.officerName} · {draft.officerRole}</p><p>{draft.notes}</p><p><strong>Tindak lanjut:</strong> {draft.followup}</p><p>{selected?.final ? 'Keputusan ini akan masuk ke laporan akhir.' : 'Laporan telaah lanjutan diterbitkan. Keputusan akhir masih menunggu pemeriksaan berikutnya.'}</p><div className="officer-actions"><button type="button" onClick={() => setPreview(false)}>Kembali mengedit</button><button type="button" className="officer-primary" onClick={approve}>Sahkan &amp; buka laporan</button></div></div>
        : <div className="officer-actions"><button type="button" onClick={saveDraft}>Simpan draf</button><button type="submit" className="officer-primary">Periksa &amp; sahkan keputusan</button></div>}
      <p className="officer-storage-note">Draf dan hasil telaah disimpan di browser perangkat ini. Gunakan Cetak / Simpan PDF untuk menyimpan salinan laporan.</p>
    </form>}
    {activeReport && <ReportViewerModal report={activeReport} onClose={() => setActiveReport(null)} />}
  </section>;
}
