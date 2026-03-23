import React, { useState, useRef } from 'react';
import { useChat } from '../context/ChatContext';

const SettingsModal = ({ isOpen, onClose }) => {
    const {
        customRingtone,
        updateRingtone,
        isCompressingRingtone,
        theme,
        toggleTheme,
        readReceipts,
        toggleReadReceipts
    } = useChat();

    const [isPreviewing, setIsPreviewing] = useState(false);
    const previewAudioRef = useRef(null);

    const handlePreview = () => {
        if (isPreviewing) {
            previewAudioRef.current?.pause();
            previewAudioRef.current = null;
            setIsPreviewing(false);
            return;
        }

        if (customRingtone) {
            const audio = new Audio(customRingtone);
            audio.onended = () => setIsPreviewing(false);
            previewAudioRef.current = audio;
            audio.play().catch(err => {
                console.error("Preview failed:", err);
                setIsPreviewing(false);
            });
            setIsPreviewing(true);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header" style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>App Settings</h3>
                    <button className="close-btn" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                </div>

                <div className="modal-body" style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
                    <section className="settings-section">
                        <h4>Appearance</h4>
                        <div className="setting-item">
                            <div className="setting-info">
                                <span style={{ color: 'var(--text-primary)' }}>Dark Mode</span>
                                <p style={{ color: 'var(--text-secondary)' }}>Toggle between light and dark themes</p>
                            </div>
                            <button className={`toggle-btn ${theme === 'dark' ? 'active' : ''}`} onClick={toggleTheme}>
                                <div className="toggle-slider"></div>
                            </button>
                        </div>
                    </section>

                    <section className="settings-section">
                        <h4>Notifications & Sounds</h4>
                        <div className="setting-item-block" style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <div style={{ width: '32px', height: '32px', background: 'var(--md-primary-container)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--md-primary)' }}>
                                    <i className="fas fa-bell"></i>
                                </div>
                                <label style={{ margin: 0, color: 'var(--text-primary)' }}>Incoming Call Ringtone</label>
                            </div>
                            <p className="setting-description" style={{ color: 'var(--text-secondary)' }}>Choose a custom MP3 or WAV file for call notifications</p>

                            <div className="ringtone-controls">
                                <button
                                    className="md-button md-button-secondary"
                                    onClick={() => !isCompressingRingtone && document.getElementById('modal-ringtone-upload').click()}
                                    disabled={isCompressingRingtone}
                                    style={{ flex: 1, borderRadius: '12px', background: 'var(--md-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                                >
                                    {isCompressingRingtone ? (
                                        <><i className="fas fa-spinner fa-spin"></i> Compressing...</>
                                    ) : (
                                        <><i className="fas fa-file-audio"></i> {customRingtone ? (customRingtone.startsWith('data:') ? 'Local File Set' : 'Custom URL Set') : 'Upload Audio'}</>
                                    )}
                                </button>

                                {customRingtone && (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="md-button md-button-secondary" onClick={handlePreview} title="Preview" style={{ width: '40px', padding: 0 }}>
                                            <i className={`fas fa-${isPreviewing ? 'stop' : 'play'}`}></i>
                                        </button>
                                        <button className="md-button md-button-secondary danger" onClick={() => updateRingtone(null)} title="Reset" style={{ width: '40px', padding: 0 }}>
                                            <i className="fas fa-trash-alt"></i>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <input
                                id="modal-ringtone-upload"
                                type="file"
                                accept="audio/mp3,audio/wav"
                                onChange={(e) => e.target.files[0] && updateRingtone(e.target.files[0])}
                                style={{ display: 'none' }}
                            />

                            {customRingtone && !customRingtone.startsWith('data:') && (
                                <div className="url-input-group">
                                    <input
                                        type="text"
                                        className="md-input"
                                        placeholder="Or enter URL..."
                                        value={customRingtone || ''}
                                        onChange={(e) => updateRingtone(e.target.value)}
                                        style={{ fontSize: '0.8rem', marginTop: '12px' }}
                                    />
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="settings-section">
                        <h4>Account & Privacy</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div className="setting-item" style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)' }}>
                                <div className="setting-info">
                                    <span style={{ color: 'var(--text-primary)' }}>Read Receipts</span>
                                    <p style={{ color: 'var(--text-secondary)' }}>Allow others to see when you read messages</p>
                                </div>
                                <button className={`toggle-btn ${readReceipts ? 'active' : ''}`} onClick={toggleReadReceipts}>
                                    <div className="toggle-slider"></div>
                                </button>
                            </div>
                            <p className="placeholder-text" style={{ fontSize: '0.75rem', opacity: 0.5, textAlign: 'center' }}>More privacy settings coming soon.</p>
                        </div>
                    </section>
                </div>

                <div className="modal-footer" style={{ padding: '16px 24px 24px' }}>
                    <button className="md-button" onClick={onClose} style={{ width: '100%', borderRadius: '16px', padding: '14px' }}>Done</button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
