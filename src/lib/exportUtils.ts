import { PersonPlanningData, Assignment } from '@/types/planning';
import { formatDate, getDayName } from '@/lib/dateUtils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToExcel = (
  data: PersonPlanningData[],
  dates: Date[],
  teamName: string,
  periodLabel: string
) => {
  const headers = ['Personnel'];
  dates.forEach(date => {
    headers.push(`${getDayName(date, true)} ${formatDate(date, 'd/MM')}`);
  });

  const rows = data.map(personData => {
    const row: string[] = [personData.person.display_name];
    
    dates.forEach(date => {
      const dateStr = formatDate(date);
      const dayData = personData.days[dateStr];
      
      if (dayData?.absence) {
        const slotLabel = dayData.absence.slot && dayData.absence.slot !== 'FULL' ? ` (${dayData.absence.slot === 'AM' ? 'M' : 'A'})` : '';
        row.push(`[${dayData.absence.type}${slotLabel}]${dayData.absence.comment ? ' ' + dayData.absence.comment : ''}`);
      } else if (dayData?.assignments.length > 0) {
        row.push(dayData.assignments.map(a => {
          const slotTag = a.slot && a.slot !== 'FULL' ? `[${a.slot === 'AM' ? 'M' : 'A'}] ` : '';
          return `${slotTag}${a.project?.code || ''} – ${a.project?.label || ''}`;
        }).join('\n'));
      } else {
        row.push('');
      }
    });
    
    return row;
  });

  const wb = XLSX.utils.book_new();
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = headers.map((_, i) => ({ wch: i === 0 ? 20 : 18 }));

  XLSX.utils.book_append_sheet(wb, ws, 'Planning');
  const filename = `planning_${teamName.replace(/\s+/g, '_')}_${formatDate(dates[0], 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(wb, filename);
};

// Convert HSL string like "217 91% 50%" to RGB [r, g, b]
function hslToRgb(hslStr: string): [number, number, number] {
  const parts = hslStr.replace(/%/g, '').split(/\s+/).map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return [37, 99, 235]; // fallback blue
  const h = parts[0] / 360;
  const s = parts[1] / 100;
  const l = parts[2] / 100;
  let r: number, g: number, b: number;
  if (s === 0) { r = g = b = l; } else {
    const hue2rgb = (p: number, q: number, t: number) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1/6) return p + (q - p) * 6 * t; if (t < 1/2) return q; if (t < 2/3) return p + (q - p) * (2/3 - t) * 6; return p; };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Lighten an RGB color for use as cell background (mix with white)
function lightenRgb(rgb: [number, number, number], factor = 0.65): [number, number, number] {
  return [
    Math.round(rgb[0] + (255 - rgb[0]) * factor),
    Math.round(rgb[1] + (255 - rgb[1]) * factor),
    Math.round(rgb[2] + (255 - rgb[2]) * factor),
  ];
}

// Absence type → RGB background
const ABSENCE_COLORS: Record<string, [number, number, number]> = {
  CP: [191, 219, 254],     // blue-200
  RTT: [153, 246, 228],    // teal-200
  MALADIE: [254, 202, 202], // red-200
  FORMATION: [253, 230, 138], // amber-200
};

export const exportToPDF = (
  data: PersonPlanningData[],
  dates: Date[],
  teamName: string,
  periodLabel: string
) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`Planning - ${teamName}`, 14, 15);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(periodLabel, 14, 22);

  const headers = ['Personnel'];
  dates.forEach(date => {
    headers.push(`${getDayName(date, true)} ${formatDate(date, 'd/MM')}`);
  });

  // Build body and color map
  type CellColor = { bg: [number, number, number]; fg: [number, number, number] };
  const cellColors: Map<string, CellColor> = new Map(); // "row-col" → colors

  const body = data.map((personData, rowIdx) => {
    const row: string[] = [personData.person.display_name];
    
    dates.forEach((date, colIdx) => {
      const dateStr = formatDate(date);
      const dayData = personData.days[dateStr];
      
      if (dayData?.absence) {
        const slotLabel = dayData.absence.slot && dayData.absence.slot !== 'FULL' ? ` (${dayData.absence.slot === 'AM' ? 'M' : 'A'})` : '';
        row.push(`${dayData.absence.type}${slotLabel}`);
        const absBg = ABSENCE_COLORS[dayData.absence.type] || [220, 220, 220];
        cellColors.set(`${rowIdx}-${colIdx + 1}`, { bg: absBg, fg: [30, 30, 30] });
      } else if (dayData?.assignments.length > 0) {
        row.push(dayData.assignments.map(a => a.project?.code || '?').join(', '));
        // Use the first assignment's project color
        const firstColor = dayData.assignments[0]?.project?.color;
        if (firstColor) {
          const rgb = hslToRgb(firstColor);
          cellColors.set(`${rowIdx}-${colIdx + 1}`, { bg: lightenRgb(rgb, 0.55), fg: rgb });
        }
      } else {
        row.push('-');
      }
    });
    
    return row;
  });

  autoTable(doc, {
    head: [headers],
    body: body,
    startY: 28,
    styles: { fontSize: 7, cellPadding: 1.5, lineWidth: 0.1, lineColor: [200, 200, 200] },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    columnStyles: { 0: { cellWidth: 32, fontStyle: 'bold' } },
    didParseCell: (hookData: any) => {
      if (hookData.section === 'body' && hookData.column.index > 0) {
        const key = `${hookData.row.index}-${hookData.column.index}`;
        const color = cellColors.get(key);
        if (color) {
          hookData.cell.styles.fillColor = color.bg;
          hookData.cell.styles.textColor = color.fg;
          hookData.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  // Legend
  const lastY = (doc as any).lastAutoTable?.finalY || 200;
  if (lastY + 15 < doc.internal.pageSize.height) {
    doc.setFontSize(7);
    doc.setTextColor(100);
    const legendY = lastY + 8;
    doc.text('Légende :', 14, legendY);
    let x = 30;
    for (const [type, color] of Object.entries(ABSENCE_COLORS)) {
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(x, legendY - 2.5, 4, 3, 'F');
      doc.text(type, x + 5, legendY);
      x += 20;
    }
    doc.text('■ = couleur du chantier', x + 5, legendY);
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Page ${i} / ${pageCount} - Généré le ${formatDate(new Date(), 'dd/MM/yyyy à HH:mm')}`,
      14, doc.internal.pageSize.height - 10
    );
  }

  const filename = `planning_${teamName.replace(/\s+/g, '_')}_${formatDate(dates[0], 'yyyy-MM-dd')}.pdf`;
  doc.save(filename);
};

export const duplicateWeekPlanning = (
  assignments: Assignment[],
  sourceStartDate: Date,
  targetStartDate: Date,
  teamPeopleIds: string[]
): Assignment[] => {
  const sourceDates: string[] = [];
  for (let i = 0; i < 5; i++) {
    const date = new Date(sourceStartDate);
    date.setDate(date.getDate() + i);
    sourceDates.push(formatDate(date));
  }

  const dayOffset = Math.round((targetStartDate.getTime() - sourceStartDate.getTime()) / (1000 * 60 * 60 * 24));

  const sourceAssignments = assignments.filter(
    a => sourceDates.includes(a.date) && teamPeopleIds.includes(a.person_id)
  );

  return sourceAssignments.map(a => {
    const sourceDate = new Date(a.date);
    sourceDate.setDate(sourceDate.getDate() + dayOffset);
    return { ...a, id: crypto.randomUUID(), date: formatDate(sourceDate), created_at: new Date().toISOString() };
  });
};
