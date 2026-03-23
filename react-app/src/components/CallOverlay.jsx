import React, { useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';

const CallOverlay = () => {
    const { callState, hangUp, toggleMute, toggleVideo } = useChat();
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    useEffect(() => {
        if (localVideoRef.current && callState.localStream) {
            localVideoRef.current.srcObject = callState.localStream;
        }
    }, [callState.localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && callState.remoteStream) {
            remoteVideoRef.current.srcObject = callState.remoteStream;
        }
    }, [callState.remoteStream]);

    if (!callState.isActive) return null;

    return (
        <div className="video-overlay" style={{ inset: '16px', borderRadius: 'var(--radius-xl)', background: '#000', overflow: 'hidden', position: 'fixed', zIndex: 2000 }}>
            <div className="video-grid" style={{ height: '100%', position: 'relative' }}>
                <video ref={remoteVideoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} autoPlay playsInline></video>
                <div className="local-box" style={{ position: 'absolute', top: '24px', right: '24px', width: '160px', height: '120px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '2px solid var(--md-primary)', boxShadow: 'var(--shadow-level-3)' }}>
                    <video ref={localVideoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} autoPlay muted playsInline></video>
                </div>

                <div style={{ position: 'absolute', top: '24px', left: '24px', display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(0,0,0,0.6)', padding: '12px 20px', borderRadius: 'var(--radius-md)', backdropFilter: 'blur(10px)' }}>
                    <div className="avatar" style={{ width: '36px', height: '36px', background: 'var(--md-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: 'white' }}>
                        {callState.caller?.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600, color: 'white' }}>{callState.caller || 'Establishing...'}</span>
                </div>
            </div>

            <div className="call-ui-controls" style={{
                position: 'absolute',
                bottom: '40px',
                left: '0',
                right: '0',
                display: 'flex',
                justifyContent: 'center',
                gap: '24px',
                padding: '0 20px',
                zIndex: 10
            }}>
                <button
                    className="md-button md-button-secondary"
                    onClick={toggleMute}
                    style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '20px',
                        padding: 0,
                        background: callState.isMuted ? '#ef4444' : 'rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(10px)',
                        color: 'white',
                        transition: 'all 0.3s ease'
                    }}
                >
                    <i className={`fas ${callState.isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
                </button>
                <button className="md-button" onClick={hangUp} style={{ width: '64px', height: '64px', borderRadius: '20px', padding: 0, background: '#ef4444', boxShadow: '0 8px 24px rgba(239, 68, 68, 0.5)' }}>
                    <i className="fas fa-phone-slash" style={{ fontSize: '1.2rem' }}></i>
                </button>
                <button
                    className="md-button md-button-secondary"
                    onClick={toggleVideo}
                    style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '20px',
                        padding: 0,
                        background: callState.isVideoOff ? '#ef4444' : 'rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(10px)',
                        color: 'white',
                        transition: 'all 0.3s ease'
                    }}
                >
                    <i className={`fas ${callState.isVideoOff ? 'fa-video-slash' : 'fa-video'}`}></i>
                </button>
            </div>
        </div>
    );
};

export default CallOverlay;
