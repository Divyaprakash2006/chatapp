import React from 'react';

const GroupMembersModal = ({ isOpen, onClose, room, friends }) => {
    if (!isOpen || !room) return null;

    const members = room.members || [];

    return (
        <div className="members-modal-overlay" onClick={onClose}>
            <div className="members-modal-content" onClick={e => e.stopPropagation()}>
                <div className="members-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="avatar" style={{ width: '40px', height: '40px', background: 'var(--md-primary-container)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fas fa-users" style={{ color: 'var(--md-primary)' }}></i>
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Group Members</h3>
                            <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.6 }}>{members.length} participants</p>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="members-modal-body">
                    <div className="participants-list">
                        {members.map((member, idx) => {
                            // Find friend data to show online status and actual profile pic
                            const friendData = friends.find(f => f.username === member.username);
                            const isOnline = friendData?.online;
                            
                            return (
                                <div key={idx} className="participant-item">
                                    <div style={{ position: 'relative' }}>
                                        <div className="avatar" style={{ width: '44px', height: '44px', borderRadius: '12px', overflow: 'hidden' }}>
                                            <img 
                                                src={friendData?.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`} 
                                                alt={member.username} 
                                            />
                                        </div>
                                        {isOnline && <div className="online-indicator-dot" style={{ border: '2px solid var(--surface-bg)', bottom: '0', right: '0' }}></div>}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600 }}>{member.username}</div>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                                            {isOnline ? 'Active Now' : 'Offline'}
                                        </div>
                                    </div>
                                    {room.owner?.username === member.username && (
                                        <span style={{ fontSize: '0.7rem', padding: '4px 8px', background: 'var(--md-primary-container)', color: 'var(--md-primary)', borderRadius: '8px', fontWeight: 700 }}>OWNER</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <style>{`
                    .members-modal-overlay {
                        position: fixed;
                        inset: 0;
                        background: rgba(0,0,0,0.8);
                        backdrop-filter: blur(8px);
                        z-index: 10000;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        animation: fadeIn 0.3s ease;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    .members-modal-content {
                        background: var(--surface-bg);
                        width: 100%;
                        max-width: 400px;
                        border-radius: 28px;
                        overflow: hidden;
                        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                        border: 1px solid rgba(255,255,255,0.1);
                        animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    }
                    @keyframes slideUp {
                        from { transform: translateY(30px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                    .members-modal-header {
                        padding: 24px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border-bottom: 1px solid rgba(255,255,255,0.05);
                    }
                    .members-modal-header .close-btn {
                        background: none;
                        border: none;
                        color: var(--text-primary);
                        font-size: 1.8rem;
                        cursor: pointer;
                        opacity: 0.5;
                        transition: opacity 0.2s;
                    }
                    .members-modal-header .close-btn:hover { opacity: 1; }
                    .members-modal-body {
                        padding: 16px 24px 32px;
                        max-height: 450px;
                        overflow-y: auto;
                    }
                    .participants-list {
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                    }
                    .participant-item {
                        display: flex;
                        align-items: center;
                        gap: 16px;
                        padding: 12px;
                        border-radius: 16px;
                        transition: background 0.2s;
                    }
                    .participant-item:hover {
                        background: rgba(255,255,255,0.03);
                    }
                    .online-indicator-dot {
                        position: absolute;
                        width: 12px;
                        height: 12px;
                        background: #10b981;
                        border-radius: 50%;
                    }
                `}</style>
            </div>
        </div>
    );
};

export default GroupMembersModal;
