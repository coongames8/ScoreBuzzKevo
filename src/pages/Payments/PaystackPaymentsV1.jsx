import { useContext, useState, useEffect, useRef } from "react";
import { AuthContext } from "../../AuthContext";
import { PriceContext } from "../../PriceContext";
import {
  SUBSCRIPTION_PLANS,
  getSubscriptionPeriod,
  getPlanName,
  handleUpgrade,
  formatPhoneNumber,
  isValidPhoneNumber,
} from "./paymentUtils";
import Swal from "sweetalert2";
import "./Payments.scss";

// API Configuration
const PAYMENT_API_BASE = "https://payment-api-production-65ef.up.railway.app/api";
const appId = import.meta.env.VITE_APP_ID

export default function PaystackPaymentsV1({ setUserData }) {
  const { price, setPrice } = useContext(PriceContext);
  const { currentUser } = useContext(AuthContext);
  const [processing, setProcessing] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("Kenya");
  const [convertedPrices, setConvertedPrices] = useState({
    daily: 230,
    weekly: 800,
    monthly: 2000,
    yearly: 7500,
  });
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);
  const referenceRef = useRef(null);
  const statusCheckIntervalRef = useRef(null);

  const countries = {
    Nigeria: { code: "NG", currency: "NGN", flag: "🇳🇬", rate: 10.63 },
    Kenya: { code: "KE", currency: "KES", flag: "🇰🇪", rate: 1 },
  };

  const priceOptions = {
    Daily: 230,
    Weekly: 800,
    Monthly: 2000,
    Yearly: 7500,
  };

  // Subscription plans
  const subscriptionPlans = [
    { id: "daily", value: 230, label: "Daily VIP", period: "Daily" },
    { id: "weekly", value: 800, label: "7 Days VIP", period: "Weekly" },
    { id: "monthly", value: 2000, label: "30 Days VIP", period: "Monthly" },
    { id: "yearly", value: 7500, label: "1 Year VIP", period: "Yearly" },
  ];

  // Convert prices for Nigeria only
  const convertToNaira = () => {
    setIsLoadingRate(true);
    try {
      const rate = countries.Nigeria.rate;

      setConvertedPrices({
        daily: Math.round(priceOptions.Daily * rate),
        weekly: Math.round(priceOptions.Weekly * rate),
        monthly: Math.round(priceOptions.Monthly * rate),
        yearly: Math.round(priceOptions.Yearly * rate),
      });
    } catch (error) {
      console.error("Error converting to Naira:", error);
      const fallbackRate = 10.63;
      setConvertedPrices({
        daily: Math.round(priceOptions.Daily * fallbackRate),
        weekly: Math.round(priceOptions.Weekly * fallbackRate),
        monthly: Math.round(priceOptions.Monthly * fallbackRate),
        yearly: Math.round(priceOptions.Yearly * fallbackRate),
      });
    } finally {
      setIsLoadingRate(false);
    }
  };

  // Reset to KES prices
  const resetToKesPrices = () => {
    setConvertedPrices({
      daily: priceOptions.Daily,
      weekly: priceOptions.Weekly,
      monthly: priceOptions.Monthly,
      yearly: priceOptions.Yearly,
    });
  };

  // Update prices when country changes
  useEffect(() => {
    if (selectedCountry === "Nigeria") {
      convertToNaira();
    } else {
      resetToKesPrices();
    }
  }, [selectedCountry]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) {
        pollRef.current.cancel();
      }
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
      }
    };
  }, []);

  const getCurrentConvertedPrice = () => {
    const period = getSubscriptionPeriod(price).toLowerCase();
    return convertedPrices[period] || price;
  };

  const getCurrencySymbol = () => {
    if (selectedCountry === "Nigeria") {
      return "₦";
    }
    return "KSH";
  };

  const getCurrencyCode = () => {
    if (selectedCountry === "Nigeria") {
      return "NGN";
    }
    return "KES";
  };

  // Helper functions
  const safeJson = async (response) => {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { error: "Invalid JSON response", raw: text, status: response.status };
    }
  };

  const handleError = (data, response, fallback) => {
    const message =
      data?.message ||
      data?.error ||
      data?.paystack_error?.message ||
      data?.error_type ||
      `${fallback}: ${response.status}`;
    return new Error(message);
  };

  const initializePayment = async ({ email, amount, phone, userId, activation_type }) => {
    const response = await fetch(`${PAYMENT_API_BASE}/initialize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appId,
        email,
        amount: amount.toString(),
        phone,
        userId: userId || "anonymous",
        activation_type: activation_type || "account_activation",
      }),
    });
    const data = await safeJson(response);
    if (!response.ok || !data.success) {
      throw handleError(data, response, "Payment initialization failed");
    }
    return data;
  };

  const checkPaymentStatus = async (reference) => {
    const response = await fetch(`${PAYMENT_API_BASE}/status/${encodeURIComponent(reference)}?appId=${appId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const data = await safeJson(response);
    if (!response.ok || !data.success) {
      throw handleError(data, response, "Status check failed");
    }
    return data;
  };

  const verifyPayment = async (reference) => {
    const response = await fetch(`${PAYMENT_API_BASE}/verify/${encodeURIComponent(reference)}?appId=${appId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const data = await safeJson(response);
    if (!response.ok || !data.success) {
      throw handleError(data, response, "Verification failed");
    }
    return data;
  };

  const submitOtp = async (reference, otpCode) => {
    const response = await fetch(`${PAYMENT_API_BASE}/submit-otp`, {
      appId,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp: otpCode.toString(), reference }),
    });
    const data = await safeJson(response);
    if (!response.ok || !data.success) {
      throw handleError(data, response, "OTP submission failed");
    }
    return data;
  };

  const pollTransaction = (reference, onSuccess, onFailure, onRequireOtp, maxAttempts = 36) => {
    let attempts = 0;
    let suspended = false;
    let cancelled = false;
    let timer = null;

    const tick = async () => {
      if (cancelled || suspended) return;
      attempts++;
      try {
        const data = await checkPaymentStatus(reference);
        if (cancelled) return;

        if (data.paid) {
          const verified = await verifyPayment(reference).catch(() => null);
          onSuccess(verified || data);
          return;
        }
        if (data.requires_action && data.status === "send_otp" && onRequireOtp) {
          suspended = true;
          onRequireOtp(reference);
          return;
        }
        if (data.can_retry) {
          onFailure({ message: data.message || "Payment failed. Please try again." });
          return;
        }
        if (attempts >= maxAttempts) {
          onFailure({ timeout: true });
        }
      } catch (error) {
        if (cancelled) return;
        if (attempts >= maxAttempts) {
          onFailure({ timeout: true, error: error.message });
        }
      }
    };

    timer = setInterval(tick, 5000);
    tick();

    return {
      async resume() {
        if (cancelled) return;
        suspended = false;
        attempts = 0;
        tick();
      },
      cancel() {
        cancelled = true;
        if (timer) clearInterval(timer);
      },
    };
  };

  const formatPhone = (p) => {
    let clean = p.replace(/\D/g, '');
    if (clean.startsWith('0')) return clean;
    if (clean.startsWith('254')) return '0' + clean.slice(3);
    if (clean.startsWith('7') || clean.startsWith('1')) return '0' + clean;
    return clean;
  };

  const initiatePayment = async () => {
    setProcessing(true);
    setAwaitingOtp(false);
    setOtp('');
    setError(null);

    Swal.fire({
      title: "Initiating Payment",
      html: "Connecting to M-Pesa...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const formattedPhone = formatPhone(phone);
      const email = currentUser?.email;

      if (!email) {
        throw new Error("User email not found. Please login again.");
      }

      const amountToPay = Math.round(getCurrentConvertedPrice());

      const data = await initializePayment({
        appId,
        email: email,
        amount: amountToPay,
        phone: formattedPhone,
        userId: currentUser?.email || "anonymous",
        activation_type: "vip_subscription",
      });

      if (!data.reference) {
        throw new Error('No reference returned from payment gateway');
      }

      Swal.close();
      referenceRef.current = data.reference;
      setStep(1);

      pollRef.current = pollTransaction(
        data.reference,
        async () => {
          setProcessing(false);
          Swal.fire({
            title: "Payment Successful! 🎉",
            html: `
              <div style="text-align: center;">
                <i class="fas fa-check-circle" style="font-size: 48px; color: #10b981;"></i>
                <h3 style="margin: 15px 0;">${getCurrencySymbol()} ${Math.round(getCurrentConvertedPrice())} Paid</h3>
                <p>Your VIP subscription payment was successful!</p>
              </div>
            `,
            icon: "success",
            confirmButtonText: "Activate Subscription",
          }).then(() => {
            const transactionData = {
              type: 'credit',
              amount: getCurrentConvertedPrice(),
              description: `${getPlanName(price)} VIP Subscription`,
              category: 'Subscription',
              currency: getCurrencyCode(),
              paymentMethod: "Paystack",
              reference: referenceRef.current,
            };
            handleUpgrade(currentUser, transactionData, setUserData);
          });
        },
        (err) => {
          setProcessing(false);
          setStep(0);
          const errorMsg = err?.timeout 
            ? 'Payment timed out. Please check your transaction status.' 
            : (err?.message || 'Payment failed. Please try again.');
          setError(errorMsg);
          Swal.fire({
            title: "Payment Failed",
            text: errorMsg,
            icon: "error",
            confirmButtonText: "OK",
          });
        },
        (reference) => {
          setAwaitingOtp(true);
          setProcessing(false);
          setStep(0);
          Swal.close();
          Swal.fire({
            title: "OTP Required",
            text: "A one-time code has been sent to your phone. Please enter it below.",
            icon: "info",
            confirmButtonText: "OK",
          });
        }
      );
    } catch (e) {
      Swal.close();
      setProcessing(false);
      setError(e.message);
      Swal.fire({
        title: "Payment Failed",
        text: e.message || "Unable to process payment. Please try again.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  const handleSubmitOtp = async () => {
    if (!otp) {
      setError('Please enter the OTP sent to your phone');
      return;
    }
    setError(null);
    setProcessing(true);
    try {
      await submitOtp(referenceRef.current, otp);
      setAwaitingOtp(false);
      setProcessing(true);
      setStep(1);
      if (pollRef.current) {
        await pollRef.current.resume();
      }
    } catch (e) {
      setProcessing(false);
      setError(e.message);
      Swal.fire({
        title: "OTP Verification Failed",
        text: e.message || "Invalid OTP. Please try again.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  const handlePayment = async () => {
    if (!currentUser) {
      Swal.fire({
        title: "Login Required",
        text: "Please login first",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    if (!phone) {
      setError('Please enter your phone number');
      return;
    }

    setError(null);
    await initiatePayment();
  };

  const handlePlanSelect = (planValue) => {
    setPrice(planValue);
  };

  return (
    <div className="kora-payment-wrapper">
      <div className="country-selector">
        <div
          className="selected-country"
          onClick={() => setShowCountrySelector(!showCountrySelector)}
        >
          <span className="flag">{countries[selectedCountry].flag}</span>
          <span className="country-name">{selectedCountry}</span>
          <span className="dropdown-arrow">
            {showCountrySelector ? "▲" : "▼"}
          </span>
        </div>

        {showCountrySelector && (
          <div className="country-dropdown">
            {Object.entries(countries).map(([country, config]) => (
              <div
                key={country}
                className={`country-option ${
                  selectedCountry === country ? "active" : ""
                }`}
                onClick={() => {
                  setSelectedCountry(country);
                  setShowCountrySelector(false);
                }}
              >
                <span className="flag">{config.flag}</span>
                <span className="country-name">{country}</span>
                <span className="currency">{config.currency}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="plan-selector">
        {subscriptionPlans.map((plan) => {
          const convertedPrice = convertedPrices[plan.id] || plan.value;
          const currency = getCurrencySymbol();

          return (
            <label
              key={plan.id}
              className={`plan-option ${price === plan.value ? "active" : ""}`}
            >
              <input
                type="radio"
                name="subscription-plan"
                value={plan.value}
                checked={price === plan.value}
                onChange={() => handlePlanSelect(plan.value)}
              />
              <span className="plan-label">{plan.label}</span>
              <span className="plan-price">
                {isLoadingRate
                  ? "Loading..."
                  : `${currency} ${Math.round(convertedPrice)}`}
              </span>
            </label>
          );
        })}
      </div>

      <div className="kora-payment">
        <h3>
          GET {getPlanName(price).toUpperCase()} VIP FOR{" "}
          {isLoadingRate
            ? "Loading..."
            : `${getCurrencySymbol()} ${Math.round(
                getCurrentConvertedPrice()
              )}`}
        </h3>

        {!awaitingOtp && step === 0 && (
          <>
            <div style={{ width: '100%', marginBottom: '12px' }}>
              <input
                type="tel"
                placeholder="Enter M-Pesa phone number"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                className="confirm-payment-btn"
                style={{
                  background: 'white',
                  color: '#333',
                  border: '1px solid #ddd',
                  textAlign: 'left',
                  paddingLeft: '16px',
                }}
                maxLength={10}
              />
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px', textAlign: 'left' }}>
                Format: 07XXXXXXXX or 2547XXXXXXXX
              </p>
            </div>
            {error && (
              <p style={{ fontSize: '13px', color: '#dc2626', margin: '-8px 0 4px 0', textAlign: 'left' }}>
                ⚠️ {error}
              </p>
            )}
          </>
        )}

        {awaitingOtp && (
          <div style={{ width: '100%', marginBottom: '12px' }}>
            <input
              type="text"
              placeholder="Enter OTP code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="confirm-payment-btn"
              style={{
                background: 'white',
                color: '#333',
                border: '1px solid #ddd',
                textAlign: 'left',
                paddingLeft: '16px',
              }}
              maxLength={6}
            />
            <p style={{ fontSize: '12px', color: '#666', marginTop: '4px', textAlign: 'left' }}>
              A one-time code was sent to your phone
            </p>
            {error && (
              <p style={{ fontSize: '13px', color: '#dc2626', margin: '-8px 0 4px 0', textAlign: 'left' }}>
                ⚠️ {error}
              </p>
            )}
          </div>
        )}

        <button
          onClick={awaitingOtp ? handleSubmitOtp : handlePayment}
          className="confirm-payment-btn"
          disabled={processing || isLoadingRate}
        >
          {processing ? (
            "PROCESSING..."
          ) : awaitingOtp ? (
            "Submit OTP"
          ) : (
            "Pay Now"
          )}
        </button>
      </div>
    </div>
  );
}
