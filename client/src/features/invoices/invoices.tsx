import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  fetchAllOrders,
  fetchInvoiceById,
  fetchOrderHistory,
  updateInvoice,
} from '../../store/basket/basketThunks';
import type { DeliveryAddress, InvoiceDetails, InvoiceOrder } from '../../types';
import { useAppDispatch } from '../../store/hooks';
import InvoiceDetailsDialog from './invoice-details';
import InvoiceHistory from './invoice-history';
import { notifyNotificationsChanged } from '../notifications/events';

interface InvoicesProps {
  scope: 'mine' | 'all';
  userType?: string;
  billingAddress?: DeliveryAddress;
}

const NO_ADDRESS: DeliveryAddress = {
  address_line1: '',
  address_line2: '',
  address_line3: '',
  town: '',
  county: '',
  postcode: '',
};

function Invoices({ scope, userType, billingAddress = NO_ADDRESS }: InvoicesProps) {
  const loadOrdersThunk = scope === 'all' ? fetchAllOrders : fetchOrderHistory;
  const dispatch = useAppDispatch();
  const [orders, setOrders] = useState<InvoiceOrder[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(searchParams.get('invoice') ?? '');
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
  const [invoiceUpdateMessage, setInvoiceUpdateMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadOrders = async () => {
      const result = await dispatch(loadOrdersThunk());
      if (loadOrdersThunk.fulfilled.match(result)) {
        setOrders(result.payload);
      }
    };

    loadOrders();
  }, [dispatch, loadOrdersThunk]);

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
        // Opening an invoice marks it as seen on the server, so drop the highlight here too
        setOrders((current) =>
          current.map((order) =>
            String(order.invoice_id) === selectedInvoiceId ? { ...order, has_changes: false } : order
          )
        );
      }
    };

    loadInvoice();
  }, [dispatch, selectedInvoiceId]);

  const refreshInvoiceData = async () => {
    const [invoiceResult, ordersResult] = await Promise.all([
      selectedInvoiceId ? dispatch(fetchInvoiceById(selectedInvoiceId)) : undefined,
      dispatch(loadOrdersThunk()),
    ]);

    if (invoiceResult && fetchInvoiceById.fulfilled.match(invoiceResult)) {
      setInvoice(invoiceResult.payload);
    }
    if (ordersResult && loadOrdersThunk.fulfilled.match(ordersResult)) {
      setOrders(ordersResult.payload);
    }
  };

  const closeInvoice = () => {
    if (searchParams.has('invoice')) {
      setSearchParams({}, { replace: true });
    }
    setSelectedInvoiceId('');
    setInvoice(null);
    setInvoiceUpdateMessage(null);
  };

  const saveChanges = async (changes: { status?: string; trackingInfo?: string }) => {
    if (!selectedInvoiceId) {
      return;
    }

    const result = await dispatch(
      updateInvoice({
        invoiceId: selectedInvoiceId,
        invoiceStatus: changes.status,
        trackingInfo: changes.trackingInfo,
      })
    );

    if (!updateInvoice.fulfilled.match(result)) {
      setInvoiceUpdateMessage('Unable to update invoice');
      return;
    }

    setInvoiceUpdateMessage('Invoice updated');
    notifyNotificationsChanged();
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
          onSave={saveChanges}
        />
      )}
      <InvoiceHistory
        orders={orders}
        title={scope === 'all' ? 'All Invoices' : 'My Invoices'}
        showCustomer={scope === 'all'}
        onOpenInvoice={setSelectedInvoiceId}
      />
    </>
  );
}

export default Invoices;
