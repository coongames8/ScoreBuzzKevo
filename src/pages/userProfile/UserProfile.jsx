import { useEffect, useState } from 'react';
import './UserProfile.scss';
import { NavLink, useLocation } from 'react-router-dom';
import { Edit, EmojiEvents, ArrowBack } from '@mui/icons-material';

export default function UserProfile({ data }) {
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (location.state) {
      setUser(location.state)
    } else {
      setUser(data)
    }
  }, [location, data]);

  return (
    <div className="user-profile">
      {user && (
        <div className="user-header">
          <div className="uh-left">
            <div className="uh-image">
              <img src="https://i.imgur.com/Qv1WDJq.jpg" alt="Profile" />
              <div className="gradient"></div>
            </div>
            <div className="uh-info">
              <h2 className="uh-username">@{user.username}</h2>
              <span className={`uh-status ${user.isPremium ? 'vip' : 'free'}`}>
                {user.isPremium ? (
                  <>
                    <EmojiEvents className="status-icon" />
                    VIP Member
                  </>
                ) : (
                  'Free Member'
                )}
              </span>
            </div>
          </div>
          <div className="user-links">
            {!user.isPremium && (
              <NavLink className="btn primary" to='/pay'>
                <EmojiEvents className="btn-icon" />
                GET VIP
              </NavLink>
            )}
            <NavLink to="/users-edit" className="btn ghost" state={user}>
              <Edit className="btn-icon" />
              Edit
            </NavLink>
          </div>
        </div>
      )}

      <section>
        <h2>Transaction History</h2>
        <div className="coming-soon-card">
          <h1>COMING SOON</h1>
          <p>Detailed transaction history will be available here.</p>
        </div>
      </section>

      <div className="explore">
        <NavLink to="/" className="btn">
          <ArrowBack className="btn-icon" />
          EXPLORE
        </NavLink>
      </div>
    </div>
  );
}
