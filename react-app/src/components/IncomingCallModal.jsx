import React from 'react';
import { useChat } from '../context/ChatContext';

const IncomingCallModal = () => {
    const { callState, acceptCall, declineCall } = useChat();

    if (!callState.isIncoming) return null;

    return (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(15px)', zIndex: 3000, position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="surface incoming-call-card" style={{ width: '100%', maxWidth: '360px', padding: '48px 32px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="avatar ringing-icon" style={{
                    width: '96px',
                    height: '96px',
                    margin: '0 auto 32px',
                    background: 'var(--md-primary)',
                    color: 'var(--md-on-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.8rem',
                    borderRadius: '32px',
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.2)'
                }}>
                    <i className="fas fa-phone-alt"></i>
                </div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--md-on-surface)', marginBottom: '12px', letterSpacing: '-0.5px' }}>{callState.caller}</h2>
                <p style={{ color: 'var(--md-on-surface-variant)', fontSize: '1rem', marginBottom: '40px', opacity: 0.8 }}>Incoming {callState.type} call...</p>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <button className="md-button" style={{
                        flex: 1,
                        height: '56px',
                        background: '#ef4444',
                        boxShadow: '0 8px 20px rgba(239, 68, 68, 0.3)',
                        borderRadius: '16px',
                        fontSize: '1rem'
                    }} onClick={declineCall}>Decline</button>
                    <button className="md-button" style={{
                        flex: 1,
                        height: '56px',
                        background: 'var(--md-primary)',
                        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)',
                        borderRadius: '16px',
                        fontSize: '1rem',
                        color: 'var(--md-on-primary)'
                    }} onClick={acceptCall}>Accept</button>
                </div>
            </div>
        </div>
    );
};

export default IncomingCallModal;
