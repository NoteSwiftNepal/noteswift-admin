import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NOTO_SANS_DEVANAGARI_BASE64 } from './fonts/noto-sans-devanagari-base64';

// jsPDF's built-in fonts (helvetica etc.) only cover Latin1/WinAnsi — course
// and school names can be in Devanagari (Nepali script), which renders as
// garbage glyphs under those fonts. This font is registered and used only
// for the dynamic value cells that might contain non-Latin1 text; the
// static English labels/headers stay on helvetica so they keep proper bold.
const DEVANAGARI_FONT_NAME = 'NotoSansDevanagari';
function registerDevanagariFont(pdf: jsPDF) {
  pdf.addFileToVFS('NotoSansDevanagari-Regular.ttf', NOTO_SANS_DEVANAGARI_BASE64);
  pdf.addFont('NotoSansDevanagari-Regular.ttf', DEVANAGARI_FONT_NAME, 'normal');
}

interface RosterCode {
  code?: string;
  courseId: string;
  createdAt?: string;
  transaction?: { notes?: string } | null;
  isUsed?: boolean;
}

// Public assets are served as-is by Next.js, so this is a plain fetch — no
// bundler import needed, and it degrades gracefully (header just loses the
// mark) if the asset is ever missing rather than failing the whole export.
async function loadImageAsDataUrl(path: string): Promise<string | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Roster-style PDF (Organization / Course / Generated On / Notes header
// block, then a Roll No / Code / Student Name / Payment / Remarks table) —
// the printable sheet an admin hands to a school to fill in by hand as
// they distribute codes.
// Returns the number of codes actually written to the PDF (0 if every code
// passed in was already used) so the caller can tell the admin nothing was
// exported instead of a click silently doing nothing.
export async function exportCodesListToPDF(
  allCodes: RosterCode[],
  schoolName: string,
  courseMap: Record<string, string>
): Promise<number> {
  // A used code is one-time-use and already redeemed — handing it out on a
  // printed roster would just be a dead code, so only unused codes ever
  // make it into the export.
  const codes = allCodes.filter(c => !c.isUsed);
  if (codes.length === 0) return 0;

  const courseIds = Array.from(new Set(codes.map(c => c.courseId)));
  const courseLabel = courseIds.length === 1
    ? (courseMap[courseIds[0]] || courseIds[0])
    : 'Multiple Courses';

  const dateStrs = Array.from(new Set(
    codes.map(c => c.createdAt ? new Date(c.createdAt).toLocaleDateString() : null).filter(Boolean)
  ));
  const generatedOnLabel = dateStrs.length === 1 ? (dateStrs[0] as string) : 'Multiple Dates';

  const notes = codes.find(c => c.transaction?.notes)?.transaction?.notes || 'Codes to Enroll in NoteSwift App';

  // Use a small, pre-resized copy of the mark for PDF embedding — jsPDF
  // embeds PNGs with an alpha channel as raw uncompressed pixel data, so
  // the full-resolution 1024x1024 logo would balloon each export to ~4MB.
  const logoDataUrl = await loadImageAsDataUrl('/assets/logo-mark-pdf.png');

  const pdf = new jsPDF('p', 'mm', 'a4');
  registerDevanagariFont(pdf);
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  let cursorY = margin;

  // Header: logo mark + wordmark
  const textX = margin + (logoDataUrl ? 20 : 0);
  if (logoDataUrl) {
    pdf.addImage(logoDataUrl, 'PNG', margin, cursorY - 2, 16, 16);
  }
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(30, 41, 59);
  pdf.text('NoteSwift', textX, cursorY + 6);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Bulk Unlock Code Roster', textX, cursorY + 12);

  cursorY += 20;
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.3);
  pdf.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 6;

  // Organization / Course / Generated On / Number of Codes / Notes block
  autoTable(pdf, {
    startY: cursorY,
    body: [
      ['Organization', schoolName],
      ['Course', courseLabel],
      ['Generated On', generatedOnLabel],
      ['Number of Codes', String(codes.length)],
      ['Notes', notes],
    ],
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: { top: 1.2, bottom: 1.2, left: 0, right: 2 } },
    columnStyles: {
      0: { font: 'helvetica', fontStyle: 'bold', cellWidth: 38, textColor: [51, 65, 85] },
      // Values (school name, course, notes) may contain Devanagari text.
      1: { font: DEVANAGARI_FONT_NAME, textColor: [30, 41, 59] },
    },
    margin: { left: margin, right: margin },
  });

  const afterInfoY = (pdf as any).lastAutoTable.finalY + 6;

  // Roll No / Code / Student Name / Payment / Remarks table
  autoTable(pdf, {
    startY: afterInfoY,
    head: [['Roll No', 'Code', 'Student Name', 'Payment', 'Remarks']],
    body: codes.map((code, i) => [String(i + 1), code.code || '', '', '', '']),
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 10 },
    styles: { fontSize: 9, cellPadding: 2.5, lineColor: [203, 213, 225], lineWidth: 0.15, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 38, font: 'courier', fontStyle: 'bold', textColor: [37, 99, 235] },
      2: { cellWidth: 55 },
      3: { cellWidth: 30 },
      4: { cellWidth: 'auto' },
    },
    margin: { left: margin, right: margin },
  });

  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(148, 163, 184);
    pdf.text(`Generated on ${new Date().toLocaleString()}`, margin, pageHeight - 8);
    pdf.text(`NoteSwift (c) ${new Date().getFullYear()}`, pageWidth / 2 - 15, pageHeight - 8);
    pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 22, pageHeight - 8);
  }

  const safeSchoolName = schoolName.replace(/[^a-z0-9]+/gi, '-');
  pdf.save(`${safeSchoolName}-codes-${new Date().toISOString().split('T')[0]}.pdf`);
  return codes.length;
}
