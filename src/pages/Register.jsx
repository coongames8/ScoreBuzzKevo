import React, { useContext, useEffect, useLayoutEffect, useState } from 'react';
import { AuthContext } from '../AuthContext';
import AppHelmet from '../components/AppHelmet';
import { registerUser } from '../firebase';
import { NavLink, useNavigate } from 'react-router-dom';
import Logo from '../assets/logo.png';
import { PersonAdd, Visibility, VisibilityOff } from '@mui/icons-material';

const Register = () => {
    const { currentUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const handleRegister = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        registerUser(username, email, password,
            (msg) => { setSuccess(msg); setSubmitting(false); },
            (err) => { setError(err); setSubmitting(false); }
        );
    }

    useEffect(() => {
        if (currentUser) navigate('/');
        if (error) {
            const t = setTimeout(() => setError(null), 3000);
            return () => clearTimeout(t);
        }
        if (success) {
            const t = setTimeout(() => {
                setSuccess(null);
                setEmail('');
                setPassword('');
                setUsername('');
            }, 2500);
            return () => clearTimeout(t);
        }
    }, [error, success, currentUser, navigate]);

    useLayoutEffect(() => {
        window.scrollTo(0, 0)
    }, []);

    return (
        <div className='auth-container'>
            <AppHelmet title={"Register"} location={'/register'} />
            <div className="auth-glass">
                <div className="auth-logo">
                    <img src={Logo} alt="ScoreBuzz" />
                </div>
                <div className="auth-header">
                    <h2>Create Account</h2>
                    <p>Join our community today</p>
                </div>

                <form onSubmit={handleRegister} className="auth-form">
                    <div className="form-group">
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder='Email address'
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder='Username'
                            required
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group password-group">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder='Password'
                            required
                            autoComplete="new-password"
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

                    {error && <div className="auth-error">{error}</div>}
                    {success && <div className="auth-success">{success}</div>}

                    <button type="submit" className="auth-btn" disabled={submitting}>
                        <PersonAdd className="btn-icon" />
                        {submitting ? 'CREATING...' : 'REGISTER'}
                    </button>

                    <div className="auth-footer">
                        <span>Already have an account?</span>
                        <NavLink to='/login' className="auth-link">Login &raquo;</NavLink>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Register;
