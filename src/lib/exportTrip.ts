import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface GpsPoint {
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
  course: number;
}

export interface TripMeta {
  vehicleName: string;
  dateFrom: string;
  dateTo: string;
  totalDistance: number;
  avgSpeed: number;
  maxSpeed: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDateId(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// ─── CSV ─────────────────────────────────────────────────────────────────────
export function exportTripCSV(points: GpsPoint[], meta: TripMeta): void {
  const first = points[0];
  const last  = points[points.length - 1];
  const duration = formatDuration(
    new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime(),
  );

  const header = [
    `# TrackPro - Trip Report`,
    `# Vehicle: ${meta.vehicleName}`,
    `# Period: ${meta.dateFrom} - ${meta.dateTo}`,
    `# Generated: ${new Date().toLocaleString('id-ID')}`,
    `# Duration: ${duration}`,
    `# Total Distance: ${meta.totalDistance.toFixed(2)} km`,
    `# Avg Speed: ${meta.avgSpeed.toFixed(1)} km/h`,
    `# Max Speed: ${meta.maxSpeed.toFixed(1)} km/h`,
    `# Total Points: ${points.length}`,
    ``,
    `No,Timestamp,Latitude,Longitude,Speed (km/h),Course (°)`,
  ];

  const rows = points.map((p, i) =>
    [
      i + 1,
      formatDateId(p.timestamp),
      p.latitude.toFixed(6),
      p.longitude.toFixed(6),
      (p.speed || 0).toFixed(1),
      p.course || 0,
    ].join(','),
  );

  const csv = [...header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `trip_${meta.vehicleName.replace(/\s+/g, '_')}_${meta.dateFrom}_${meta.dateTo}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── PDF ─────────────────────────────────────────────────────────────────────
export function exportTripPDF(points: GpsPoint[], meta: TripMeta): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const first = points[0];
  const last  = points[points.length - 1];
  const duration = formatDuration(
    new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime(),
  );
  const pageW = doc.internal.pageSize.getWidth();

  // ── Header bar ─────────────────────────────────────────────────────────────
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 0, pageW, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('TrackPro', 14, 10);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Trip Report', 14, 17);

  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString('id-ID')}`, pageW - 14, 17, { align: 'right' });

  // ── Vehicle & Period ────────────────────────────────────────────────────────
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(meta.vehicleName, 14, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Period: ${meta.dateFrom}  →  ${meta.dateTo}`, 14, 38);

  // ── Summary box ─────────────────────────────────────────────────────────────
  doc.setDrawColor(229, 231, 235);
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(14, 43, pageW - 28, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('TRIP SUMMARY', 18, 49);

  const summaryItems = [
    ['Distance',     `${meta.totalDistance.toFixed(2)} km`],
    ['Duration',     duration],
    ['Avg Speed',    `${meta.avgSpeed.toFixed(1)} km/h`],
    ['Max Speed',    `${meta.maxSpeed.toFixed(1)} km/h`],
    ['Total Points', `${points.length}`],
    ['Start',        formatDateId(first.timestamp)],
    ['End',          formatDateId(last.timestamp)],
  ];

  // Render summary in two columns
  const colW = (pageW - 28) / 2;
  summaryItems.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 18 + col * colW;
    const y = 56 + row * 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(`${item[0]}:`, x, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(item[1], x + 22, y);
  });

  // ── GPS Data Table ──────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  doc.text('GPS Data Points', 14, 78);

  const tableRows = points.map((p, i) => [
    (i + 1).toString(),
    formatDateId(p.timestamp),
    p.latitude.toFixed(6),
    p.longitude.toFixed(6),
    `${(p.speed || 0).toFixed(1)}`,
    `${p.course || 0}°`,
  ]);

  autoTable(doc, {
    startY: 81,
    head: [['#', 'Timestamp', 'Latitude', 'Longitude', 'Speed (km/h)', 'Course']],
    body: tableRows,
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 45 },
      2: { cellWidth: 28, halign: 'right' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 18, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  // ── Footer on each page ─────────────────────────────────────────────────────
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(
      `TrackPro — ${meta.vehicleName} — Page ${i} of ${pageCount}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'center' },
    );
  }

  doc.save(`trip_${meta.vehicleName.replace(/\s+/g, '_')}_${meta.dateFrom}_${meta.dateTo}.pdf`);
}
