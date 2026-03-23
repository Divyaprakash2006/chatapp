import React, { useState } from 'react';

const InviteUserModal = ({ isOpen, onClose, members, onInvite, currentUser }) => {
    const [selectedUsernames, setSelectedUsernames] = useState([]);

    if (!isOpen) return null;

    // Filter out the current user from the invite list
    const otherMembers = members.filter(m => m.username !== currentUser.username);

    const toggleUser = (username) => {
        setSelectedUsernames(prev => 
            prev.includes(username) 
                ? prev.filter(u => u !== username) 
                : [...prev, username]
        );
    };

    const handleStart = () => {
        // Always include the initiator in the invited list on the backend
        onInvite([...selectedUsernames, currentUser.username]);
        onClose();
    };

    return (
        <div className="invite-modal-overlay">
            <div className="invite-modal-content">
                <div className="invite-modal-header">
                    <h3>Invite to Meeting</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="invite-modal-body">
                    <p>Select members to join this private meeting:</p>
                    <div className="member-list">
                        {otherMembers.length > 0 ? (
                            otherMembers.map(member => (
                                <div 
                                    key={member.username} 
                                    className={`member-item ${selectedUsernames.includes(member.username) ? 'selected' : ''}`}
                                    onClick={() => toggleUser(member.username)}
                                >
                                    <img 
                                        src={member.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`} 
                                        alt={member.username} 
                                    />
                                    <span className="member-name">{member.username}</span>
                                    {selectedUsernames.includes(member.username) && <i className="fas fa-check-circle"></i>}
                                </div>
                            ))
                        ) : (
                            <div className="no-members">No other members in this group.</div>
                        )}
                    </div>
                </div>
                <div className="invite-modal-footer">
                    <button className="cancel-btn" onClick={onClose}>Cancel</button>
                    <button 
                        className="start-btn" 
                        onClick={handleStart}
                        disabled={selectedUsernames.length === 0}
                    >
                        Start Meeting ({selectedUsernames.length})
                    </button>
                </div>
            </div>

            <style>{`
                .invite-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.7);
                    backdrop-filter: blur(4px);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .invite-modal-content {
                    background: var(--bg-secondary);
                    width: 90%;
                    max-width: 400px;
                    border-radius: 24px;
                    overflow: hidden;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
                    border: 1px solid rgba(255,255,255,0.1);
                    animation: modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                @keyframes modalSlideIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .invite-modal-header {
                    padding: 20px 24px;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .invite-modal-header h3 { margin: 0; font-size: 1.2rem; }
                .close-btn { 
                    background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer; opacity: 0.6;
                }
                .invite-modal-body { padding: 20px 24px; }
                .invite-modal-body p { opacity: 0.7; margin-bottom: 16px; font-size: 0.9rem; }
                .member-list {
                    max-height: 300px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .member-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px 12px;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: 1px solid transparent;
                }
                .member-item:hover { background: rgba(255,255,255,0.05); }
                .member-item.selected { 
                    background: rgba(var(--md-primary-rgb, 99, 102, 241), 0.1);
                    border-color: var(--md-primary);
                }
                .member-item img { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
                .member-name { flex: 1; font-weight: 500; }
                .member-item i { color: var(--md-primary); }
                .invite-modal-footer {
                    padding: 16px 24px;
                    background: rgba(0,0,0,0.1);
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                }
                .cancel-btn {
                    background: none; border: none; color: white; padding: 10px 20px; cursor: pointer; opacity: 0.7;
                }
                .start-btn {
                    background: var(--md-primary);
                    color: white;
                    border: none;
                    padding: 10px 24px;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .start-btn:disabled { opacity: 0.5; cursor: not-allowed; }
            `}</style>
        </div>
    );
};

export default InviteUserModal;
