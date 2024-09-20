import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

const Home = () => {
  const [amount, setAmount] = useState("");
  const [payID, setPayID] = useState("");
  const [amount2, setAmount2] = useState("");
  const [orders, setOrders] = useState([]);
  const [copiedOrderId, setCopiedOrderId] = useState(null);

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BASE_URL}/getAllOrders`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch orders.");
      }
  
      const data = await response.json();
      console.log("Fetched Orders Data:", data);
  
      if (data.success && Array.isArray(data.data)) {
        setOrders(data.data);
      } else {
        throw new Error("Invalid data format received from server.");
      }
    } catch (error) {
      console.error("Fetch Orders Error:", error);
      toast.error("Failed to fetch orders.");
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handlePayment = async () => {
    if (!amount || isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    try {
      const res = await fetch(`${process.env.REACT_APP_BASE_URL}/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: parseFloat(amount) }),
      });

      if (!res.ok) {
        throw new Error("Failed to create order.");
      }

      const data = await res.json();
      handlePaymentVerify(data);

      if (data) {
        setAmount("");
        fetchOrders(); // Refresh orders after payment
      }
    } catch (error) {
      console.error("Payment Error:", error);
      toast.error("Payment failed. Please try again.");
    }
  };

  const handlePaymentVerify = async (data) => {
    if (!data || !data.amount || !data.currency || !data.id) {
      console.error("Invalid payment data:", data);
      toast.error("Invalid payment data.");
      return;
    }

    const options = {
      key: process.env.REACT_APP_RAZORPAY_KEY_ID,
      amount: data.amount,
      currency: data.currency,
      name: "Payment Test Mode",
      description: "Test Mode",
      order_id: data.id,
      handler: async (response) => {
        try {
          const res = await fetch(`${process.env.REACT_APP_BASE_URL}/verify-payment`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          if (!res.ok) {
            throw new Error("Failed to verify payment.");
          }

          const verifyData = await res.json();

          if (verifyData) {
            toast.success("Payment Successful");
            setAmount("");
            fetchOrders(); // Refresh orders after successful payment verification
          }
        } catch (error) {
          console.error("Verification Error:", error);
          toast.error("Verification failed. Please try again.");
        }
      },
      theme: {
        color: "#5f63b8",
      },
    };

    const rzp1 = new window.Razorpay(options);
    rzp1.open();
  };

  const handleRefund = async () => {
    if (!payID || !amount2 || isNaN(amount2) || amount2 <= 0) {
      toast.error("Please enter valid payment ID and amount.");
      return;
    }

    try {
      const res = await fetch(`${process.env.REACT_APP_BASE_URL}/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentId: payID, amount: parseFloat(amount2) }),
      });

      if (!res.ok) {
        throw new Error("Refund failed.");
      }

      const data = await res.json();

      if (data) {
        toast.success("Refund Successful");
        setPayID("");
        setAmount2("");
        fetchOrders(); // Refresh orders after refund
      }
    } catch (error) {
      console.error("Refund Error:", error);
      toast.error("Refund failed. Please try again.");
    }
  };

  const handleCopy = (paymentId, orderId) => {
    navigator.clipboard.writeText(paymentId).then(() => {
      setCopiedOrderId(orderId);
      setTimeout(() => setCopiedOrderId(null), 2000); // Reset after 2 seconds
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
      {/* Payment Section */}
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md mb-4">
        <h2 className="text-xl font-bold mb-4">Make a Payment</h2>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          className="border p-2 w-full mb-4"
        />
        <button onClick={handlePayment} className="bg-blue-500 text-white p-2 rounded">
          Pay
        </button>
      </div>

      {/* Refund Section */}
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md mb-4">
        <h2 className="text-xl font-bold mb-4">Request a Refund</h2>
        <input
          type="text"
          value={payID}
          onChange={(e) => setPayID(e.target.value)}
          placeholder="Payment ID"
          className="border p-2 w-full mb-2"
        />
        <input
          type="number"
          value={amount2}
          onChange={(e) => setAmount2(e.target.value)}
          placeholder="Refund Amount"
          className="border p-2 w-full mb-4"
        />
        <button onClick={handleRefund} className="bg-red-500 text-white p-2 rounded">
          Refund
        </button>
      </div>

      {/* Orders Section */}
      <div className="w-full max-w-4xl bg-white mt-8 p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">All Orders</h1>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="px-4 py-2 border">Order ID</th>
                <th className="px-4 py-2 border">Amount</th>
                <th className="px-4 py-2 border">Currency</th>
                <th className="px-4 py-2 border">Status</th>
                <th className="px-4 py-2 border">Payment ID</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.order_id}>
                  <td className="px-4 py-2 border">{order.order_id}</td>
                  <td className="px-4 py-2 border">{order.amount}</td>
                  <td className="px-4 py-2 border">{order.currency}</td>
                  <td className="px-4 py-2 border">{order.status}</td>
                  <td className="px-4 py-2 border">
                    {order.payment_id || "Payment Failed"}{" "}
                    {order.payment_id && (
                      <button
                        onClick={() => handleCopy(order.payment_id, order.order_id)}
                        className="ml-2 text-blue-500 hover:text-blue-700 relative group"
                      >
                        📋
                        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 w-max px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100">
                          Copy
                        </span>
                      </button>
                    )}
                    {copiedOrderId === order.order_id && (
                      <span className="ml-2 text-green-500">Copied!</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Home;
