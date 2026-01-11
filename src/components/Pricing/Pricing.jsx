import React, { useContext } from "react";
import "./Pricing.scss";
import { PriceContext } from "../../PriceContext";
import { useNavigate } from "react-router-dom";
import { Star } from "@mui/icons-material";

export default function Pricing() {
  const navigate = useNavigate();
  const { setPrice } = useContext(PriceContext);

  const handleClick = (price) => {
    setPrice(price);
    navigate("/pay");
  };
  const plans = [
    {
      id: 1,
      title: "Silver",
      price: 200,
      duration: "/Day",
      features: [
        "Every day is game day! Check out our daily insights and match analyses!",
        "Access 24 hours premium football insights",
        "Expert Football Analysis and Match Previews",
      ],
    },
    {
      id: 2,
      title: "Gold",
      price: 700,
      duration: "/Week",
      features: [
        "Get comprehensive analysis of this week's matches",
        "Enjoy a full week of premium football insights",
        "Weekly detailed football match analyses!",
      ],
    },
    {
      id: 3,
      title: "Platinum",
      price: 2000,
      duration: "/Month",
      features: [
        "Plan ahead with our monthly match analyses",
        "Get unlimited premium access for a month",
        "Your football insights journey starts here!",
      ],
    },
  ];

  const Item = ({ data }) => {
    return (
      <div
        className={`pricing-card ${data.title === "Gold" ? "featured" : ""}`}
        key={data.duration}
      >
        {data.title === "Gold" && (
          <div className="featured-badge">
            <Star className="star-icon" />
            <span>Popular</span>
          </div>
        )}

        <div className="card-header">
          <h3>{data.title}</h3>
          <div className="price">
            <span className="currency">KSH</span>
            <span className="amount">{data.price}</span>
            <span className="duration">{data.duration}</span>
          </div>
        </div>

        <div className="card-features">
          <ul>
            {data.features.map((item, index) => (
              <li key={index}>
                <span className="checkmark">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <button className="glass-btn" onClick={() => handleClick(data.price)}>
          Get Started Now
        </button>
      </div>
    );
  };

  return (
    <div className="pricing-container" id="pricing">
      <div className="pricing-grid">
        {plans.map((item) => (
          <Item data={item} key={item.id} />
        ))}
      </div>
    </div>
  );
}
