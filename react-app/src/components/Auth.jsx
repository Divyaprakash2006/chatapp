import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const { login, signup } = useChat();

    const handleChange = (e) => {
        const field = e.target.id.replace('login-', '').replace('signup-', '');
        setFormData({ ...formData, [field]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (isLogin) {
            const res = await login(formData.username, formData.password);
            if (!res.success) setError(res.error);
        } else {
            const res = await signup(formData.username, formData.email, formData.password);
            if (res.success) {
                alert("Account created successfully! Welcome.");
                setIsLogin(true);
            } else {
                setError(res.error);
            }
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '16px' }}>
            <div className="surface auth-card" style={{ width: '100%', maxWidth: '400px', padding: '40px 24px', borderRadius: '24px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ width: '80px', height: '80px', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src="/logo.svg" alt="ChatConnect Logo" style={{ width: '100%', height: '100%' }} />
                    </div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--md-primary)', letterSpacing: '-0.5px', marginBottom: '4px' }}>ChatConnect</h2>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--md-on-surface)', letterSpacing: '-0.5px' }}>{isLogin ? 'Sign In' : 'Join Network'}</h2>
                    <p style={{ color: 'var(--md-on-surface-variant)', fontSize: '0.85rem', marginTop: '6px', opacity: 0.8 }}>
                        {isLogin ? 'Access your secure channels' : 'Initialize a new identity'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <input
                            type="text"
                            id={isLogin ? "login-username" : "signup-username"}
                            className="md-input"
                            placeholder="Username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {!isLogin && (
                        <div>
                            <input
                                type="email"
                                id="signup-email"
                                className="md-input"
                                placeholder="Email Address"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    )}

                    <div>
                        <input
                            type="password"
                            id={isLogin ? "login-password" : "signup-password"}
                            className="md-input"
                            placeholder="Password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {error && <div style={{ color: 'var(--md-error)', fontSize: '0.8rem', fontWeight: 500 }}>{error}</div>}

                    <button type="submit" className="md-button" style={{ padding: '16px', fontSize: '1rem', width: '100%', marginTop: '8px' }}>
                        {isLogin ? 'Authenticate' : 'Register Now'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '32px', color: 'var(--md-on-surface-variant)', fontSize: '0.9rem' }}>
                    {isLogin ? "Need an account? " : "Already have an account? "}
                    <button
                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        style={{ background: 'none', border: 'none', color: 'var(--md-primary)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                    >
                        {isLogin ? 'Initialize Registration' : 'Return to Login'}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default Auth;
