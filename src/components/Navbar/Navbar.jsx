import Logo from '../../assets/logo.png';
import './Navbar.scss';
import { NavLink } from "react-router-dom";
import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { Menu, Close, Logout, Login } from '@mui/icons-material';

const Navbar = () => {
    const { currentUser } = useContext(AuthContext);
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        document.body.style.overflow = menuOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [menuOpen]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setMenuOpen(false);
        } catch (err) {
            console.error("Logout failed:", err);
        }
    };

    const closeMenu = () => setMenuOpen(false);

    return (
        <header className={`glass-navbar ${scrolled ? 'scrolled' : ''}`}>
            <div className="navbar-container">
                <NavLink to="/" className='logo' onClick={closeMenu} aria-label="ScoreBuzz home">
                    <img src={Logo} alt='ScoreBuzz logo' />
                </NavLink>

                <button
                    className={`menu-toggle ${menuOpen ? 'open' : ''}`}
                    onClick={() => setMenuOpen(o => !o)}
                    aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={menuOpen}
                >
                    {menuOpen ? <Close /> : <Menu />}
                </button>

                <nav className={menuOpen ? 'open' : ''}>
                    <NavLink to="/" onClick={closeMenu} title='predictions'>Home</NavLink>
                    <NavLink to="/pay" onClick={closeMenu} title='pricing'>Pricing</NavLink>
                    <div className="btn-wrapper">
                        {currentUser ?
                            <button className="glass-btn logout" onClick={handleLogout} title='signout'>
                                <Logout className="btn-icon" />
                                <span>Logout</span>
                            </button> :
                            <NavLink className="glass-btn" to="/login" onClick={closeMenu} title='signin'>
                                <Login className="btn-icon" />
                                <span>Log In</span>
                            </NavLink>
                        }
                    </div>
                </nav>

                {menuOpen && <div className="nav-overlay" onClick={closeMenu} aria-hidden="true" />}
            </div>
        </header>
    );
}

export default Navbar;
