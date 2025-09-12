import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { fetchAuditLogs } from "../../../store/audits/auditThunks";
import { RootState } from "../../../store";
import { Audit } from "./types";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  Box,
  Text
} from "grommet";

export const AuditLogs = () => {
  const dispatch = useAppDispatch();
  const logs = useAppSelector((state) => state.audit.logs);

  useEffect(() => {
    dispatch(fetchAuditLogs());
  }, [dispatch]);

  if (!Array.isArray(logs) || logs.length === 0) {
    return <p>No logs available.</p>;
  }

  // Dynamically get the column headers from the keys of the first log
  const columnHeaders = Object.keys(logs[0]);

  return (
    <Box pad="medium" background="light-1" round="small" overflow="auto">
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
                <Text weight="bold">{header.replace(/_/g, " ")}</Text>
              </TableCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log: Audit, index) => (
            <TableRow key={index}>
              {columnHeaders.map((header) => (
                <TableCell key={header} align="center">
                  {log[header as keyof Audit]?.toString() || ""}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

export default AuditLogs;
