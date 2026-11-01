export interface CsvColumn {
  label: string;
  value: (row: any) => string | number;
}

// Cells starting with these characters can be run as formulas by spreadsheet apps
const FORMULA_START = /^[=+\-@\t\r]/;

const escapeCell = (raw: string | number) => {
  let text = String(raw ?? '');
  if (typeof raw === 'string' && FORMULA_START.test(text)) {
    text = `'${text}`;
  }
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const buildCsv = (columns: CsvColumn[], rows: unknown[]) =>
  [columns.map((column) => escapeCell(column.label)), ...rows.map((row) => columns.map((column) => escapeCell(column.value(row))))]
    .map((line) => line.join(','))
    .join('\r\n');

export const downloadCsv = (filename: string, csv: string) => {
  // The BOM makes Excel read the file as UTF-8
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
