function escapePdf(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[^\x20-\x7E]/g, '');
}

export function createTextPdf(pages: string[][]): Buffer {
  const objects: string[] = [];
  const add = (value: string) => { objects.push(value); return objects.length; };
  const catalogId = add('');
  const pagesId = add('');
  const fontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageIds: number[] = [];
  for (const lines of pages) {
    const commands = ['BT', '/F1 11 Tf', '50 790 Td'];
    lines.slice(0, 48).forEach((line, index) => {
      if (index > 0) commands.push('0 -15 Td');
      commands.push(`(${escapePdf(line)}) Tj`);
    });
    commands.push('ET');
    const stream = commands.join('\n');
    const contentId = add(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    const pageId = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  }
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  let output = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(output));
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(output);
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  output += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(output, 'ascii');
}

export function reportCardLines(card: any): string[] {
  const lines = [
    `${card.school?.name || 'School'} - REPORT CARD`,
    card.school?.address || '',
    '',
    `Student: ${card.student.name}    Admission #: ${card.student.admissionNumber}`,
    `Class: ${card.student.className || '-'}-${card.student.section || '-'}    Term: ${card.term?.name || 'All Terms'}`,
    '',
    'Subject                         Marks       %       Grade    Status',
    '------------------------------------------------------------------',
  ];
  card.subjects.forEach((subject: any) => lines.push(
    `${String(subject.subjectName || 'Subject').padEnd(30).slice(0, 30)}  ${String(`${subject.obtainedMarks}/${subject.maximumMarks}`).padEnd(10)}  ${String(subject.percentage).padEnd(6)}  ${String(subject.grade).padEnd(7)}  ${subject.isPassed ? 'Pass' : 'Fail'}`,
  ));
  lines.push('', `Total: ${card.summary.totalObtained}/${card.summary.totalMaximum}`);
  lines.push(`Percentage: ${card.summary.overallPercentage}%    Grade: ${card.summary.overallGrade}    Position: ${card.summary.classPosition || '-'}`);
  lines.push(`Attendance: ${card.attendance.present}/${card.attendance.totalDays} present (${card.attendance.attendancePercentage}%)`);
  if (card.comparison) lines.push(`Previous term: ${card.comparison.previousPercentage}%    Change: ${card.comparison.delta}%`);
  lines.push('', `Teacher remarks: ${card.remark || '-'}`);
  return lines;
}
