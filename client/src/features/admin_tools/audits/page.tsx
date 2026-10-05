import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchAuditFilterOptions,
  fetchAuditLogs,
} from '../../../store/audits/auditThunks';
import { Audit, AuditFilterField, auditFilterFields } from './types';
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
import { buttonStyles } from '../../../helpers/formatting';

const PAGE_SIZE = 5;

type AuditRow = Audit & {
  old_values_json?: unknown;
  new_values_json?: unknown;
};

const getChangedJsonKeys = (currentValue: unknown, previousValue: unknown): Set<string> => {
  const changedKeys = new Set<string>();

  const parseJson = (value: unknown) => {
    if (typeof value !== 'string') {
      return value;
    }

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  const currentObject = parseJson(currentValue);
  const previousObject = parseJson(previousValue);

  if (
    !currentObject ||
    typeof currentObject !== 'object' ||
    Array.isArray(currentObject)
  ) {
    return changedKeys;
  }

  if (!previousObject || typeof previousObject !== 'object' || Array.isArray(previousObject)) {
    Object.keys(currentObject).forEach((key) => changedKeys.add(key));
    return changedKeys;
  }

  Object.keys(currentObject).forEach((key) => {
    const currentEntry = (currentObject as Record<string, unknown>)[key];
    const previousEntry = (previousObject as Record<string, unknown>)[key];

    if (JSON.stringify(currentEntry) !== JSON.stringify(previousEntry)) {
      changedKeys.add(key);
    }
  });

  return changedKeys;
};

const renderJsonCell = (
  value: unknown,
  previousValue?: unknown,
  highlightChanges = false
) => {
  if (value === null || value === undefined || value === '') {
    return <Text size="small">—</Text>;
  }

  const textValue = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  const changedKeys = highlightChanges ? getChangedJsonKeys(value, previousValue ?? null) : new Set();

  try {
    const parsedValue = JSON.parse(textValue);

    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
      return <Text size="small">{textValue}</Text>;
    }

    return (
      <Box gap="xxsmall" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {Object.entries(parsedValue).map(([key, entryValue]) => {
          const isChanged = highlightChanges && changedKeys.has(key);
          return (
            <Text
              key={key}
              size="small"
              weight={isChanged ? 'bold' : undefined}
              color={isChanged ? 'status-critical' : undefined}
            >
              {`"${key}": ${JSON.stringify(entryValue)}`}
            </Text>
          );
        })}
      </Box>
    );
  } catch {
    return <Text size="small">{textValue}</Text>;
  }
};

export const AuditLogs = () => {
  const dispatch = useAppDispatch();
  const logs = useAppSelector((state) => state.audit.logs);
  const totalCount = useAppSelector((state) => state.audit.totalCount);
  const filterOptions = useAppSelector((state) => state.audit.filterOptions);
  const filterOptionsError = useAppSelector((state) => state.audit.filterOptionsError);
  const auditLogs = useMemo(() => (Array.isArray(logs) ? logs : []), [logs]);
  const [selectedFilters, setSelectedFilters] = useState<
    Partial<Record<AuditFilterField, string[]>>
  >({});
  const [page, setPage] = useState(1);
  const [showAuditTable, setShowAuditTable] = useState(false);

  useEffect(() => {
    dispatch(fetchAuditLogs({ page, pageSize: PAGE_SIZE, filters: selectedFilters }));
  }, [dispatch, page, selectedFilters]);

  useEffect(() => {
    dispatch(fetchAuditFilterOptions());
  }, [dispatch]);

  const toggleAuditTable = () => {
    setShowAuditTable((prev) => !prev);
  };
  const columnHeaders: (keyof Audit)[] = [
    'id',
    'actor_user_id',
    'actor_role',
    'action_type',
    'resource_type',
    'resource_id',
    'source_endpoint',
    'old_values_json',
    'new_values_json',
    'created_at',
  ];

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = [
      1,
      totalPages,
      page,
      Math.max(1, page - 1),
      Math.min(totalPages, page + 1),
      Math.max(1, page - 2),
      Math.min(totalPages, page + 2),
    ];

    const sortedPages = Array.from(new Set(pages))
      .filter((pageNumber) => pageNumber >= 1 && pageNumber <= totalPages)
      .sort((left, right) => left - right);

    const numberedPages: Array<number | 'ellipsis'> = [];
    sortedPages.forEach((pageNumber, index) => {
      const previousPage = index === 0 ? null : sortedPages[index - 1];
      if (previousPage !== null && pageNumber - previousPage > 1) {
        numberedPages.push('ellipsis');
      }
      numberedPages.push(pageNumber);
    });

    return numberedPages;
  }, [page, totalPages]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const hasActiveFilters = Object.values(selectedFilters).some(
    (values) => Array.isArray(values) && values.length > 0
  );

  const updateFilter = (header: AuditFilterField, values: string[]) => {
    setSelectedFilters((currentFilters) => ({
      ...currentFilters,
      [header]: values,
    }));
    setPage(1);
  };

  const clearFilters = () => {
    setSelectedFilters({});
    setPage(1);
  };

  return (
    <>
    <Button
      label={showAuditTable ? "Hide Audit Table" : "Show Audit Table"}
      onClick={toggleAuditTable}
      style={buttonStyles.default}
    />
    {showAuditTable && (
    <Box pad="medium" background="light-1" round="small" overflow={{ horizontal: 'auto' }}>
      <Box direction="row" gap="small" wrap margin={{ bottom: 'medium' }}>
        {auditFilterFields.map((header) => (
          <Box key={header as string} width="medium" gap="xsmall">
            <Text size="small" weight="bold">
              {String(header).replace(/_/g, ' ')}
            </Text>
            <SelectMultiple
              placeholder={`Filter ${String(header).replace(/_/g, ' ')}`}
              options={filterOptions[header]}
              value={selectedFilters[header] ?? []}
              onChange={({ value }) => updateFilter(header, value as string[])}
            />
          </Box>
        ))}
        {filterOptionsError && (
          <Text color="status-critical">{filterOptionsError}</Text>
        )}
        <Box justify="end">
          <Button
            label="Clear Filters"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            style={buttonStyles.default}
          />
        </Box>
      </Box>

      {auditLogs.length === 0 ? (
        <Box pad="medium" align="center">
          <Text weight="bold">
            {totalCount === 0 && !hasActiveFilters
              ? 'No logs available.'
              : 'No audit logs match the selected filters.'}
          </Text>
        </Box>
      ) : (
        <Box gap="small">
          <Box overflow={{ horizontal: 'auto' }}>
            <Table style={{ tableLayout: 'fixed', width: '100%' }}>
              <TableHeader>
                <TableRow>
                  {columnHeaders.map((header) => (
                    <TableCell
                      key={header}
                      scope="col"
                      border="bottom"
                      align="left"
                      style={{
                        maxWidth: header.toString().includes('json') ? '420px' : '180px',
                        width: header.toString().includes('json') ? '420px' : '180px',
                        wordBreak: 'break-word',
                        whiteSpace: 'normal',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      <Text weight="bold">
                        {header.replace(/_/g, ' ')}
                      </Text>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log: AuditRow, index) => (
                  <TableRow key={`audit-row-${index}`}>
                    {columnHeaders.map((header) => (
                      <TableCell
                        key={header}
                        align="left"
                        style={{
                          maxWidth: header.toString().includes('json') ? '420px' : '180px',
                          wordBreak: 'break-word',
                          whiteSpace: 'normal',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {header.toString().includes('json')
                          ? renderJsonCell(
                              log[header as keyof AuditRow],
                              header.toString().includes('new')
                                ? log.old_values_json
                                : undefined,
                              header.toString().includes('new')
                            )
                          : (
                              <Text size="small">
                                {log[header as keyof AuditRow]?.toString() || ''}
                              </Text>
                            )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          <Box direction="row" justify="between" align="center" gap="small" pad={{ top: 'small' }}>
            <Text size="small">
              Page {page} of {totalPages}
            </Text>
            <Box direction="row" gap="small" wrap>
              <Button label="Previous" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} style={buttonStyles.default} />
              {pageNumbers.map((pageNumber, index) =>
                pageNumber === 'ellipsis' ? (
                  <Text key={`ellipsis-${index}`} size="small" color="dark-3">
                    ...
                  </Text>
                ) : (
                  <Button
                    key={pageNumber}
                    label={String(pageNumber)}
                    onClick={() => setPage(pageNumber)}
                    size="small"
                    style={buttonStyles.default}
                  />
                )
              )}
              <Button label="Next" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} style={buttonStyles.default} />
            </Box>
          </Box>
        </Box>
      )}
    </Box>)}
  </>
)}

export default AuditLogs;
