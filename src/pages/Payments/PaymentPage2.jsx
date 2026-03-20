import { useState, useContext, useRef, useEffect } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Check, CopyAll } from "@mui/icons-material";
import AppHelmet from "../../components/AppHelmet";
import NowPaymentsApi from "@nowpaymentsio/nowpayments-api-js";
import { doc, setDoc } from "firebase/firestore";
import { db, getUser } from "../../firebase";
import "./Payments.scss";
import { AuthContext } from "../../AuthContext";
import { PriceContext } from "../../PriceContext";
import Swal from "sweetalert2";

const npApi = new NowPaymentsApi({ apiKey: "D7YT1YV-PCAM4ZN-HX9W5M1-H02KFCV" });

// PayPal configuration
const paypalInitialOptions = {
  "client-id": "AXIggvGGvXozbZhdkvizPLd89nVYW8KoyNlHO0gHx7hjY_Ah_IfgXihUQGf7T2HUUVYx-D5SNncM0CtU",
  currency: "USD",
  intent: "capture",
};

// Pesapal configuration
const PESAPAL_API_BASE = 'https://all-payments-api-production.up.railway.app/api/pesapal';
const PESAPAL_CONSUMER_KEY = "nbZBtDnSEt9X+l0cHNDFren+7dTQIJXl";
const PESAPAL_CONSUMER_SECRET = "3p2NhatNMO64hzQpqGUs062LTvE=";

// Fixed exchange rate (approximate KSH to USD)
const EXCHANGE_RATE = 150; // 1 USD = 150 KSH

export default function PaymentPage2({ setUserData }) {
  const { price, setPrice } = useContext(PriceContext); // price is always in KSH
  const { currentUser } = useContext(AuthContext);
  const [paymentType, setPaymentType] = useState("mpesa");
  const [currenciesArr, setCurrenciesArr] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState("TUSD");
  const addressRef = useRef();
  const [copied, setCopied] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payCurrency, setPayCurrency] = useState("");
  const [address, setAddress] = useState("");
  const [network, setNetwork] = useState("");
  const [paypalKey, setPaypalKey] = useState(0);
  
  // Pesapal states
  const [processing, setProcessing] = useState(false);
  const [polling, setPolling] = useState(false);
  const [orderTrackingId, setOrderTrackingId] = useState(null);
  const pollIntervalRef = useRef(null);

  // Payment methods
  const paymentMethods = [
    { id: "mpesa", label: "Mobile/Card 📲" },
    { id: "crypto", label: "Crypto ₿" },
    { id: "paypal", label: "PayPal 💳" },
  ];

  // All prices stored in KSH for PriceContext
  const subscriptionPlans = {
    mpesa: [
      { id: "daily", value: 200, label: "Daily VIP", price: "KSH 200" },
      { id: "weekly", value: 700, label: "7 Days VIP", price: "KSH 700" },
      { id: "monthly", value: 2000, label: "30 Days VIP", price: "KSH 2000" },
      { id: "yearly", value: 7500, label: "1 Year VIP", price: "KSH 7500" },
    ],
    crypto: [
      { id: "10", value: 1500, label: "Weekly", price: "$10" },
      { id: "15", value: 2400, label: "Monthly", price: "$16" },
      { id: "50", value: 7500, label: "Yearly", price: "$50" },
    ],
    paypal: [
      { id: "2", value: 300, label: "Daily", price: "$2" },
      { id: "10", value: 1500, label: "Weekly", price: "$10" },
      { id: "15", value: 2400, label: "Monthly", price: "$16" },
      { id: "50", value: 7500, label: "Yearly", price: "$50" },
    ],
  };

  // Currency conversion helpers
  const kshToUsd = (ksh) => (ksh / EXCHANGE_RATE).toFixed(2);
  const usdToKsh = (usd) => Math.round(usd * EXCHANGE_RATE);

  // Get current price in USD for PayPal/Crypto
  const getCurrentPriceInUsd = () => {
    return kshToUsd(price);
  };

  // Initialize price based on payment type
  useEffect(() => {
    const defaultPlan = subscriptionPlans[paymentType][0];
    setPrice(defaultPlan.value);
  }, [paymentType]);

  const getSubscriptionPeriod = () => {
    if (price === 200 || price === 300) return "Daily";
    if (price === 700 || price === 1500) return "Weekly";
    if (price === 2000 || price === 2400) return "Monthly";
    return "Yearly";
  };

  const handleUpgrade = async () => {
    try {
      const userDocRef = doc(db, "users", currentUser.email);
      await setDoc(
        userDocRef,
        {
          email: currentUser.email,
          username: currentUser.email,
          isPremium: true,
          subscription: getSubscriptionPeriod(),
          subDate: new Date().toISOString(),
        },
        { merge: true }
      );
      await getUser(currentUser.email, setUserData);
      
      await Swal.fire({
        icon: 'success',
        title: '🎉 Welcome to VIP!',
        html: `
          <div style="text-align: center;">
            <h3 style="color: #4CAF50; margin-bottom: 15px;">Payment Successful!</h3>
            <p>You are now a <strong>${getSubscriptionPeriod()}</strong> VIP member</p>
            <p style="font-size: 14px; color: #666; margin-top: 10px;">Enjoy exclusive tips and premium content</p>
          </div>
        `,
        showConfirmButton: true,
        confirmButtonColor: '#4CAF50',
        confirmButtonText: 'Start Exploring!',
        timer: 5000,
        timerProgressBar: true,
      });
      
      window.location.pathname = "/";
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Upgrade Failed',
        text: error.message,
        confirmButtonColor: '#d33',
      });
    }
  };

  // Handle payment method change
  const handlePaymentMethodChange = (methodId) => {
    setPaymentType(methodId);
  };

  // PayPal order creation
  const createPayPalOrder = (data, actions) => {
    const usdPrice = getCurrentPriceInUsd();
    return actions.order.create({
      purchase_units: [
        {
          amount: {
            value: usdPrice,
            currency_code: "USD",
          },
          description: `${getSubscriptionPeriod()} VIP Subscription`,
        },
      ],
    });
  };

  // PayPal approval handler
  const onPayPalApprove = (data, actions) => {
    return actions.order.capture().then(function (details) {
      console.log("PayPal payment completed:", details);
      handleUpgrade();
    });
  };

  // PayPal error handler
  const onPayPalError = (err) => {
    console.error("PayPal error:", err);
    Swal.fire({
      icon: 'error',
      title: 'Payment Failed',
      text: 'Please try again or use another payment method.',
      confirmButtonColor: '#d33',
    });
  };

  // Pesapal: Function to check payment status
  const checkPaymentStatus = async (orderTrackingId, handleUpgrade, stopPolling) => {
    const paymentData = {
      orderTrackingId,
      consumerKey: PESAPAL_CONSUMER_KEY,
      consumerSecret: PESAPAL_CONSUMER_SECRET
    };

    try {
      const res = await fetch(`${PESAPAL_API_BASE}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });
    
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Payment Status:', data);
      
      const status = data.payment_status_description || '';
      const statusCode = data.status_code;
      
      // COMPLETED - Payment successful
      if (status === 'COMPLETED' || statusCode === 1) {
        stopPolling();
        await handleUpgrade();
        return { completed: true, status: 'success' };
      } 
      // FAILED - Payment failed
      else if (status === 'FAILED' || statusCode === 2) {
        stopPolling();
        return { completed: false, status: 'failed' };
      }
      // REVERSED - Payment was reversed
      else if (status === 'REVERSED' || statusCode === 3) {
        stopPolling();
        return { completed: false, status: 'reversed' };
      }
      // INVALID - Payment not yet processed
      else if (status === 'INVALID' || statusCode === 0) {
        return { completed: false, status: 'pending' };
      }
      
      return { completed: false, status: 'pending' };
    } catch (err) {
      return { completed: false, status: 'error', error: err.message };
    }
  };

  // Pesapal: Function to open the payment modal
  const openPaymentModal = (paymentUrl, trackingId) => {
    let pollCount = 0;
    const MAX_POLLS = 60;
    
    Swal.fire({
      title: 'Complete Your Payment',
      html: `
        <div style="width: 100%; height: 500px; overflow: hidden; position: relative;">
          <iframe 
            src="${paymentUrl}" 
            style="width: 100%; height: 100%; border: none;"
            title="Pesapal Payment"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation allow-top-navigation-by-user-activation"
            allow="payment *;"
          ></iframe>
        </div>
        <div style="margin-top: 10px; text-align: center; font-size: 12px; color: #666;">
          Complete payment in the window above. This will close automatically when payment is confirmed.
        </div>
      `,
      showConfirmButton: false,
      showCloseButton: true,
      width: '900px',
      customClass: {
        popup: 'payment-modal-popup'
      },
      didOpen: () => {
        // Start polling after 15 seconds
        setTimeout(() => {
          setPolling(true);
          
          pollIntervalRef.current = setInterval(async () => {
            pollCount++;
            console.log(`Polling payment status (${pollCount}/${MAX_POLLS}) for:`, trackingId);
            
            try {
              const result = await checkPaymentStatus(
                trackingId, 
                handleUpgrade, 
                () => {
                  if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                  setPolling(false);
                  Swal.close();
                }
              );
              
              if (result.completed && result.status === 'success') {
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                setPolling(false);
                Swal.close();
              } else if (result.status === 'failed' || result.status === 'reversed') {
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                setPolling(false);
                Swal.close();
                
                setTimeout(async () => {
                  await Swal.fire({
                    icon: 'error',
                    title: 'Payment Failed',
                    text: 'Your payment could not be processed. Please try again.',
                    confirmButtonColor: '#d33',
                    confirmButtonText: 'Try Again',
                  });
                }, 300);
              }
              
              if (pollCount >= MAX_POLLS) {
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                setPolling(false);
                Swal.close();
                
                setTimeout(async () => {
                  await Swal.fire({
                    icon: 'warning',
                    title: 'Payment Status Timeout',
                    html: `
                      <div style="text-align: center;">
                        <p>We're still waiting for payment confirmation.</p>
                        <p>Please check your email for payment receipt.</p>
                        <button onclick="window.location.reload()" style="background: #3085d6; color: white; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; margin-top: 10px;">
                          Refresh Page
                        </button>
                      </div>
                    `,
                    showConfirmButton: false,
                    showCloseButton: true,
                  });
                }, 300);
              }
            } catch (err) {
              console.error('Error in polling:', err);
            }
          }, 5000);
        }, 15000);
      },
      willClose: () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setPolling(false);
      }
    });
  };

  // Pesapal: Handle payment initialization
  const handlePesapalPayment = async () => {
    if (!currentUser) {
      await Swal.fire({
        icon: 'warning',
        title: 'Login Required',
        text: 'Please login first to continue with payment',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Login Now',
        showCancelButton: true,
      }).then((result) => {
        if (result.isConfirmed) {
          window.location.pathname = '/login';
        }
      });
      return;
    }

    // Show confirmation dialog
    const result = await Swal.fire({
      icon: 'question',
      title: 'Confirm Payment',
      html: `
        <div style="text-align: left; padding: 5px;">
          <p><strong>Plan:</strong> ${getSubscriptionPeriod()} VIP</p>
          <p><strong>Amount:</strong> KSH ${price}</p>
          <p><strong>Duration:</strong> ${getSubscriptionPeriod()}</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#4CAF50',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, proceed',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    const paymentData = {
      amount: price,
      email: currentUser.email,
      description: `${getSubscriptionPeriod()} VIP Subscription`,
      countryCode: "KE",
      currency: "KES",
      url: window.location.origin + window.location.pathname,
      callbackUrl: window.location.origin + '/payment-callback',
      consumerKey: PESAPAL_CONSUMER_KEY,
      consumerSecret: PESAPAL_CONSUMER_SECRET
    };

    setProcessing(true);
    try {
      const res = await fetch(`${PESAPAL_API_BASE}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const myData = await res.json();
      
      if (myData.order_tracking_id) {
        setOrderTrackingId(myData.order_tracking_id);
      }
      
      await Swal.fire({
        icon: 'success',
        title: 'Payment Initialized!',
        text: 'Redirecting you to payment gateway...',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
      });
      
      setProcessing(false);
      
      setTimeout(() => {
        openPaymentModal(myData.redirect_url, myData.order_tracking_id);
      }, 100);
      
    } catch (err) {
      setProcessing(false);
      await Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Error: ' + err.message,
        confirmButtonColor: '#d33',
        confirmButtonText: 'OK',
      });
    }
  };

  // Handle callback from Pesapal
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const trackingId = urlParams.get('OrderTrackingId');
    const notificationType = urlParams.get('OrderNotificationType');
    
    if (trackingId && notificationType === 'CALLBACKURL' && !polling && !processing) {
      setProcessing(true);
      
      Swal.fire({
        title: 'Verifying Payment',
        text: 'Please wait while we confirm your payment...',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      checkPaymentStatus(trackingId, handleUpgrade, () => {
        setProcessing(false);
        Swal.close();
      });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Crypto payment functions
  const getCryptoAddress = async () => {
    const usdPrice = getCurrentPriceInUsd();
    const params = {
      price_amount: parseFloat(usdPrice),
      price_currency: "usd",
      pay_currency: selectedCurrency.toLowerCase(),
    };
    const response = await npApi.createPayment(params);
    setPayAmount(response.pay_amount);
    setPayCurrency(response.pay_currency);
    setAddress(response.pay_address);
    setNetwork(response.network);
  };

  const handleCopy = (e) => {
    e.preventDefault();
    addressRef.current.select();
    document.execCommand("copy");
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  useEffect(() => {
    const fetchCurrencies = async () => {
      const response = await fetch(
        "https://api.nowpayments.io/v1/merchant/coins",
        {
          headers: { "x-api-key": "K80YG02-W464QP0-QR7E9EZ-QFY3ZGQ" },
        }
      );
      const data = await response.json();
      setCurrenciesArr(data.selectedCurrencies);
    };

    fetchCurrencies();
    if (paymentType === "crypto") getCryptoAddress();
  }, [selectedCurrency, price, paymentType]);

  // Force PayPal buttons to re-render when price changes
  useEffect(() => {
    if (paymentType === "paypal") {
      setPaypalKey(prev => prev + 1);
    }
  }, [price, paymentType]);

  // Helper to display price based on payment type
  const getDisplayPrice = () => {
    if (paymentType === "mpesa") {
      return `KSH ${price}`;
    } else {
      return `$${getCurrentPriceInUsd()}`;
    }
  };

  return (
    <PayPalScriptProvider options={paypalInitialOptions}>
      <div className="payment-container">
        <AppHelmet title="Payment" location="/pay" />

        <div className="payment-glass">
          <h2 className="payment-title">Select Payment Method</h2>

          <div className="method-selector">
            {paymentMethods.map((method) => (
              <label
                key={method.id}
                className={`method-option ${
                  paymentType === method.id ? "active" : ""
                }`}
              >
                <input
                  type="radio"
                  name="payment-method"
                  value={method.id}
                  checked={paymentType === method.id}
                  onChange={() => handlePaymentMethodChange(method.id)}
                />
                {method.label}
              </label>
            ))}
          </div>

          <div className="plan-selector">
            {subscriptionPlans[paymentType].map((plan) => (
              <label
                key={plan.id}
                className={`plan-option ${price === plan.value ? "active" : ""}`}
              >
                <input
                  type="radio"
                  name="subscription-plan"
                  value={plan.value}
                  checked={price === plan.value}
                  onChange={() => setPrice(plan.value)}
                />
                <span className="plan-label">{plan.label}</span>
                <span className="plan-price">{plan.price}</span>
              </label>
            ))}
          </div>

          {paymentType === "crypto" ? (
            <div className="crypto-details">
              <h3>CRYPTO PAYMENT DETAILS</h3>

              <div className="form-group">
                <label>Select Currency:</label>
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="glass-select"
                >
                  {currenciesArr?.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>

              <div className="payment-info">
                <p>
                  Amount:{" "}
                  <span>
                    {payAmount} {payCurrency?.toUpperCase()}
                  </span>
                </p>
                <p>
                  Network: <span>{network?.toUpperCase()}</span>
                </p>
                <p>
                  Address: <span>{address}</span>
                </p>
              </div>

              <div className="address-copy">
                <input
                  type="text"
                  value={address || ""}
                  readOnly
                  ref={addressRef}
                  className="glass-input"
                />
                <button onClick={handleCopy} className="copy-btn">
                  {copied ? (
                    <Check className="icon" />
                  ) : (
                    <CopyAll className="icon" />
                  )}
                </button>
              </div>
            </div>
          ) : paymentType === "mpesa" ? (
            <div className="mpesa-payment">
              <h3>
                GET {getSubscriptionPeriod().toUpperCase()} VIP FOR {getDisplayPrice()}
              </h3>
              <button 
                onClick={handlePesapalPayment} 
                className="paystack-btn"
                disabled={processing || polling}
              >
                {processing ? (
                  <span><i className="fas fa-spinner fa-spin"></i> PROCESSING...</span>
                ) : polling ? (
                  <span><i className="fas fa-clock"></i> CHECKING PAYMENT...</span>
                ) : (
                  <span><i className="fas fa-lock"></i> Pay with Pesapal</span>
                )}
              </button>
            </div>
          ) : (
            <div className="paypal-payment">
              <h3>
                GET {getSubscriptionPeriod().toUpperCase()} VIP FOR {getDisplayPrice()}
              </h3>
              <div className="paypal-buttons-container">
                <PayPalButtons
                  key={paypalKey}
                  style={{
                    layout: "horizontal",
                    color: "gold",
                    shape: "pill",
                    label: "pay"
                  }}
                  createOrder={createPayPalOrder}
                  onApprove={onPayPalApprove}
                  onError={onPayPalError}
                  forceReRender={[price]}
                />
              </div>
              <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '14px', opacity: 0.8 }}>
                Paying: {getDisplayPrice()} for {getSubscriptionPeriod()} VIP
              </p>
            </div>
          )}
        </div>
      </div>
    </PayPalScriptProvider>
  );
}
