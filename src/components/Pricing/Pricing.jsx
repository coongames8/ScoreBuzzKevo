import React, { useContext, useEffect, useState } from "react";
import "./Pricing.scss";
import { PriceContext } from "../../PriceContext";
import { useNavigate } from "react-router-dom";
import { Star, Check, Bolt } from "@mui/icons-material";
import {
  detectCountry,
  getCountryConfig,
  convertAmounts,
  BASE_CURRENCY,
} from "../../utils/geo";

export default function Pricing() {
  const navigate = useNavigate();
  const { setPrice } = useContext(PriceContext);
  const [countryConfig, setCountryConfig] = useState(getCountryConfig(null));
  const [converted, setConverted] = useState({});

  const plans = [
    {
      id: 1,
      title: "Silver",
      price: 230,
      duration: "/Day",
      tagline: "Daily insights",
      features: [
        "24 hours premium access",
        "Expert match analysis",
        "Daily match previews",
      ],
    },
    {
      id: 2,
      title: "Gold",
      price: 800,
      duration: "/Week",
      tagline: "Most popular",
      featured: true,
      features: [
        "7 days premium access",
        "Comprehensive weekly analysis",
        "Priority match previews",
        "Exclusive weekly picks",
      ],
    },
    {
      id: 3,
      title: "Platinum",
      price: 2000,
      duration: "/Month",
      tagline: "Best value",
      features: [
        "30 days unlimited premium",
        "Monthly match analyses",
        "All exclusive picks",
        "Priority support",
      ],
    },
  ];

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const code = await detectCountry();
      if (cancelled) return;
      const config = getCountryConfig(code);
      setCountryConfig(config);

      const kesAmounts = plans.reduce((acc, p) => {
        acc[p.id] = p.price;
        return acc;
      }, {});

      const { converted: result } = await convertAmounts(kesAmounts, config.currency);
      if (cancelled) return;
      setConverted(result);
    };

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = (price) => {
    setPrice(price);
    navigate("/pay");
  };

  const formatPrice = (plan) => {
    const amount = converted[plan.id];
    if (amount === undefined) {
      // Still loading — show base KES as a sensible default
      return `${countryConfig.symbol} ${plan.price.toLocaleString()}`;
    }
    return `${countryConfig.symbol} ${amount.toLocaleString()}`;
  };

  return (
    <div className="pricing-container" id="pricing">
      <div className="pricing-grid">
        {plans.map((plan) => (
          <div
            className={`pricing-card ${plan.featured ? "featured" : ""}`}
            key={plan.id}
          >
            {plan.featured && (
              <div className="featured-badge">
                <Star className="star-icon" />
                <span>Popular</span>
              </div>
            )}

            <div className="card-header">
              <span className="plan-tagline">{plan.tagline}</span>
              <h3>{plan.title}</h3>
              <div className="price">
                <span className="currency">{countryConfig.symbol}</span>
                <span className="amount">
                  {(converted[plan.id] ?? plan.price).toLocaleString()}
                </span>
                <span className="duration">{plan.duration}</span>
              </div>
            </div>

            <div className="card-features">
              <ul>
                {plan.features.map((item, index) => (
                  <li key={index}>
                    <span className="checkmark"><Check /></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              className={`glass-btn ${plan.featured ? "primary" : ""}`}
              onClick={() => handleClick(plan.price)}
            >
              {plan.featured ? <Bolt className="btn-icon" /> : null}
              Get Started Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
