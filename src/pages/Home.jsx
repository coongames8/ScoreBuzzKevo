import React, { useContext, useEffect, useState } from 'react'
import { getAllTips } from '../firebase';
import AppHelmet from '../components/AppHelmet';
import Flyer from '../components/Flyer/Flyer';
import Testimonials from '../components/Testimonials/Testimonials';
import { PriceContext } from '../PriceContext';
import { Error, Verified, TrendingUp, EmojiEvents, Bolt } from '@mui/icons-material';
import Pricing from '../components/Pricing/Pricing';
import Tips from './Tips';

export default function Home({ userData }) {
  const [loading, setLoading] = useState(false);
  const [allTips, setAllTips] = useState(null);
  const [filteredTips, setFilteredTips] = useState(null);
  const { setPrice } = useContext(PriceContext);
  const [status, setStatus] = useState(true);
  const [isOnline] = useState(() => navigator.onLine);
  const [visibleTips, setVisibleTips] = useState(3);
  const tipsPerPage = 3;

  useEffect(() => {
    getAllTips(setAllTips, setLoading)
  }, [isOnline]);

  useEffect(() => {
    loading && setTimeout(() => setLoading(false), 2000);
  }, [loading]);

  useEffect(() => {
    if (allTips !== null) {
      const groupedData = allTips.reduce((acc, item) => {
        const dateKey = item.date;
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(item);
        return acc;
      }, {});

      const result = Object.keys(groupedData).map(date => ({
        date,
        items: groupedData[date]
      })).sort((a, b) => new Date(b.date) - new Date(a.date));
      setFilteredTips(result);
    }
  }, [allTips]);

  const loadMoreTips = () => {
    setVisibleTips(prev => prev + tipsPerPage);
  };

  const getVisibleTips = () => {
    if (!filteredTips) return [];
    return filteredTips
      .map(filteredTip => ({
        ...filteredTip,
        items: filteredTip.items.filter(tip =>
          tip.status === 'finished' && tip.premium === status
        )
      }))
      .filter(filteredTip => filteredTip.items.length > 0)
      .slice(0, visibleTips);
  };

  const visibleFilteredTips = getVisibleTips();
  const hasMoreTips = filteredTips &&
    filteredTips.filter(filteredTip =>
      filteredTip.items.filter(tip =>
        tip.status === 'finished' && tip.premium === status
      ).length > visibleTips);

  return (
    <div className='Home'>
      <AppHelmet title={"Home"} location={''} />

      <section className="hero">
        <div className="hero-content">
          <span className="hero-badge">
            <Bolt className="badge-icon" />
            Expert Football Analysis
          </span>
          <h1 className="hero-title">Win Smarter With ScoreBuzz</h1>
          <p className="hero-subtitle">
            Premium football predictions, match insights, and winning tips — curated daily by experts.
          </p>
          <div className="hero-actions">
            <a href="#pricing" className="btn hero-btn primary">
              <EmojiEvents className="btn-icon" />
              Get VIP Access
            </a>
            <a href="#tips" className="btn hero-btn ghost">
              <TrendingUp className="btn-icon" />
              View Today's Tips
            </a>
          </div>
        </div>
      </section>

      <section id="tips">
        <Tips userData={userData} />
      </section>

      <section id="pricing">
        <h1>Pricing</h1>
        <h2>Get VIP Membership</h2>
        <Pricing />
      </section>

      <section className='tables'>
        {
          filteredTips && filteredTips.length > 0 && <>
            <h1>Winning History</h1>
            <h2>Track our verified results</h2>
            <span className='btn-holder'>
              <button
                className={`btn ${!status && "selected"}`}
                onClick={() => { setStatus(false); setVisibleTips(3); }}
              >
                Free
              </button>
              <button
                className={`btn ${status && "selected"}`}
                onClick={() => { setStatus(true); setVisibleTips(3); }}
              >
                Premium VIP
              </button>
            </span>
          </>
        }
        {
          visibleFilteredTips.map(filteredTip => (
            <React.Fragment key={filteredTip.date}>
              <h2>{filteredTip.date}</h2>
              <div className="card-container">
                {filteredTip.items.map(tip => (
                  <div className="glass-card" key={tip.id || filteredTip.items.indexOf(tip)}>
                    <div className="card-header">
                      <span className="teams">{tip.home} vs {tip.away}</span>
                    </div>
                    <div className="card-body">
                      <div className="card-row">
                        <span>Pick:</span>
                        <span className="pick">{tip.pick}</span>
                      </div>
                      <div className="card-row">
                        <span>Odds:</span>
                        <span>{tip.odd}</span>
                      </div>
                      <div className="card-row result">
                        <span>Result:</span>
                        <span className={tip.won === 'won' ? 'won' : 'lost'}>
                          {tip.won === 'won' ? (
                            <>
                              <span>Won</span>
                              <Verified className='icon' />
                            </>
                          ) : (
                            <>
                              <span>Lost</span>
                              <Error className='icon' />
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </React.Fragment>
          ))
        }
        {hasMoreTips && (
          <div className="load-more-wrap">
            <button className='btn load-more' onClick={loadMoreTips}>
              Load More
            </button>
          </div>
        )}
      </section>

      <section>
        <h1>Testimonials</h1>
        <h2>What clients say:</h2>
        <Testimonials />
      </section>

      <Flyer />
    </div>
  )
}
