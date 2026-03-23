import React, { useState } from 'react';
import { useChat, BACKEND_URL } from '../context/ChatContext';

const CreateGroupModal = ({ isOpen, onClose }) => {
    const { currentUser, friends, selectChat, fetchRooms } = useChat();
    const [groupName, setGroupName] = useState('');
    const [selectedFriends, setSelectedFriends] = useState([]);

    const toggleFriend = (username) => {
        setSelectedFriends(prev =>
            prev.includes(username)
                ? prev.filter(u => u !== username)
                : [...prev, username]
        );
    };

    const handleCreate = async () => {
        if (!groupName.trim()) return alert("Please enter a group name.");
        if (selectedFriends.length === 0) return alert("Please select at least one friend.");

        const id = Math.random().toString(36).substring(2, 8).toUpperCase();

        // Prepare members - backend DBRef needs full objects or specific handling.
        // For simplicity, we'll send a list of user objects with just the username.
        const members = selectedFriends.map(f => ({ username: f }));

        const newGroup = {
            id,
            name: groupName,
            type: 'GROUP',
            members: members
        };

        try {
            const response = await fetch(`${BACKEND_URL}/api/rooms/create?username=${currentUser.username}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newGroup)
            });

            if (response.ok) {
                const createdGroup = await response.json();
                selectChat(createdGroup.id, 'ROOM');
                fetchRooms(currentUser.username);
                onClose();
                setGroupName('');
                setSelectedFriends([]);
            } else {
                const error = await response.text();
                alert("Create group failed: " + error);
            }
        } catch (err) {
            console.error("Create group error:", err);
        }
    };


    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', zIndex: 1000, position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="surface" style={{ width: '100%', maxWidth: '440px', padding: '40px', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '8px' }}>New Group</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '32px' }}>Pick participants and choose a name.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <input
                        type="text"
                        className="md-input"
                        placeholder="Group Name"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        style={{ height: '52px', background: 'var(--input-bg)', border: 'none' }}
                    />

                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--md-primary)', textTransform: 'uppercase', marginBottom: '12px' }}>Select Contacts</label>
                        <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '8px' }}>
                            {friends.map(friend => (
                                <div
                                    key={friend.username}
                                    onClick={() => toggleFriend(friend.username)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '10px 16px',
                                        background: selectedFriends.includes(friend.username) ? 'var(--md-primary-container)' : 'var(--input-bg)',
                                        borderRadius: '16px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', overflow: 'hidden' }}>
                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.username}`} alt="avatar" style={{ width: '100%' }} />
                                    </div>
                                    <span style={{ flex: 1, fontWeight: 600 }}>{friend.username}</span>
                                    {selectedFriends.includes(friend.username) ? (
                                        <i className="fas fa-check-circle" style={{ color: 'var(--md-primary)' }}></i>
                                    ) : (
                                        <i className="far fa-circle" style={{ opacity: 0.3 }}></i>
                                    )}
                                </div>
                            ))}
                            {friends.length === 0 && <p style={{ opacity: 0.5, textAlign: 'center', padding: '20px' }}>No contacts found.</p>}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <button className="md-button btn-capsule btn-dark-capsule" style={{ flex: 1 }} onClick={onClose}>Discard</button>
                        <button className="md-button btn-capsule btn-primary-capsule" style={{ flex: 2 }} onClick={handleCreate}>Create</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateGroupModal;
