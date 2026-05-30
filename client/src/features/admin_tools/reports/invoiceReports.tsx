
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {useEffect} from 'react';
import { fetchAuditLogs } from "../../../store/audits/auditThunks";
import { Invoice } from "../../../types";

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  Box,
  Text,
  Button
} from 'grommet';

export const invoiceReports = () => {

    const invoices = useAppSelector((state) => state.invoice.list);
    const invoiceList = Array.isArray(invoices) ? invoices : [];
    const dispatch = useAppDispatch();

    const columnHeaders = invoiceList.length
    ? (Object.keys(invoiceList[0]) as (keyof Invoice)[])
    : [];

    useEffect(() => {
       dispatch(fetchAuditLogs());
     }, [dispatch]);

  return (
    <Box pad="medium" background="light-1" round="small" overflow="auto">

        <Text size="large" weight="bold" margin={{ bottom: 'medium' }}>Invoice Reports</Text>
        <Table>
          <TableHeader>
            <TableRow>
              {columnHeaders.map((header) => (
                <TableCell key={header} scope="col" border="bottom">
                  <Text weight="bold">{header}</Text>
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoiceList.map((invoice) => (
              <TableRow key={invoice.id}>
                {columnHeaders.map((header) => (
                  <TableCell key={header} border="bottom">
                    {String(invoice[header])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>   
      
  );
}

export default invoiceReports;  