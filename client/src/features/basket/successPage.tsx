// import { useEffect, useRef } from "react";
// import { useDispatch } from "react-redux";
// import { clearBasket } from "../../store/basket/basketSlice";

type BasketItem = {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  image?: string;
};

type SuccessfulCheckoutProps = {
  checkout: {
    items: BasketItem[];
    totalPrice: number;
  };
};


function SuccessfulCheckout({ checkout }: SuccessfulCheckoutProps) {
  const invoiceCreationDate = new Date().toISOString();
  const invoiceDueDate = new Date();
  invoiceDueDate.setDate(invoiceDueDate.getDate() + 14);

  const customerInvoice = {
    items: checkout.items.map((item) => ({
      product_id: Number(item.id),
      quantity: item.quantity,
      total_price: item.quantity * item.price,
      user_id: 0,
      invoice_creation_date: invoiceCreationDate,
      invoice_due_date: invoiceDueDate.toISOString(),
      invoice_status: "Unpaid" as const
    })),
    totalPrice: checkout.totalPrice
  };

  console.warn("Basket items in SuccessfulCheckout:", checkout.items);
  console.warn("Total price in SuccessfulCheckout:", checkout.totalPrice);
  console.log("Customer Invoice payload:", customerInvoice);

  // useEffect(() => {
  //   if (invoiceSubmitted.current || checkout.items.length === 0) {
  //     return;
  //   }
  //
  //   invoiceSubmitted.current = true;
  //
  //   const submitInvoice = async () => {
  //     try {
  //       const response = await fetch(
  //         `${process.env.REACT_APP_API_URL}/api/invoices`,
  //         {
  //           method: "POST",
  //           headers: {
  //             "Content-Type": "application/json"
  //           },
  //           body: JSON.stringify(customerInvoice)
  //         }
  //       );
  //
  //       if (!response.ok) {
  //         throw new Error(`Failed to create invoice: ${response.statusText}`);
  //       }
  //
  //       dispatch(clearBasket());
  //       localStorage.removeItem("basket");
  //     } catch (error) {
  //       console.error("Unable to submit invoice:", error);
  //     }
  //   };
  //
  //   void submitInvoice();
  // }, [checkout.items, checkout.totalPrice, dispatch]);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold mb-4">Thank you for your purchase!</h1>
      <p className="text-lg mb-8">Your order has been successfully processed.</p>
      <a
        href="/"
        className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-300"
      >
        Continue Shopping
      </a>
    </div>
  );
}

export default SuccessfulCheckout;