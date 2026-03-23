import React, { useState, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { compressImage } from '../utils/imageUtils';

const ProfileModal = ({ isOpen, onClose }) => {
    const { currentUser, updateProfile, logout } = useChat();
    const [bio, setBio] = useState(currentUser?.bio || '');
    const [profilePicture, setProfilePicture] = useState(currentUser?.profilePicture || '');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (currentUser) {
            setBio(currentUser.bio || '');
            setProfilePicture(currentUser.profilePicture || '');
        }
    }, [currentUser, isOpen]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        setError('');
        const res = await updateProfile({ bio, profilePicture });
        setIsSaving(false);
        if (res.success) {
            onClose();
        } else {
            setError(res.error || 'Failed to update profile');
        }
    };

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to logout?')) {
            logout();
            onClose();
        }
    };

    const dicebearStyles = ['avataaars', 'bottts', 'pixel-art', 'lorelei'];
    const generateAvatar = (style) => `https://api.dicebear.com/7.x/${style}/svg?seed=${currentUser?.username}_${Date.now()}`;

    return (
        <div className="modal-overlay" style={{
            position: 'fixed',
            inset: 0,
            zIndex: 11000,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.3s ease'
        }} onClick={onClose}>
            <div className="surface profile-card" style={{
                width: '100%',
                maxWidth: '450px',
                padding: '40px 32px',
                borderRadius: '32px',
                position: 'relative',
                animation: 'modalSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }} onClick={e => e.stopPropagation()}>

                <button onClick={onClose} style={{
                    position: 'absolute',
                    top: '24px',
                    right: '24px',
                    background: 'var(--md-surface-variant)',
                    border: 'none',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary)'
                }}>
                    <i className="fas fa-times"></i>
                </button>

                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div
                        style={{
                            position: 'relative',
                            width: '140px',
                            height: '140px',
                            margin: '0 auto 16px',
                            cursor: 'pointer',
                            transition: 'transform 0.3s ease'
                        }}
                        onClick={() => document.getElementById('avatar-upload').click()}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <img
                            src={profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username}`}
                            alt="avatar"
                            style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: '48px',
                                objectFit: 'cover',
                                border: '4px solid var(--md-primary-container)',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
                            }}
                        />
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.3)',
                            borderRadius: '48px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0,
                            transition: 'opacity 0.3s ease',
                        }}
                            onMouseEnter={e => e.currentTarget.style.opacity = 1}
                            onMouseLeave={e => e.currentTarget.style.opacity = 0}
                        >
                            <i className="fas fa-camera" style={{ color: 'white', fontSize: '1.5rem' }}></i>
                        </div>
                        <div style={{
                            position: 'absolute',
                            bottom: '4px',
                            right: '4px',
                            background: 'var(--md-primary)',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            border: '4px solid var(--md-surface)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}></div>
                    </div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--md-primary)', letterSpacing: '-0.5px', marginBottom: '4px' }}>{currentUser?.username}</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', opacity: 0.8 }}>{currentUser?.email}</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                            const file = e.target.files[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onloadend = async () => {
                                    const compressed = await compressImage(reader.result);
                                    setProfilePicture(compressed);
                                };
                                reader.readAsDataURL(file);
                            }
                        }}
                        style={{ display: 'none' }}
                    />

                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--md-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bio</label>
                        <textarea
                            className="md-input"
                            placeholder="Tell the community about yourself..."
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            style={{ height: '100px', resize: 'none', padding: '16px', borderRadius: '16px' }}
                        />
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--md-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Generate Style</label>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {dicebearStyles.map(style => (
                                <button
                                    key={style}
                                    type="button"
                                    onClick={() => setProfilePicture(generateAvatar(style))}
                                    style={{
                                        flex: 1,
                                        padding: '10px 4px',
                                        fontSize: '0.7rem',
                                        borderRadius: '12px',
                                        border: '1px solid var(--md-outline)',
                                        background: 'var(--md-surface-variant)',
                                        cursor: 'pointer',
                                        color: 'var(--text-primary)',
                                        fontWeight: 600,
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--md-primary)'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--md-outline)'}
                                >
                                    {style}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && <div style={{ color: 'var(--md-error)', fontSize: '0.8rem', fontWeight: 500, textAlign: 'center' }}>{error}</div>}

                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <button
                            className="md-button"
                            style={{ flex: 1, padding: '18px', borderRadius: '20px', fontSize: '1rem' }}
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? 'Updating...' : 'Update Profile'}
                        </button>
                        <button
                            className="md-button btn-dark-capsule"
                            style={{ width: '64px', padding: 0, borderRadius: '20px', background: 'var(--md-surface-variant)' }}
                            onClick={handleLogout}
                            title="Logout"
                        >
                            <i className="fas fa-sign-out-alt"></i>
                        </button>
                    </div>
                </div>

                <style>
                    {`
                    @keyframes modalSlideUp {
                        from { transform: translateY(30px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    .profile-card {
                        box-shadow: 0 24px 80px rgba(0,0,0,0.15) !important;
                        border: 1px solid rgba(255,255,255,0.1) !important;
                    }
                    `}
                </style>
            </div>
        </div>
    );
};

export default ProfileModal;
