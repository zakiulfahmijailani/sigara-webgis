import type { Episode } from '@/lib/showcase';
import type { FixtureId } from '@/lib/clarification-demo-types';

export const OFFICER_NAME = 'Tim Verifikator SIGARA (Petugas)';
export const OFFICER_EMAIL = 'petugas.sigara@example.com';
export const AGENT_NAME = 'SIGARA GeoAI Agent';
export const AGENT_EMAIL = 'agent.sigara@example.com';
export const FASKES_EMAIL = 'kontak.faskes@example.com';

export function getFaskesContactName(episode: Episode): string {
  return `Kontak Faskes (dummy) ${episode.fromName}`;
}

export function formatSimDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB';
  } catch {
    return isoString;
  }
}

export function getInitialRequestContent(episode: Episode, reportId: string) {
  const altText = episode.altOutside ? 'Faskes di Luar NTT' : (episode.altName || 'Faskes rujukan alternatif terdekat');
  const ratioText = episode.timeRatio != null ? `${episode.timeRatio.toFixed(2)}x` : 'signifikan';

  return {
    subject: `[SIMULASI] Permintaan Klarifikasi Disparitas Rujukan Episode ${episode.id}`,
    body: `[SIMULASI POC — seluruh penjelasan tambahan berikut adalah dummy]\n\nYth. Pimpinan & Tim Medis ${episode.fromName},

Berdasarkan hasil penapisan sistem SIGARA, episode rujukan ID ${episode.id} menuju ${episode.toName} tercatat memiliki indikasi disparitas waktu/jarak tempuh proksi (${ratioText} dibanding alternatif terdekat: ${altText}).

Sebagai bagian dari proses akuntabilitas dan telaah kelayakan rujukan berkeadilan di wilayah NTT, kami memohon konfirmasi dan penjelasan resmi tertulis mengenai:
1. Alasan klinis atau pertimbangan kegawatdaruratan medis dalam pemilihan ${episode.toName}.
2. Apakah terdapat kendala akses transportasi, cuaca ekstrem, atau ketidaksiapan layanan pada faskes pembanding terdekat (${altText}) pada tanggal rujukan tersebut.

Dokumen ringkasan telaah awal telah dilampirkan (${reportId}). Mohon tanggapan disampaikan dalam waktu 2 (dua) hari simulasi.

Hormat kami,
${OFFICER_NAME} & ${AGENT_NAME}`,
  };
}

export function getCompleteFlowResponses(episode: Episode) {
  const altText = episode.altOutside ? 'Faskes di Luar NTT' : (episode.altName || 'Faskes rujukan pembanding');

  return {
    stakeholderReply: {
      subject: `Re: [SIMULASI] Klarifikasi Pemilihan Faskes Rujukan Episode ${episode.id}`,
      body: `[SIMULASI POC — seluruh penjelasan tambahan berikut adalah dummy]\n\nYth. Tim Penelaah SIGARA,

Menanggapi permintaan klarifikasi nomor episode ${episode.id}, kami dari ${episode.fromName} menyampaikan penjelasan sebagai berikut:

1. Pada tanggal rujukan, pasien membutuhkan penanganan dokter spesialis darurat dan fasilitas rawat intensif. Fasilitas terdekat (${altText}) saat itu telah dikonfirmasi melalui koordinasi rujukan lokal sedang mengalami keterbatasan dokter spesialis on-duty dan tempat tidur rawat inap penuh.
2. Kondisi geografis pada jalur alternatif juga sedang terdampak cuaca ekstrem lokal (indikasi genangan/longsor dalam cerita dummy ini; belum diverifikasi secara independen), sehingga rute menuju ${episode.toName} diputuskan sebagai opsi paling aman demi keselamatan pasien.

Demikian klarifikasi ini kami sampaikan dengan sebenar-benarnya untuk melengkapi berkas penelaahan.

Salam takzim,
${getFaskesContactName(episode)}
Penanggung Jawab Medis ${episode.fromName}`,
    },
    summary: {
      questionAsked: `Alasan pemilihan faskes tujuan lebih jauh dan kendala akses/klinis pada faskes alternatif terdekat (${altText}).`,
      stakeholderResponse: `Faskes terdekat (${altText}) mengalami kekosongan dokter spesialis on-duty dan tempat tidur penuh. Jalur alternatif mengalami kendala fisik cuaca, sehingga rujukan dialihkan langsung ke ${episode.toName}.`,
      completeItems: [
        'Stakeholder dummy menyampaikan kebutuhan layanan spesialis',
        'Penjelasan keterbatasan faskes pembanding terdekat pada tanggal rujukan',
        'Penjelasan kendala akses dari stakeholder dummy, belum diverifikasi',
      ],
      missingItems: [],
      recommendation: 'Cerita dummy cukup untuk penelaahan demo. Petugas perlu memverifikasi pernyataan stakeholder; ilustrasi GeoAI bukan bukti independen dan indeks master tetap.',
    },
  };
}

export function getFollowupFlowResponses(episode: Episode) {
  const altText = episode.altOutside ? 'Faskes di Luar NTT' : (episode.altName || 'Faskes pembanding terdekat');

  return {
    stakeholderInquiry: {
      subject: `Re: [SIMULASI] Konfirmasi Data Faskes Rujukan Episode ${episode.id}`,
      body: `[SIMULASI POC — seluruh penjelasan tambahan berikut adalah dummy]\n\nYth. Tim Verifikator SIGARA,

Kami telah menerima surat permintaan klarifikasi untuk episode ${episode.id}. Mohon konfirmasi lebih lanjut:
Fasilitas rujukan alternatif mana yang menjadi dasar pembanding sistem, dan catatan tanggal rujukan berapa yang perlu kami telusuri di buku register kami?

Terima kasih,
Staf Administrasi Rujukan ${episode.fromName}`,
    },
    agentClarification: {
      subject: `[SIMULASI] Tanggapan Petugas: Rincian Pembanding Episode ${episode.id}`,
      body: `[SIMULASI POC — seluruh penjelasan tambahan berikut adalah dummy]\n\nYth. Rekan Administrasi ${episode.fromName},

Menjawab pertanyaan yang diajukan:
1. Fasilitas rujukan alternatif pembanding pada episode ini adalah: ${altText} (rasio waktu tempuh proksi: ${episode.timeRatio != null ? episode.timeRatio.toFixed(2) : 'belum tersedia'}x).
2. Periode episode: ${episode.firstDate || episode.month || 'Data tanggal/periode belum tersedia'}. Wilayah: ${episode.kabAsal}.

Mohon penjelasan mengenai alasan pemilihan ${episode.toName} dibanding ${altText}.`,
    },
    stakeholderPartialReply: {
      subject: `Re: [SIMULASI] Penjelasan Awal Episode ${episode.id}`,
      body: `[SIMULASI POC — seluruh penjelasan tambahan berikut adalah dummy]\n\nYth. Tim SIGARA,

Berdasarkan penelusuran kami, pengalihan rujukan ke ${episode.toName} dilakukan semata-mata karena pertimbangan aksesibilitas jalan saat itu dan persetujuan keluarga pasien.

Terima kasih.`,
    },
    followupQuestion: {
      subject: `[SIMULASI] Pertanyaan Lanjutan: Kelengkapan Dokumen Episode ${episode.id}`,
      body: `[SIMULASI POC — seluruh penjelasan tambahan berikut adalah dummy]\n\nYth. Pimpinan ${episode.fromName},

Terima kasih atas tanggapan awal. Setelah ditelaah, kami memerlukan rincian tambahan untuk melengkapi berkas:
1. Mohon spesifikasi kendala jalan yang dialami menuju ${altText}.
2. Apakah faskes alternatif (${altText}) telah dihubungi terlebih dahulu sebelum rujukan dialihkan ke ${episode.toName}?

Mohon kelengkapan tanggapan disampaikan dalam tenggat waktu 2 hari simulasi berikutnya.`,
    },
    stakeholderFinalReply: {
      subject: `Re: [SIMULASI] Kelengkapan Penjelasan Rujukan Episode ${episode.id}`,
      body: `[SIMULASI POC — seluruh penjelasan tambahan berikut adalah dummy]\n\nYth. Tim Penelaah SIGARA,

Berikut kami lengkapi rincian yang diminta:
1. Jalur penghubung menuju ${altText} pada tanggal tersebut mengalami penutupan sementara akibat pekerjaan jembatan darurat pasca-hujan deras.
2. Koordinasi telah dilakukan dengan faskes alternatif via telepon dan dikonfirmasi dokter spesialis sedang tidak berada di tempat. Oleh sebab itu ambulans langsung diarahkan ke ${episode.toName}.

Demikian penjelasan lengkap kami. Terima kasih atas kerjasamanya.`,
    },
    finalSummary: {
      questionAsked: `Rincian spesifik kendala jalan dan konfirmasi kapasitas layanan pada ${altText}.`,
      stakeholderResponse: `Jalur menuju ${altText} terputus perbaikan jembatan darurat dan dokter spesialis tidak tersedia, terkonfirmasi via koordinasi telepon faskes.`,
      completeItems: [
        'Klarifikasi spesifik kendala jalur transportasi alternatif',
        'Konfirmasi koordinasi antar-faskes sebelum rujukan',
        'Justifikasi keamanan pasien dalam pemilihan koridor rujukan',
      ],
      missingItems: [],
      recommendation: 'Informasi dummy telah lengkap untuk ditinjau petugas. Klaim hambatan dan kapasitas layanan belum diverifikasi secara independen; indeks master tetap.',
    },
  };
}

export function getNoResponseFlowReminders(episode: Episode) {
  return {
    reminder1: {
      subject: `[SIMULASI - PENGINGAT 1/2] Mohon Tanggapan: Klarifikasi Rujukan Episode ${episode.id}`,
      body: `[SIMULASI POC — seluruh penjelasan tambahan berikut adalah dummy]\n\nYth. Pimpinan & Tim Medis ${episode.fromName},

Sistem mencatat bahwa surat permintaan klarifikasi rujukan Episode ${episode.id} menuju ${episode.toName} belum menerima tanggapan hingga batas waktu yang ditentukan.

Tenggat waktu tanggapan diperpanjang selama 2 (dua) hari simulasi berikutnya. Mohon konfirmasi atau tanggapan dapat segera disampaikan melalui kanal resmi ini.

Hormat kami,
${OFFICER_NAME}`,
    },
    reminder2: {
      subject: `[SIMULASI - PENGINGAT 2/2] Peringatan Akhir: Tenggat Klarifikasi Episode ${episode.id}`,
      body: `[SIMULASI POC — seluruh penjelasan tambahan berikut adalah dummy]\n\nYth. Pimpinan ${episode.fromName},

Ini merupakan pengingat terakhir (2 dari 2) untuk permintaan penjelasan rujukan Episode ${episode.id}.

Jika dalam 2 (dua) hari simulasi ke depan belum ada tanggapan, berkas akan secara otomatis dieskalasi ke Petugas Verifikasi Lapangan untuk audit kepatuhan rujukan faskes.

Hormat kami,
${OFFICER_NAME}`,
    },
    belatedResponse: {
      subject: `Re: [SIMULASI - TERLAMBAT] Permohonan Maaf & Tanggapan Rujukan Episode ${episode.id}`,
      body: `[SIMULASI POC — seluruh penjelasan tambahan berikut adalah dummy]\n\nYth. Petugas Verifikator SIGARA,

Kami memohon maaf yang sebesar-besarnya atas keterlambatan tanggapan dikarenakan adanya kendala teknis jaringan internet dan pergantian staf administrasi di faskes kami.

Terkait rujukan episode ${episode.id}: Pasien dirujuk ke ${episode.toName} atas indikasi tindakan bedah darurat yang fasilitas penunjangnya hanya tersedia di faskes tersebut. Rekam medis rujukan terlampir di sistem faskes.

Demikian penjelasan kami, mohon dapat diterima. Terima kasih.`,
    },
    belatedSummary: {
      questionAsked: `Klarifikasi keterlambatan tanggapan dan alasan pemilihan faskes rujukan ${episode.toName}.`,
      stakeholderResponse: `Permohonan maaf atas keterlambatan akibat kendala teknis/staf faskes. Pasien memerlukan tindakan bedah darurat yang hanya tersedia di faskes tujuan.`,
      completeItems: [
        'Tanggapan klarifikasi faskes telah diterima meskipun melewati tenggat normal',
        'Justifikasi tindakan bedah darurat disampaikan',
      ],
      missingItems: ['Perlu konfirmasi rekam medis manual oleh petugas'],
      recommendation: 'Tanggapan terlambat telah diterima. Disarankan petugas meninjau catatan kendala internal faskes sebelum memutuskan status audit.',
    },
  };
}
