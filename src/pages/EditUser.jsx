import React, { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../AuthContext';
import Loader from '../components/Loader/Loader';
import { db, getUser } from '../firebase';
import AppHelmet from '../components/AppHelmet';
import { useLocation, useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { ArrowBack, Person } from '@mui/icons-material';

export default function EditUser({ setUserData }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const { currentUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [subscription, setSubscription] = useState("");
  const [subDate, setSubDate] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    if (currentUser !== null) {
      if (currentUser.email === 'kkibetkkoir@gmail.com' || currentUser.email === 'arovanzgamez@gmail.com') {
        setIsAdmin(true)
      } else {
        setIsAdmin(false)
      }
    }
  }, [currentUser])

  function toDateTimeLocal(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  useEffect(() => {
    if (user) {
      setEmail(user.email)
      setUsername(user.username)
      setIsPremium(user.isPremium)
      user.subscription ? setSubscription(user.subscription) : setSubscription("Free")
      user.subDate && setSubDate(toDateTimeLocal(user.subDate))
    }
  }, [user]);

  useEffect(() => {
    setUser(location.state)
  }, [location]);

  const handleSubmit = (e) => {
    e.preventDefault()

    if (isAdmin) {
      const usercollref = doc(db, 'users', user.email)
      updateDoc(usercollref, {
        isPremium,
        subscription: subscription === "Free" ? "" : subscription,
        subDate
      }).then(() => {
        getUser(user.email, setUserData)
        navigate(-1);
      }).catch(error => {
        setError(error.message)
      })
    } else {
      const usercollref = doc(db, 'users', user.email)
      updateDoc(usercollref, {
        username
      }).then(() => {
        navigate(-1);
      }).catch(error => {
        setError(error.message)
      })
    }
  }

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(t);
    }
  }, [error]);

  useEffect(() => {
    if (!currentUser) navigate('/');
  }, [currentUser, navigate]);

  return (
    <div className='admin-glass'>
      <AppHelmet title={"Edit User"} location={'/users-edit'} />
      <div className="admin-header">
        <h1>Update User</h1>
        <p>Edit user details below</p>
      </div>

      {!loading && user ? (
        <form onSubmit={handleSubmit} className="admin-form">
          {error && <div className="form-error">{error}</div>}

          <div className="form-grid">
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                placeholder='@someone'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="text"
                placeholder='example@gmail.com'
                value={email}
                readOnly
              />
            </div>

            <div className="form-group">
              <label>Subscription</label>
              <input
                type="text"
                placeholder='subscription'
                value={subscription}
                onChange={(e) => setSubscription(e.target.value)}
                readOnly={!isAdmin}
              />
            </div>

            <div className="form-group">
              <label>Subscribed On</label>
              <input
                type="datetime-local"
                value={subDate}
                onChange={(e) => setSubDate(e.target.value)}
                readOnly={!isAdmin}
              />
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={isPremium}
                  onChange={(e) => setIsPremium(e.target.checked)}
                  readOnly={!isAdmin}
                />
                Premium Member
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-btn">
              <Person className="btn-icon" />
              Update User
            </button>
            <button type="button" className="cancel-btn" onClick={() => navigate(-1)}>
              <ArrowBack className="btn-icon" />
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <Loader />
      )}
    </div>
  )
}
