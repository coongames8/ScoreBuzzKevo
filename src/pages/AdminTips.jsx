// AdminTips.jsx
import React, { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../AuthContext';
import Loader from '../components/Loader/Loader';
import { addTip } from '../firebase';
import AppHelmet from '../components/AppHelmet';

export default function AdminTips() {
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
        
        addTip({ 
            ...formData,
            date,
            time: timeOnly,
            pick: formData.pick.toUpperCase(),
            status: formData.status.toLowerCase(),
            won: formData.won.toLowerCase()
        }, setError, setLoading);
    }

    useEffect(() => {
        error && setTimeout(() => setError(null), 2000);
    }, [error]);

    useEffect(() => {
        !currentUser && window.history.back();
    }, [currentUser]);

    return (
        <div className='admin-glass'>
            <AppHelmet title={"Add Tip"} location={'/admin/tips'} />
            <div className="admin-header">
                <h1>Add New Tip</h1>
                <p>Fill in the match details below</p>
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
                    
                    <button type="submit" className="submit-btn">
                        Add Tip
                    </button>
                </form>
            ) : (
                <Loader />
            )}
        </div>
    )
}
