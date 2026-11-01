import { buildCsv } from './csv';

describe('buildCsv', () => {
  const columns = [
    { label: 'Name', value: (row: { name: string }) => row.name },
    { label: 'Count', value: (row: { count: number }) => row.count },
  ];

  it('writes a header and rows', () => {
    expect(buildCsv(columns as any, [{ name: 'Frame', count: 2 }])).toBe('Name,Count\r\nFrame,2');
  });

  it('quotes cells containing commas, quotes or newlines', () => {
    const csv = buildCsv(columns as any, [{ name: 'A "big", frame\nset', count: 1 }]);

    expect(csv).toBe('Name,Count\r\n"A ""big"", frame\nset",1');
  });

  it('neutralises text that a spreadsheet would run as a formula', () => {
    const csv = buildCsv(columns as any, [{ name: '=HYPERLINK("x")', count: -3 }]);

    expect(csv).toContain('"\'=HYPERLINK(""x"")"');
    expect(csv.endsWith(',-3')).toBe(true);
  });
});
