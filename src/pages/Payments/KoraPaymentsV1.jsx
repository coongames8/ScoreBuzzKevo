import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../../AuthContext";
import { PriceContext } from "../../PriceContext";
import {
  SUBSCRIPTION_PLANS,
  getSubscriptionPeriod,
  getPlanName,
  handleUpgrade,
} from "./paymentUtils";
import Swal from "sweetalert2";
import "./Payments.scss";

export default function KoraPaymentsV1({ setUserData }) {
  const { price, setPrice } = useContext(PriceContext);
  const { currentUser } = useContext(AuthContext);
  const [processing, setProcessing] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("Kenya");
  const [userCountry, setUserCountry] = useState(null);
  const [convertedPrices, setConvertedPrices] = useState({
    daily: 230,
    weekly: 800,
    monthly: 2000,
    yearly: 7500,
  });
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const [exchangeRates, setExchangeRates] = useState({});

  const countries = {
    Nigeria: { code: "NG", currency: "NGN", flag: "🇳🇬", rate: 10.63 },
    Kenya: { code: "KE", currency: "KES", flag: "🇰🇪", rate: 1 },
  };

  // Base prices in KES
  const basePrices = {
    daily: 230,
    weekly: 800,
    monthly: 2000,
    yearly: 7500,
  };

  // Detect user's country using multiple IP geolocation APIs
  const detectUserCountry = async () => {
    try {
      const apis = [
        'https://ipapi.co/json/',
        'https://ipwho.is/',
        'https://api.country.is/'
      ];

      for (const apiUrl of apis) {
        try {
          const response = await fetch(apiUrl);
          if (!response.ok) continue;
          
          const data = await response.json();
          let countryCode = '';
          let countryName = '';
          
          if (apiUrl.includes('ipapi.co')) {
            countryCode = data.country_code;
            countryName = data.country_name;
          } else if (apiUrl.includes('ipwho.is')) {
            countryCode = data.country_code;
            countryName = data.country;
          } else if (apiUrl.includes('country.is')) {
            countryCode = data.country;
            // For country.is API, we'll map the code to full name
            const countryMap = {
              'NG': 'Nigeria',
              'KE': 'Kenya'
            };
            countryName = countryMap[countryCode] || countryCode;
          }
          
          const matchedCountry = Object.entries(countries).find(
            ([_, config]) => config.code === countryCode
          );
          
          if (matchedCountry) {
            setSelectedCountry(matchedCountry[0]);
            setUserCountry(matchedCountry[0]);
            return;
          }
        } catch (err) {
          console.log('IP detection failed:', err);
          continue;
        }
      }
      
      // Default to Kenya if no detection works
      setSelectedCountry('Kenya');
      setUserCountry('Kenya');
    } catch (error) {
      console.error('Error detecting country:', error);
      setSelectedCountry('Kenya');
      setUserCountry('Kenya');
    }
  };

  // Fetch exchange rate using Kora API
  const fetchAllExchangeRates = async (toCurrency) => {
    if (toCurrency === 'KES') {
      setConvertedPrices({
        daily: 230,
        weekly: 800,
        monthly: 2000,
        yearly: 7500
      });
      return;
    }

    setIsLoadingRate(true);
    try {
      const plans = ['daily', 'weekly', 'monthly', 'yearly'];
      const newConvertedPrices = {};
      const newExchangeRates = {};

      for (const plan of plans) {
        const amountInKES = basePrices[plan];
        
        const response = await fetch('https://api.korapay.com/api/v1/conversions/rates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ZtMjLX4B2s7CExCNfrSwSdBkfxVZ1Hye'
          },
          body: JSON.stringify({
            amount: amountInKES,
            from_currency: 'KES',
            to_currency: toCurrency,
            reference: `rate-${currentUser?.email || 'guest'}-${plan}-${Date.now()}`
          })
        });

        if (!response.ok) {
          throw new Error('Failed to fetch exchange rate');
        }

        const result = await response.json();
        
        if (result.status && result.data) {
          newConvertedPrices[plan] = result.data.to_amount;
          newExchangeRates[plan] = result.data.rate;
        } else {
          throw new Error('Invalid response');
        }
      }
      
      setConvertedPrices(newConvertedPrices);
      setExchangeRates(newExchangeRates);
      
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      // Fallback to manual conversion
      const fallbackRate = getFallbackRate(toCurrency);
      setConvertedPrices({
        daily: 230 * fallbackRate,
        weekly: 800 * fallbackRate,
        monthly: 2000 * fallbackRate,
        yearly: 7500 * fallbackRate
      });
    } finally {
      setIsLoadingRate(false);
    }
  };

  // Fallback rates if API fails
  const getFallbackRate = (toCurrency) => {
    const fallbackRates = {
      'NGN': 10.84,
      'KES': 1,
    };
    return fallbackRates[toCurrency] || 1;
  };

  // Update prices when country changes
  useEffect(() => {
    const updatePricesForCountry = async () => {
      const countryConfig = countries[selectedCountry];
      await fetchAllExchangeRates(countryConfig.currency);
    };
    
    updatePricesForCountry();
  }, [selectedCountry]);

  // Detect user country on component mount
  useEffect(() => {
    detectUserCountry();
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
      text: "Please wait...",
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
            Authorization: `Bearer sk_live_qmJcFMbn42y765ZsWVH3WRsEeEwWfTgiubRMcL2R`,
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

  // Subscription plans
  const subscriptionPlans = [
    { id: "daily", value: 230, label: "Daily VIP", period: "Daily" },
    { id: "weekly", value: 800, label: "7 Days VIP", period: "Weekly" },
    { id: "monthly", value: 2000, label: "30 Days VIP", period: "Monthly" },
    { id: "yearly", value: 7500, label: "1 Year VIP", period: "Yearly" },
  ];

  return (
    <div className="payment-container">
      <div className="payment-glass">
      <div className="country-selector" style={{ marginBottom: '20px' }}>
        <div
          className="selected-country"
          onClick={() => setShowCountrySelector(!showCountrySelector)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '8px',
            cursor: 'pointer',
            justifyContent: 'space-between'
        }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="flag" style={{ fontSize: '24px' }}>{countries[selectedCountry].flag}</span>
          <span className="country-name">{selectedCountry}</span>
          <span className="dropdown-arrow">
            {showCountrySelector ? "▲" : "▼"}
          </span>
          </div>
        </div>

        {showCountrySelector && (
          <div 
            className="country-dropdown"
            style={{
              position: 'absolute',
              background: 'rgba(0,0,0,0.9)',
              borderRadius: '8px',
              marginTop: '5px',
              zIndex: 1000,
              width: '100%'
            }}
          >
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px',
                  cursor: 'pointer',
                  background: selectedCountry === country ? 'rgba(255,255,255,0.2)' : 'transparent',
                  transition: 'background 0.3s'
              }}
              >
                <span className="flag" style={{ fontSize: '20px' }}>{config.flag}</span>
                <span className="country-name">{country}</span>
                <span className="currency" style={{ marginLeft: 'auto', fontSize: '12px' }}>{config.currency}</span>
              </div>
            ))}
          </div>
        )}

        {userCountry && userCountry !== selectedCountry && (
                        <div 
                            className="detected-country"
                            style={{
                                marginTop: '10px',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                justifyContent: 'space-between'
                            }}
                        >
                            <span>🔍 Detected: {userCountry}</span>
                            <button 
                                onClick={() => setSelectedCountry(userCountry)}
                                style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    border: 'none',
                                    padding: '5px 10px',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    color: 'white'
                                }}
                            >
                                Use detected
                            </button>
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

        <button
          onClick={handlePayment}
          className="confirm-payment-btn btn paystack-btn"
          disabled={processing || isLoadingRate}
        >
          {processing ? "PROCESSING..." : "Pay Now"}
        </button>
      </div>
      </div>
    </div>
  );
}