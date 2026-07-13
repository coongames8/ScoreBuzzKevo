import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../../AuthContext";
import { PriceContext } from "../../PriceContext";
import {
  getSubscriptionPeriod,
  getPlanName,
  handleUpgrade,
} from "./paymentUtils";
import Swal from "sweetalert2";
import "./Payments.scss";
import { Lock, Check, ExpandMore, Public } from "@mui/icons-material";

export default function KoraPaymentsV1({ setUserData }) {
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

  const countries = {
    Nigeria: { code: "NG", currency: "NGN", symbol: "₦", flag: "🇳🇬", rate: 10.63 },
    Kenya: { code: "KE", currency: "KES", symbol: "KSH", flag: "🇰🇪", rate: 1 },
  };

  const priceOptions = {
    Daily: 230,
    Weekly: 800,
    Monthly: 2000,
    Yearly: 7500,
  };

  const subscriptionPlans = [
    { id: "daily", value: 230, label: "Daily VIP", period: "Daily", tagline: "24 hours" },
    { id: "weekly", value: 800, label: "7 Days VIP", period: "Weekly", tagline: "1 week" },
    { id: "monthly", value: 2000, label: "30 Days VIP", period: "Monthly", tagline: "Best value", featured: true },
    { id: "yearly", value: 7500, label: "1 Year VIP", period: "Yearly", tagline: "Max savings" },
  ];

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

  const resetToKesPrices = () => {
    setConvertedPrices({
      daily: priceOptions.Daily,
      weekly: priceOptions.Weekly,
      monthly: priceOptions.Monthly,
      yearly: priceOptions.Yearly,
    });
  };

  useEffect(() => {
    if (selectedCountry === "Nigeria") {
      convertToNaira();
    } else {
      resetToKesPrices();
    }
  }, [selectedCountry]);

  const getCurrentConvertedPrice = () => {
    const period = getSubscriptionPeriod(price).toLowerCase();
    return convertedPrices[period] || price;
  };

  const getCurrencySymbol = () => {
    return countries[selectedCountry].symbol;
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get("reference");

    if (reference && !processing) {
      verifyTransaction(reference);
    }
  }, []);

  const verifyTransaction = async (reference) => {
    setProcessing(true);

    Swal.fire({
      title: "Verifying Payment",
      text: "Please wait...",
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      Swal.close();
      await handleUpgrade(currentUser, price, setUserData);
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      Swal.close();
      Swal.fire({
        title: "Verification Error",
        text: "Please contact support",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setProcessing(false);
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

    setProcessing(true);

    Swal.fire({
      title: "Initializing Payment",
      text: "Redirecting to secure checkout...",
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const countryConfig = countries[selectedCountry];
      const amountToPay = Math.round(getCurrentConvertedPrice());
      const reference = `ref-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const currentUrl = window.location.href.split("?")[0];

      const paymentData = {
        amount: amountToPay,
        redirect_url: `${currentUrl}?reference=`,
        currency: countryConfig.currency,
        reference: reference,
        narration: `${getPlanName(price)} VIP Subscription`,
        customer: {
          name: currentUser.email?.split("@")[0] || "Customer",
          email: currentUser.email,
        },
        metadata: {
          plan: getPlanName(price),
          user_id: currentUser.email,
        },
      };

      const response = await fetch(
        "https://api.korapay.com/merchant/api/v1/charges/initialize",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer sk_live_yQSLfFWUknmw4TdEKfaBhdqJhTUAN8DTY1p5nozm`,//`Bearer sk_live_qmJcFMbn42y765ZsWVH3WRsEeEwWfTgiubRMcL2R`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(paymentData),
        }
      );

      const result = await response.json();
      Swal.close();

      if (result.status && result.data?.checkout_url) {
        window.location.href = result.data.checkout_url;
      } else {
        throw new Error(result.message || "Failed to initialize payment");
      }
    } catch (error) {
      setProcessing(false);
      Swal.fire({
        title: "Payment Error",
        text: error.message,
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  const handlePlanSelect = (planValue) => {
    setPrice(planValue);
  };

  return (
    <div className="payment-page">
      <div className="payment-hero">
        <h1>Upgrade to VIP</h1>
        <p>Unlock premium predictions and exclusive match insights</p>
      </div>

      <div className="kora-payment-wrapper">
        <div className="country-selector">
          <button
            className="selected-country"
            onClick={() => setShowCountrySelector(!showCountrySelector)}
            aria-label="Select country"
          >
            <Public className="globe-icon" />
            <span className="flag">{countries[selectedCountry].flag}</span>
            <span className="country-name">{selectedCountry}</span>
            <span className="currency-tag">{countries[selectedCountry].currency}</span>
            <ExpandMore className={`dropdown-arrow ${showCountrySelector ? "open" : ""}`} />
          </button>

          {showCountrySelector && (
            <div className="country-dropdown">
              {Object.entries(countries).map(([country, config]) => (
                <button
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
                  {selectedCountry === country && <Check className="check-icon" />}
                </button>
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
                className={`plan-option ${price === plan.value ? "active" : ""} ${plan.featured ? "featured" : ""}`}
              >
                <input
                  type="radio"
                  name="subscription-plan"
                  value={plan.value}
                  checked={price === plan.value}
                  onChange={() => handlePlanSelect(plan.value)}
                />
                {plan.featured && <span className="plan-badge">Popular</span>}
                <span className="plan-tagline">{plan.tagline}</span>
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

        <div className="kora-payment-summary">
          <div className="summary-row">
            <span>Plan</span>
            <span className="summary-value">{getPlanName(price)} VIP</span>
          </div>
          <div className="summary-row total">
            <span>Total</span>
            <span className="summary-value">
              {isLoadingRate
                ? "Loading..."
                : `${getCurrencySymbol()} ${Math.round(getCurrentConvertedPrice())}`}
            </span>
          </div>
        </div>

        <button
          onClick={handlePayment}
          className="confirm-payment-btn"
          disabled={processing || isLoadingRate}
        >
          <Lock className="btn-icon" />
          {processing ? "PROCESSING..." : "Pay Securely Now"}
        </button>

        <p className="secure-note">
          <Lock className="lock-icon" />
          Secured by KoraPay · 256-bit encryption
        </p>
      </div>
    </div>
  );
}
