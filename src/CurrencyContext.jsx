// CurrencyContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

// Country configurations with exchange rates
const COUNTRIES = {
  Nigeria: { code: "NG", currency: "NGN", symbol: "₦", flag: "🇳🇬", rate: 10.63 },
  Kenya: { code: "KE", currency: "KES", symbol: "KSH", flag: "🇰🇪", rate: 1 },
  SouthAfrica: { code: "ZA", currency: "ZAR", symbol: "R", flag: "🇿🇦", rate: 0.22 },
  Ghana: { code: "GH", currency: "GHS", symbol: "₵", flag: "🇬🇭", rate: 0.06 },
  Uganda: { code: "UG", currency: "UGX", symbol: "USh", flag: "🇺🇬", rate: 1.5 },
  Tanzania: { code: "TZ", currency: "TZS", symbol: "TSh", flag: "🇹🇿", rate: 1.15 },
  US: { code: "US", currency: "USD", symbol: "$", flag: "🇺🇸", rate: 0.0077 },
  UK: { code: "GB", currency: "GBP", symbol: "£", flag: "🇬🇧", rate: 0.006 },
};

const CurrencyContext = createContext();

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export const CurrencyProvider = ({ children }) => {
  const [selectedCountry, setSelectedCountry] = useState("Kenya");
  const [userCountry, setUserCountry] = useState(null);
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [convertedPrices, setConvertedPrices] = useState({});

  // Detect user's country using IP geolocation
  const detectUserCountry = async () => {
    try {
      const response = await fetch("https://ipapi.co/json/");
      if (response.ok) {
        const data = await response.json();
        const countryCode = data.country_code;

        const matchedCountry = Object.entries(COUNTRIES).find(
          ([_, config]) => config.code === countryCode
        );

        if (matchedCountry) {
          setSelectedCountry(matchedCountry[0]);
          setUserCountry(matchedCountry[0]);
          return;
        }
      }

      setSelectedCountry("Kenya");
      setUserCountry("Kenya");
    } catch (error) {
      console.error("Error detecting country:", error);
      setSelectedCountry("Kenya");
      setUserCountry("Kenya");
    }
  };

  // Convert prices to selected currency
  const convertPrices = async (basePrices) => {
    setIsLoadingRate(true);
    try {
      const rate = COUNTRIES[selectedCountry]?.rate || 1;
      
      const converted = {};
      Object.keys(basePrices).forEach((key) => {
        converted[key] = Math.round(basePrices[key] * rate);
      });
      
      setConvertedPrices(converted);
      return converted;
    } catch (error) {
      console.error("Error converting prices:", error);
      // Fallback to base prices if conversion fails
      setConvertedPrices(basePrices);
      return basePrices;
    } finally {
      setIsLoadingRate(false);
    }
  };

  // Convert a single price
  const convertPrice = (price) => {
    const rate = COUNTRIES[selectedCountry]?.rate || 1;
    return Math.round(price * rate);
  };

  // Convert from local currency back to KES
  const convertToKES = (price) => {
    const rate = COUNTRIES[selectedCountry]?.rate || 1;
    return Math.round(price / rate);
  };

  // Get current country configuration
  const getCountryConfig = () => {
    return COUNTRIES[selectedCountry];
  };

  // Get currency symbol
  const getSymbol = () => {
    return COUNTRIES[selectedCountry]?.symbol || "KSH";
  };

  // Get currency code
  const getCurrencyCode = () => {
    return COUNTRIES[selectedCountry]?.currency || "KES";
  };

  // Get all countries
  const getCountries = () => {
    return COUNTRIES;
  };

  // Set country manually
  const setCountry = (countryName) => {
    if (COUNTRIES[countryName]) {
      setSelectedCountry(countryName);
      return true;
    }
    return false;
  };

  // Get country by currency code
  const getCountryByCurrency = (currencyCode) => {
    return Object.entries(COUNTRIES).find(
      ([_, config]) => config.currency === currencyCode
    )?.[0] || null;
  };

  // Initialize on mount
  useEffect(() => {
    detectUserCountry();
  }, []);

  // Update prices when country changes
  useEffect(() => {
    // This will trigger price updates in components that use the context
    // Components should call convertPrices with their base prices
  }, [selectedCountry]);

  const value = {
    // State
    selectedCountry,
    userCountry,
    showCountrySelector,
    isLoadingRate,
    convertedPrices,
    
    // Methods
    detectUserCountry,
    convertPrices,
    convertPrice,
    convertToKES,
    getCountryConfig,
    getSymbol,
    getCurrencyCode,
    getCountries,
    setCountry,
    setShowCountrySelector,
    setSelectedCountry,
    getCountryByCurrency,
    
    // Constants
    COUNTRIES,
    countries: COUNTRIES,
    symbol: getSymbol(),
    currency: getCurrencyCode(),
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export default CurrencyContext;