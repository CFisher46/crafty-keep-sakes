import { useEffect, useState } from 'react';
import {
  fetchInvoiceById,
  fetchOrderHistory,
  updateInvoiceStatus,
  updateInvoiceTrackingInfo,
} from '../../store/basket/basketThunks';
import type { DeliveryAddress, InvoiceDetails, InvoiceOrder } from '../../types';
import { useAppDispatch } from '../../store/hooks';
import InvoiceDetailsDialog from './invoice-details';
import InvoiceHistory from './invoice-history';

interface InvoicesProps {
  userId?: string;
  userType?: string;
  billingAddress: DeliveryAddress;
}

function Invoices({ userId, userType, billingAddress }: InvoicesProps) {
  const dispatch = useAppDispatch();
  const [orders, setOrders] = useState<InvoiceOrder[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
  const [invoiceUpdateMessage, setInvoiceUpdateMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadOrders = async () => {
      if (!userId) {
        return;
      }

      const result = await dispatch(fetchOrderHistory());
      if (fetchOrderHistory.fulfilled.match(result)) {
        setOrders(result.payload);
      }
    };

    loadOrders();
  }, [dispatch, userId]);

  useEffect(() => {
    const loadInvoice = async () => {
      if (!selectedInvoiceId) {
        setInvoice(null);
        setInvoiceUpdateMessage(null);
        return;
      }

      const result = await dispatch(fetchInvoiceById(selectedInvoiceId));
      if (fetchInvoiceById.fulfilled.match(result)) {
        setInvoice(result.payload);
        setInvoiceUpdateMessage(null);
      }
    };

    loadInvoice();
  }, [dispatch, selectedInvoiceId]);

  const refreshInvoiceData = async () => {
    const [invoiceResult, ordersResult] = await Promise.all([
      selectedInvoiceId ? dispatch(fetchInvoiceById(selectedInvoiceId)) : undefined,
      userId ? dispatch(fetchOrderHistory()) : undefined,
    ]);

    if (invoiceResult && fetchInvoiceById.fulfilled.match(invoiceResult)) {
      setInvoice(invoiceResult.payload);
    }
    if (ordersResult && fetchOrderHistory.fulfilled.match(ordersResult)) {
      setOrders(ordersResult.payload);
    }
  };

  const closeInvoice = () => {
    setSelectedInvoiceId('');
    setInvoice(null);
    setInvoiceUpdateMessage(null);
  };

  const updateStatus = async (status: string) => {
    if (!selectedInvoiceId) {
      return;
    }

    const result = await dispatch(
      updateInvoiceStatus({ invoiceId: selectedInvoiceId, invoiceStatus: status })
    );

    if (!updateInvoiceStatus.fulfilled.match(result)) {
      setInvoiceUpdateMessage('Unable to update invoice status');
      return;
    }

    setInvoiceUpdateMessage('Invoice status updated');
    await refreshInvoiceData();
  };

  const updateTrackingInfo = async (trackingInfo: string) => {
    if (!selectedInvoiceId) {
      return;
    }

    const result = await dispatch(
      updateInvoiceTrackingInfo({ invoiceId: selectedInvoiceId, trackingInfo })
    );

    if (!updateInvoiceTrackingInfo.fulfilled.match(result)) {
      setInvoiceUpdateMessage('Unable to update invoice tracking info');
      return;
    }

    setInvoiceUpdateMessage('Invoice tracking info updated');
    await refreshInvoiceData();
  };

  return (
    <>
      {invoice && (
        <InvoiceDetailsDialog
          invoice={invoice}
          billingAddress={billingAddress}
          userType={userType}
          updateMessage={invoiceUpdateMessage}
          onClose={closeInvoice}
          onUpdateStatus={updateStatus}
          onUpdateTracking={updateTrackingInfo}
        />
      )}
      <InvoiceHistory orders={orders} onOpenInvoice={setSelectedInvoiceId} />
    </>
  );
}

export default Invoices;
