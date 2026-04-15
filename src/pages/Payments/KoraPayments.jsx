import React, { useState, useContext, useRef, useEffect } from 'react';
import { Check, CopyAll, ArrowUpward } from '@mui/icons-material';
import AppHelmet from '../../components/AppHelmet';
import NowPaymentsApi from '@nowpaymentsio/nowpayments-api-js';
import KoraPayment from 'kora-checkout';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import './Payments.scss'
import { AuthContext } from '../../AuthContext';
import { PriceContext } from '../../PriceContext';

const npApi = new NowPaymentsApi({ apiKey: 'D7YT1YV-PCAM4ZN-HX9W5M1-H02KFCV' });

export default function KoraPayments({ setUserData }) {
    const { price, setPrice } = useContext(PriceContext);
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
    
    // Country selection states
    const [selectedCountry, setSelectedCountry] = useState('Kenya');
    const [showCountrySelector, setShowCountrySelector] = useState(false);
    const [userCountry, setUserCountry] = useState(null);
    const [convertedPrices, setConvertedPrices] = useState({
        daily: 230,
        weekly: 800,
        monthly: 2000,
        yearly: 7500
    });
    const [exchangeRates, setExchangeRates] = useState({});
    const [isLoadingRate, setIsLoadingRate] = useState(false);

    // Country configurations
    const countries = {
        'Nigeria': { code: 'NG', currency: 'NGN', flag: '🇳🇬', defaultPrice: 2500 },
        'Kenya': { code: 'KE', currency: 'KES', flag: '🇰🇪', defaultPrice: 230 },
        /*'Ghana': { code: 'GH', currency: 'GHS', flag: '🇬🇭', defaultPrice: 20 },
        'South Africa': { code: 'ZA', currency: 'ZAR', flag: '🇿🇦', defaultPrice: 50 },
        'Uganda': { code: 'UG', currency: 'UGX', flag: '🇺🇬', defaultPrice: 8000 },
        'Tanzania': { code: 'TZ', currency: 'TZS', flag: '🇹🇿', defaultPrice: 5000 }*/
    };

    // Base prices in KES (original pricing)
    const basePrices = {
        daily: 230,
        weekly: 800,
        monthly: 2000,
        yearly: 7500
    };

    // Detect user's country using IP geolocation
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
                    
                    if (apiUrl.includes('ipapi.co')) {
                        countryCode = data.country_code;
                    } else if (apiUrl.includes('ipwho.is')) {
                        countryCode = data.country_code;
                    } else if (apiUrl.includes('country.is')) {
                        countryCode = data.country;
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
            
            setSelectedCountry('Kenya');
            setUserCountry('Kenya');
        } catch (error) {
            console.error('Error detecting country:', error);
            setSelectedCountry('Kenya');
            setUserCountry('Kenya');
        }
    };

    // Fetch exchange rate for all plans
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
            'GHS': 0.084,
            'ZAR': 0.13,
            'UGX': 28.67,
            'TZS': 19.97
        };
        return fallbackRates[toCurrency] || 1;
    };

    // Update all prices when country changes
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

    // Payment methods
    const paymentMethods = [
        { id: "mpesa", label: "Mobile Payments 📲" },
        { id: "crypto", label: "Crypto ₿" }
    ];

    // Subscription plans with converted prices
    const subscriptionPlans = {
        mpesa: [
            { id: "daily", value: 230, label: "Daily VIP", price: `${countries[selectedCountry].currency} ${Math.round(convertedPrices.daily)}` },
            { id: "weekly", value: 800, label: "7 Days VIP", price: `${countries[selectedCountry].currency} ${Math.round(convertedPrices.weekly)}` },
            { id: "monthly", value: 2000, label: "30 Days VIP", price: `${countries[selectedCountry].currency} ${Math.round(convertedPrices.monthly)}` },
            { id: "yearly", value: 7500, label: "1 Year VIP", price: `${countries[selectedCountry].currency} ${Math.round(convertedPrices.yearly)}` }
        ],
        crypto: [
            { id: "10", value: 10, label: "Weekly", price: "$10" },
            { id: "15", value: 16, label: "Monthly", price: "$16" },
            { id: "50", value: 50, label: "Yearly", price: "$50" }
        ]
    };

    const getSubscriptionPeriod = () => {
        if (paymentType === "mpesa") {
            if (price === 230) return 'Daily';
            if (price === 800) return 'Weekly';
            if (price === 2000) return 'Monthly';
            return 'Yearly';
        } else {
            if (price === 10) return 'Weekly';
            if (price === 16) return 'Monthly';
            return 'Yearly';
        }
    };

    const getCurrentConvertedPrice = () => {
        const period = getSubscriptionPeriod().toLowerCase();
        if (paymentType === "mpesa") {
            return convertedPrices[period] || price;
        }
        return price;
    };

    const handleUpgrade = async () => {
        try {
            const userDocRef = doc(db, "users", currentUser.email);
            await setDoc(userDocRef, {
                email: currentUser.email,
                username: currentUser.email,
                isPremium: true,
                subscription: getSubscriptionPeriod(),
                subDate: new Date().toISOString(),
                country: selectedCountry,
                currency: countries[selectedCountry].currency,
                amountPaidKES: price,
                amountPaidLocal: getCurrentConvertedPrice(),
                exchangeRate: exchangeRates[getSubscriptionPeriod().toLowerCase()]
            }, { merge: true });

            await getUser(currentUser.email, setUserData);
            alert(`You Have Upgraded To ${getSubscriptionPeriod()} VIP (${selectedCountry})`);
            window.location.pathname = '/';
        } catch (error) {
            alert(error.message);
        }
    };

    const handlePayment = () => {
        const countryConfig = countries[selectedCountry];
        
        const paymentOptions = {
            key: "pk_live_KxNb5jDg18CQtJWzJt1RdgyMNsRo4D9NanrmE7nP",//pk_live_jq6VWUDumbyq2yF8kfkkAtbEzQf4yium2nPc3ekW
            reference: `ref-${Date.now()}`,
            amount: Math.round(getCurrentConvertedPrice()),
            currency: countryConfig.currency,
            customer: {
                name: currentUser.email,
                email: currentUser.email,
            },
            onSuccess: () => {
                handleUpgrade();
            },
            onFailed: (err) => {
                console.error(err.message);
                alert('Payment failed. Please try again.');
            }
        };

        const payment = new KoraPayment();
        payment.initialize(paymentOptions);
    };

    const getCryptoAddress = async () => {
        const params = {
            price_amount: price,
            price_currency: "usd",
            pay_currency: selectedCurrency.toLowerCase()
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
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 1000);
    };

    useEffect(() => {
        const fetchCurrencies = async () => {
            const response = await fetch("https://api.nowpayments.io/v1/merchant/coins", {
                headers: { "x-api-key": "K80YG02-W464QP0-QR7E9EZ-QFY3ZGQ" }
            });
            const data = await response.json();
            setCurrenciesArr(data.selectedCurrencies);
        };

        fetchCurrencies();
        if (paymentType === "crypto") getCryptoAddress();
    }, [selectedCurrency, price, paymentType]);

    return (
        <div className="payment-container">
            <AppHelmet title="Payment" location="/pay" />

            <div className="payment-glass">
                <h2 className="payment-title">Select Payment Method</h2>

                {/* Country Selection Section */}
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
                        </div>
                        <span className="dropdown-arrow">{showCountrySelector ? '▲' : '▼'}</span>
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
                                    className={`country-option ${selectedCountry === country ? 'active' : ''}`}
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

                <div className="method-selector">
                    {paymentMethods.map(method => (
                        <label key={method.id} className={`method-option ${paymentType === method.id ? 'active' : ''}`}>
                            <input
                                type="radio"
                                name="payment-method"
                                value={method.id}
                                checked={paymentType === method.id}
                                onChange={() => setPaymentType(method.id)}
                            />
                            {method.label}
                        </label>
                    ))}
                </div>

                <div className="plan-selector">
                    {subscriptionPlans[paymentType].map(plan => (
                        <label key={plan.id} className={`plan-option ${price === plan.value ? 'active' : ''}`}>
                            <input
                                type="radio"
                                name="subscription-plan"
                                value={plan.value}
                                checked={price === plan.value}
                                onChange={() => setPrice(plan.value)}
                                disabled={isLoadingRate}
                            />
                            <span className="plan-label">{plan.label}</span>
                            <span className="plan-price">
                                {paymentType === "mpesa" && isLoadingRate ? 'Loading...' : plan.price}
                            </span>
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
                                {currenciesArr?.map(currency => (
                                    <option key={currency} value={currency}>{currency}</option>
                                ))}
                            </select>
                        </div>

                        <div className="payment-info">
                            <p>Amount: <span>{payAmount} {payCurrency?.toUpperCase()}</span></p>
                            <p>Network: <span>{network?.toUpperCase()}</span></p>
                            <p>Address: <span>{address}</span></p>
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
                                {copied ? <Check className="icon" /> : <CopyAll className="icon" />}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="mpesa-payment">
                        <h3>GET {getSubscriptionPeriod().toUpperCase()} VIP FOR {isLoadingRate ? 'Loading...' : `${countries[selectedCountry].currency} ${Math.round(getCurrentConvertedPrice())}`}</h3>
                        <button onClick={handlePayment} className="btn paystack-btn" disabled={isLoadingRate}>Pay Now</button>
                    </div>
                )}
            </div>
        </div>
    );
}
