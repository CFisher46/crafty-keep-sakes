import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchAuditLogs } from '../../../store/audits/auditThunks';
import { Audit } from './types';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  Box,
  Text,
  Button,
  SelectMultiple,
} from 'grommet';

export const AuditLogs = () => {
  const dispatch = useAppDispatch();
  const logs = useAppSelector((state) => state.audit.logs);
  const auditLogs = useMemo(() => (Array.isArray(logs) ? logs : []), [logs]);
  const [selectedFilters, setSelectedFilters] = useState<
    Partial<Record<keyof Audit, string[]>>
  >({});

  useEffect(() => {
    dispatch(fetchAuditLogs());
  }, [dispatch]);

  // Dynamically get the column headers from the keys of the first log
  const columnHeaders = useMemo(
    () =>
      auditLogs.length
        ? (Object.keys(auditLogs[0]) as (keyof Audit)[])
        : [],
    [auditLogs]
  );

  const filterOptions = useMemo(
    () =>
      columnHeaders.reduce((options, header) => {
        const values = Array.from(
          new Set(
            auditLogs
              .map((log) => log[header])
              .filter((value) => value !== null && value !== undefined)
              .map((value) => String(value))
          )
        ).sort((left, right) => left.localeCompare(right));

        options[header] = values;
        return options;
      }, {} as Record<keyof Audit, string[]>),
    [auditLogs, columnHeaders]
  );

  const filteredLogs = useMemo(
    () =>
      auditLogs.filter((log) =>
        columnHeaders.every((header) => {
          const activeFilters = selectedFilters[header] ?? [];

          if (!activeFilters.length) {
            return true;
          }

          return activeFilters.includes(String(log[header] ?? ''));
        })
      ),
    [auditLogs, columnHeaders, selectedFilters]
  );

  const hasActiveFilters = Object.values(selectedFilters).some(
    (values) => Array.isArray(values) && values.length > 0
  );

  const updateFilter = (header: keyof Audit, values: string[]) => {
    setSelectedFilters((currentFilters) => ({
      ...currentFilters,
      [header]: values,
    }));
  };

  const clearFilters = () => {
    setSelectedFilters({});
  };

  if (auditLogs.length === 0) {
    return <p>No logs available.</p>;
  }

  return (
    <Box pad="medium" background="light-1" round="small" overflow="auto">
      <Box direction="row" gap="small" wrap margin={{ bottom: 'medium' }}>
        {columnHeaders.map((header) => (
          <Box key={header as string} width="medium" gap="xsmall">
            <Text size="small" weight="bold">
              {header === 'user' ? 'id' : String(header).replace(/_/g, ' ')}
            </Text>
            <SelectMultiple
              placeholder={`Filter ${String(header).replace(/_/g, ' ')}`}
              options={filterOptions[header]}
              value={selectedFilters[header] ?? []}
              onChange={({ value }) => updateFilter(header, value as string[])}
            />
          </Box>
        ))}
        <Box justify="end">
          <Button
            label="Clear Filters"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
          />
        </Box>
      </Box>

      {filteredLogs.length === 0 ? (
        <Box pad="medium" align="center">
          <Text weight="bold">No audit logs match the selected filters.</Text>
        </Box>
      ) : (
      <Table>
        <TableHeader>
          <TableRow>
            {columnHeaders.map((header) => (
              <TableCell
                key={header}
                scope="col"
                border="bottom"
                align="center"
              >
                <Text weight="bold">
                  {header === 'user' ? 'id' : header.replace(/_/g, ' ')}
                </Text>
              </TableCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredLogs.map((log: Audit, index) => (
            <TableRow key={index}>
              {columnHeaders.map((header) => (
                <TableCell key={header} align="center">
                  {log[header as keyof Audit]?.toString() || ''}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      )}
    </Box>
  );
};

export default AuditLogs;
