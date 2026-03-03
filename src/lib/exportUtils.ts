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

  const body = data.map(personData => {
    const row: string[] = [personData.person.display_name];
    
    dates.forEach(date => {
      const dateStr = formatDate(date);
      const dayData = personData.days[dateStr];
      
      if (dayData?.absence) {
        const slotLabel = dayData.absence.slot && dayData.absence.slot !== 'FULL' ? ` (${dayData.absence.slot === 'AM' ? 'M' : 'A'})` : '';
        row.push(`[${dayData.absence.type}${slotLabel}]`);
      } else if (dayData?.assignments.length > 0) {
        row.push(dayData.assignments.map(a => `${a.project?.code || ''} – ${a.project?.label || ''}`).join(', '));
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
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: { 0: { cellWidth: 35, fontStyle: 'bold' } },
  });

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
