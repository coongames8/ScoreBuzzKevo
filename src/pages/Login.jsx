import React, { useContext, useEffect, useLayoutEffect, useState } from 'react'
import { signInUser } from '../firebase';
import { AuthContext } from '../AuthContext';
import AppHelmet from '../components/AppHelmet';
import { NavLink, useNavigate } from 'react-router-dom'
import Logo from '../assets/logo.png';
import { Login as LoginIcon, Visibility, VisibilityOff } from '@mui/icons-material';

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const { currentUser } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitting(true);
        signInUser(email, password, (err) => {
            setError(err);
            setSubmitting(false);
        });
    }

    useEffect(() => {
        if (currentUser) navigate('/');
        if (error) {
            const t = setTimeout(() => setError(null), 3000);
            return () => clearTimeout(t);
        }
    }, [error, currentUser, navigate]);

    useLayoutEffect(() => {
        window.scrollTo(0, 0)
    }, []);

    return (
        <div className='auth-container'>
            <AppHelmet title={"Login"} location={'/login'} />
            <div className="auth-glass">
                <div className="auth-logo">
                    <img src={Logo} alt="ScoreBuzz" />
                </div>
                <div className="auth-header">
                    <h2>Welcome Back</h2>
                    <p>Sign in to access your account</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder='Email address'
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group password-group">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder='Password'
                            required
                            autoComplete="current-password"
                        />
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowPassword(s => !s)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                        </button>
                    </div>

                    {error && <div className="auth-error">{error} - Please try again</div>}

                    <button type="submit" className="auth-btn" disabled={submitting}>
                        <LoginIcon className="btn-icon" />
                        {submitting ? 'SIGNING IN...' : 'LOGIN'}
                    </button>

                    <div className="auth-footer">
                        <span>Don't have an account?</span>
                        <NavLink to='/register' className="auth-link">Sign Up &raquo;</NavLink>
                    </div>
                </form>
            </div>
        </div>
    );
};
