import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../api';

export default function Login({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password.trim()) {
            setError('Please fill in all fields');
            return;
        }

        if (isRegistering) {
            try {
                await axios.post(`${API_BASE}/api/register`, { username, password });
                localStorage.setItem('currentUser', username);
                onLogin(username);
                location.reload();
            } catch (err) {
                const msg = err.response?.data?.error || 'Registration failed';
                setError(msg);
            }
        } else {
            try {
                await axios.post(`${API_BASE}/api/login`, { username, password });
                localStorage.setItem('currentUser', username);
                onLogin(username);
                location.reload();
            } catch (err) {
                const msg = err.response?.data?.error || 'Login failed';
                setError(msg);
            }
        }
    };

    return (
        <div className="login-overlay">
            <div className="login-card">
                <img 
                    className="login-logo" 
                    src="./assets/Anidex.png" 
                    alt="AniDex Logo" 
                    height="70px"
                />
                <h2 className="login-title">
                    {isRegistering ? 'Create Account' : 'Welcome Back'}
                </h2>
                
                <form onSubmit={handleSubmit} className="login-form">
                    <div className="login-input-group">
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Username"
                            className="login-input"
                            autoComplete="username"
                        />
                    </div>
                    
                    <div className="login-input-group">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className="login-input"
                            autoComplete={isRegistering ? "new-password" : "current-password"}
                        />
                    </div>

                    {error && <p className="login-error">{error}</p>}

                    <button type="submit" className="login-btn">
                        {isRegistering ? 'Sign Up' : 'Log In'}
                    </button>
                </form>

                <p className="login-switch">
                    {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button 
                        className="login-switch-btn"
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                            setError('');
                        }}
                    >
                        {isRegistering ? 'Log In' : 'Sign Up'}
                    </button>
                </p>
            </div>
        </div>
    );
}