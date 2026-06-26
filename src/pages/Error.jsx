import React, { useLayoutEffect } from 'react';
import AppHelmet from '../components/AppHelmet';
import { Home } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export default function Error() {
  const navigate = useNavigate();

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, []);

  return (
    <div className='not-found'>
      <AppHelmet title={"Not Found"} location={window.location.pathname}/>
      <h1>404</h1>
      <h2>Page not found</h2>
      <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem' }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <button className="btn" onClick={() => navigate('/')}>
        <Home className="btn-icon" />
        Back to Home
      </button>
    </div>
  )
}
