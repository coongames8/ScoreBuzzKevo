// EditTip.jsx
import React, { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../AuthContext';
import Loader from '../components/Loader/Loader';
import { updateTip } from '../firebase';
import AppHelmet from '../components/AppHelmet';
import { useLocation, useNavigate } from 'react-router-dom';

export default function EditTip() {
    const [formData, setFormData] = useState({
        home: '',
        away: '',
        odd: '',
        pick: '',
        status: '',
        time: '',
        won: '',
        premium: false,
        results: ''
    });
    const { currentUser } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        setData(location.state);
    }, [location]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const d = new Date(formData.time);
        const date = new Intl.DateTimeFormat('en-US').format(d);
        const timeOnly = d.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
        
        updateTip(data.id, { 
            ...formData,
            date,
            time: timeOnly,
            pick: formData.pick.toUpperCase(),
            status: formData.status.toLowerCase(),
            won: formData.won.toLowerCase()
        }, setError, setLoading, setData);
    }

    useEffect(() => {
        error && setTimeout(() => setError(null), 2000);
    }, [error]);

    useEffect(() => {
        !currentUser && navigate('/');
    }, [currentUser, navigate]);

    useEffect(() => {
        if (data) {
            const datetimeLocal = formatDateTimeForInput(data.date, data.time);
            setFormData({
                home: data.home,
                away: data.away,
                odd: data.odd,
                pick: data.pick,
                status: data.status,
                results: data.results,
                won: data.won,
                premium: data.premium,
                time: datetimeLocal
            });
        }
    }, [data]);

    const formatDateTimeForInput = (date, time) => {
        const [month, day, year] = date.split('/').map(Number);
        const formattedDate = new Date(year, month - 1, day);
        const yearStr = formattedDate.getFullYear();
        const monthStr = String(formattedDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(formattedDate.getDate()).padStart(2, '0');
        return `${yearStr}-${monthStr}-${dayStr}T${time}`;
    };

    return (
        <div className='admin-glass'>
            <AppHelmet title={"Edit Tip"} location={'/admin/tips'} />
            <div className="admin-header">
                <h1>Update Tip</h1>
                <p>Edit the match details below</p>
            </div>
            
            {!loading ? (
                <form onSubmit={handleSubmit} className="admin-form">
                    {error && <div className="form-error">{error}</div>}
                    
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Home Team</label>
                            <input 
                                type="text" 
                                name="home"
                                value={formData.home}
                                onChange={handleChange}
                                required 
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Away Team</label>
                            <input 
                                type="text" 
                                name="away"
                                value={formData.away}
                                onChange={handleChange}
                                required 
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Odds</label>
                            <input 
                                type="text" 
                                name="odd"
                                value={formData.odd}
                                onChange={handleChange}
                                required 
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Pick</label>
                            <input 
                                type="text" 
                                name="pick"
                                value={formData.pick}
                                onChange={handleChange}
                                required 
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Status</label>
                            <select 
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select status</option>
                                <option value="finished">Finished</option>
                                <option value="pending">Pending</option>
                                <option value="live">Live</option>
                            </select>
                        </div>
                        
                        <div className="form-group">
                            <label>Date/Time</label>
                            <input 
                                type="datetime-local" 
                                name="time"
                                value={formData.time}
                                onChange={handleChange}
                                required 
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Results</label>
                            <input 
                                type="text" 
                                name="results"
                                value={formData.results}
                                onChange={handleChange}
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Outcome</label>
                            <select 
                                name="won"
                                value={formData.won}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select outcome</option>
                                <option value="won">Won</option>
                                <option value="pending">Pending</option>
                                <option value="lost">Lost</option>
                            </select>
                        </div>
                        
                        <div className="form-group checkbox-group">
                            <label>
                                <input 
                                    type="checkbox" 
                                    name="premium"
                                    checked={formData.premium}
                                    onChange={handleChange}
                                />
                                Premium Tip
                            </label>
                        </div>
                    </div>
                    
                    <div className="form-actions">
                        <button type="submit" className="submit-btn">
                            Update Tip
                        </button>
                        <button type="button" className="cancel-btn" onClick={() => navigate(-1)}>
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
