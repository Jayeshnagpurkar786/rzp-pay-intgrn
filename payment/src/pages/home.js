import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

const Home = () => {
  const [amount, setAmount] = useState("");
  const [payID, setPayID] = useState("");
  const [amount2, setAmount2] = useState("");
  const [orders, setOrders] = useState([]);

  // Fetch all orders from the backend
  const fetchOrders = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_BASE_URL}/getAllUserData`);
      console.log(process.env.REACT_APP_BASE_URL);

      if (!res.ok) {
        throw new Error(`Failed to fetch orders. Status: ${res.status}`);
      }

      const data = await res.json();
      setOrders(data.data);
    } catch (error) {
      console.error("Fetch Orders Error:", error);
      toast.error("Failed to fetch orders.");
    }
  };

  useEffect(() => {
    fetchOrders(); // Fetch orders when the component mounts
  }, []);

  const handlePayment = async () => {
    if (!amount || isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    try {
      const res = await fetch(`${process.env.REACT_APP_BASE_URL}/createOrder`, {
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
      handlePaymentVerify(data.data);

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
    if (!data || !data.amount || !data.order_id) {
      console.error("Invalid payment data:", data);
      toast.error("Invalid payment data.");
      return;
    }

    const options = {
      key: process.env.REACT_APP_RAZORPAY_KEY_ID,
      amount: data.amount,
      currency: "INR", // Adjust currency if needed
      name: "Payment Test Mode",
      description: "Test Mode",
      order_id: data.order_id,
      handler: async (response) => {
        try {
          const res = await fetch(`${process.env.REACT_APP_BASE_URL}/verifyPayment`, {
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

          if (verifyData.success) {
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
      const res = await fetch(`${process.env.REACT_APP_BASE_URL}/refundPayment`, {
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

      if (data.success) {
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

  const [copiedOrderId, setCopiedOrderId] = useState(null);
  const handleCopy = (paymentId, orderId) => {
    navigator.clipboard.writeText(paymentId).then(() => {
      setCopiedOrderId(orderId);
      setTimeout(() => setCopiedOrderId(null), 2000); // Reset after 2 seconds
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
      <div className="flex flex-row mt-9 space-x-4">
        {/* Payment Section */}
        <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-4">Payment</h1>
          <label
            htmlFor="amount"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Amount
          </label>
          <input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="block w-full p-2 border border-gray-300 rounded-md mb-4"
            placeholder="Enter amount"
          />
          <button
            onClick={handlePayment}
            className="w-full py-2 px-4 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600"
          >
            Pay Now
          </button>
        </div>

        {/* Refund Section */}
        <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-4">Refund</h1>
          <label
            htmlFor="payID"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Payment ID
          </label>
          <input
            id="payID"
            type="text"
            value={payID}
            onChange={(e) => setPayID(e.target.value)}
            className="block w-full p-2 border border-gray-300 rounded-md mb-4"
            placeholder="Enter payment ID"
          />
          <label
            htmlFor="amount2"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Amount
          </label>
          <input
            id="amount2"
            type="number"
            value={amount2}
            onChange={(e) => setAmount2(e.target.value)}
            className="block w-full p-2 border border-gray-300 rounded-md mb-4"
            placeholder="Enter amount"
          />
          <button
            onClick={handleRefund}
            className="w-full py-2 px-4 bg-red-500 text-white font-semibold rounded-md hover:bg-red-600"
          >
            Refund Now
          </button>
        </div>
      </div>

      {/* Display Orders */}
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md mt-8">
        <h1 className="text-2xl font-bold mb-4">Orders</h1>
        <ul>
          {orders.map((order) => (
            <li key={order.order_id} className="mb-2">
              <p className="text-sm text-gray-600">
                <strong>Order ID:</strong> {order.order_id}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Payment ID:</strong> {order.payment_id}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Amount:</strong> ₹{order.amount}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Email:</strong> {order.email}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Contact:</strong> {order.contact}
              </p>
              <button
                onClick={() => handleCopy(order.payment_id, order.order_id)}
                className="mt-2 py-1 px-3 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
              >
                {copiedOrderId === order.order_id ? "Copied!" : "Copy Payment ID"}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Home;
