import React, { useState, useRef, useEffect } from 'react';
import { useChat, BACKEND_URL } from '../context/ChatContext';
import CreateGroupModal from './CreateGroupModal';
import SettingsModal from './SettingsModal';
import InviteUserModal from './InviteUserModal';

const Sidebar = () => {
    const {
        currentUser,
        friends,
        joinedRooms,
        currentChat,
        selectChat,
        logout,
        fetchFriends,
        isSidebarOpen,
        theme,
        toggleTheme,
        unreadCounts,
        toggleAi,
        customRingtone,
        updateRingtone,
        isCompressingRingtone,
        activeTab,
        setActiveTab,
        isSettingsOpen,
        setIsSettingsOpen,
        callHistory,
        clearCallHistory,
        recentChats,
        startCall,
        startGroupMeeting,
        joinGroupMeeting,
        leaveMeeting,
        endMeetingForAll,
        deleteRoom,
        forceEndMeeting,
        callState
    } = useChat();

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [suggestedUsers, setSuggestedUsers] = useState([]);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [showScrollUp, setShowScrollUp] = useState(false);
    const [showScrollDown, setShowScrollDown] = useState(false);
    const contentRef = useRef(null);
    const previewAudioRef = useRef(null);

    const handleScroll = () => {
        if (!contentRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
        setShowScrollUp(scrollTop > 10);
        setShowScrollDown(scrollTop + clientHeight < scrollHeight - 10);
    };

    const scroll = (direction) => {
        if (!contentRef.current) return;
        contentRef.current.scrollBy({ top: direction === 'up' ? -200 : 200, behavior: 'smooth' });
    };

    useEffect(() => {
        const el = contentRef.current;
        if (el) {
            el.addEventListener('scroll', handleScroll);
            
            const resizeObserver = new ResizeObserver(() => handleScroll());
            resizeObserver.observe(el);
            if (el.firstElementChild) {
                resizeObserver.observe(el.firstElementChild);
            }
            
            setTimeout(handleScroll, 100);
            setTimeout(handleScroll, 500);
            
            return () => {
                el.removeEventListener('scroll', handleScroll);
                resizeObserver.disconnect();
            };
        }
    }, [activeTab, recentChats, friends, joinedRooms]);

    const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (!query) {
            setSearchResults([]);
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/search?query=${query}`);
            if (response.ok) {
                const users = await response.json();
                setSearchResults(users.filter(u => u.username !== currentUser.username));
            }
        } catch (err) {
            console.error("Search error:", err);
        }
    };

    const handleAddFriend = async (friendUsername) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/friends/add/${friendUsername}?username=${currentUser.username}`, {
                method: 'POST'
            });
            if (response.ok) {
                fetchFriends(currentUser.username);
                setSearchQuery('');
                setSearchResults([]);
            } else {
                const error = await response.text();
                alert(error);
            }
        } catch (err) {
            console.error("Add friend error:", err);
        }
    };


    useEffect(() => {
        if (activeTab === 'EXPLORE') {
            fetchDiscoveryData();
        }
    }, [activeTab, friends]);

    const fetchDiscoveryData = async () => {
        try {
            // Fetch real suggested users using a common query
            const userRes = await fetch(`${BACKEND_URL}/api/auth/search?query=a`);
            if (userRes.ok) {
                const users = await userRes.json();
                const filtered = users.filter(u =>
                    u.username !== currentUser.username &&
                    !friends.some(f => f.username === u.username)
                ).slice(0, 5);
                setSuggestedUsers(filtered);
            }
        } catch (err) {
            console.error("Discovery fetch error:", err);
        }
    };

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

    return (
        <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
                <div className="sidebar-logo-container">
                    <img src="/logo.svg" alt="ChatConnect" className="sidebar-logo" />
                    <h2 className="sidebar-title">ChatConnect</h2>
                </div>
            </div>
            <div style={{ padding: '0 24px 16px', flexShrink: 0 }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, opacity: 0.8 }}>
                    {activeTab === 'CHATS' ? 'Messages' : activeTab === 'CALLS' ? 'Recent Calls' : activeTab === 'MEETINGS' ? 'Meetings' : activeTab === 'GROUPS' ? 'Groups' : 'Contacts'}
                </h3>
            </div>

            <div 
                ref={contentRef}
                className="sidebar-content sidebar-scrollable-area" 
            >
                <div style={{ position: 'relative', marginBottom: '24px' }}>
                    <i className="fas fa-search" style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '1rem', opacity: 0.8 }}></i>
                    <input
                        type="text"
                        className="md-input search-input-redefined"
                        placeholder="Search messages or users"
                        value={searchQuery}
                        onChange={handleSearch}
                    />
                </div>

                {searchResults.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                        <p className="section-label" style={{ paddingLeft: '8px', marginBottom: '12px', color: 'var(--md-primary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Global Results</p>
                        {searchResults.map(user => (
                            <div key={user.username} className="list-tile">
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600 }}>{user.username}</div>
                                    <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>UID: {user.callingId}</div>
                                </div>
                                {!friends.some(f => f.username === user.username) && (
                                    <button onClick={() => handleAddFriend(user.username)} className="md-button" style={{ padding: '6px 12px', fontSize: '0.7rem' }}>Connect</button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'GROUPS' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <p className="section-label" style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Your Groups</p>
                            <button 
                                onClick={() => fetchRooms()} 
                                style={{ background: 'none', border: 'none', color: 'var(--md-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700 }}
                                title="Refresh Groups"
                            >
                                <i className="fas fa-sync-alt" style={{ fontSize: '0.7rem' }}></i> Refresh
                            </button>
                        </div>

                        <div className="list-tile" onClick={() => setIsGroupModalOpen(true)} style={{ cursor: 'pointer', marginBottom: '24px', background: 'var(--md-primary-container)', borderRadius: '16px', padding: '12px' }}>
                            <div style={{ width: '40px', height: '40px', background: 'var(--md-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--md-on-primary)' }}>
                                <i className="fas fa-users" style={{ fontSize: '1rem' }}></i>
                            </div>
                            <div style={{ marginLeft: '12px', fontWeight: 600, color: 'var(--md-primary)' }}>Create New Group</div>
                            <i className="fas fa-chevron-right" style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '0.8rem' }}></i>
                        </div>

                        {joinedRooms.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 10px', opacity: 0.5 }}>
                                <i className="fas fa-layer-group fa-2x" style={{ marginBottom: '16px' }}></i>
                                <p style={{ fontSize: '0.85rem' }}>You haven't joined any groups yet</p>
                            </div>
                        ) : (
                            joinedRooms.map(room => (
                                <div key={room.id} className={`list-tile premium-card-hover ${currentChat.target === room.id ? 'active' : ''}`}
                                    onClick={() => selectChat(room.id, 'ROOM')}
                                    style={{
                                        padding: '12px 16px',
                                        height: '80px',
                                        marginBottom: '10px',
                                        borderRadius: '18px',
                                        background: currentChat.target === room.id ? 'var(--md-primary-container)' : 'var(--input-bg)',
                                        border: currentChat.target === room.id ? '1.5px solid var(--md-primary)' : '1.5px solid transparent',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        background: room.type === 'GROUP' ? 'linear-gradient(135deg, #444444 0%, #000000 100%)' : (room.icon ? 'linear-gradient(135deg, #666666 0%, #333333 100%)' : 'var(--md-secondary-container)'),
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                    }}>
                                        <i className={`fas ${room.type === 'GROUP' ? 'fa-users' : (room.icon || 'fa-layer-group')}`} style={{ fontSize: '1.2rem', color: (room.icon || room.type === 'GROUP') ? 'white' : 'var(--md-primary)' }}></i>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0, marginLeft: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{room.name}</div>
                                            <div style={{ fontSize: '0.65rem', opacity: 0.5, fontWeight: 700 }}>
                                                {room.members?.length || 0} Members
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                            <div style={{ fontSize: '0.75rem', opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                                                {room.category || 'Group Space'}
                                            </div>
                                            {unreadCounts[room.id] > 0 && (
                                                <div className="unread-badge" style={{ transform: 'scale(0.8)' }}>{unreadCounts[room.id]}</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                )}

                {activeTab === 'CHATS' && (
                    <>
                        <p className="section-label" style={{ marginBottom: '16px', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 700 }}>Recent</p>

                        {recentChats.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 10px', opacity: 0.5 }}>
                                <p style={{ fontSize: '0.85rem' }}>No recent conversations</p>
                            </div>
                        ) : (
                            recentChats.map(recent => {
                                if (recent.type === 'ROOM') {
                                    const room = joinedRooms.find(r => r.id === recent.target);
                                    if (!room) return null;
                                    return (
                                        <div key={room.id} className={`list-tile premium-card-hover ${currentChat.target === room.id ? 'active' : ''}`}
                                            onClick={() => selectChat(room.id, 'ROOM')}
                                            style={{
                                                padding: '12px 16px',
                                                height: '80px',
                                                marginBottom: '10px',
                                                borderRadius: '18px',
                                                background: currentChat.target === room.id ? 'var(--md-primary-container)' : 'var(--input-bg)',
                                                border: currentChat.target === room.id ? '1.5px solid var(--md-primary)' : '1.5px solid transparent',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                            }}>
                                            <div style={{
                                                width: '48px',
                                                height: '48px',
                                                background: room.type === 'GROUP' ? 'linear-gradient(135deg, #444444 0%, #000000 100%)' : (room.icon ? 'linear-gradient(135deg, #666666 0%, #333333 100%)' : 'var(--md-secondary-container)'),
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                position: 'relative',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                            }}>
                                                <i className={`fas ${room.type === 'GROUP' ? 'fa-users' : (room.icon || 'fa-layer-group')}`} style={{ fontSize: '1.2rem', color: (room.icon || room.type === 'GROUP') ? 'white' : 'var(--md-primary)' }}></i>
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0, marginLeft: '12px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{room.name}</div>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                                    <div style={{ fontSize: '0.75rem', opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                                                        {room.category || 'Group'}
                                                    </div>
                                                    {unreadCounts[room.id] > 0 && (
                                                        <div className="unread-badge" style={{ transform: 'scale(0.8)' }}>{unreadCounts[room.id]}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                } else {
                                    const friend = friends.find(f => f.username === recent.target);
                                    if (!friend) return null;
                                    return (
                                        <div key={friend.username}
                                            className={`list-tile premium-card-hover ${currentChat.target === friend.username ? 'active' : ''}`}
                                            onClick={() => selectChat(friend.username, 'PRIVATE')}
                                            style={{
                                                padding: '12px 16px',
                                                height: '80px',
                                                marginBottom: '10px',
                                                borderRadius: '18px',
                                                background: currentChat.target === friend.username ? 'var(--md-primary-container)' : 'var(--input-bg)',
                                                border: currentChat.target === friend.username ? '1.5px solid var(--md-primary)' : '1.5px solid transparent',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                            }}>
                                            <div style={{ position: 'relative', width: '48px', height: '48px' }}>
                                                <img
                                                    src={friend.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.username}`}
                                                    alt="avatar"
                                                    style={{ width: '48px', height: '48px', borderRadius: '16px', objectFit: 'cover' }}
                                                />
                                                {friend.online && <span className="online-indicator-dot" style={{ border: '3px solid var(--surface-bg)' }}></span>}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0, marginLeft: '12px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{friend.username}</div>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                                    <div style={{ fontSize: '0.75rem', opacity: 0.6, fontWeight: 500 }}>
                                                        {friend.online ? 'Online' : 'Offline'}
                                                    </div>
                                                    {unreadCounts[friend.username] > 0 && (
                                                        <div className="unread-badge" style={{ transform: 'scale(0.8)' }}>{unreadCounts[friend.username]}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                            })
                        )}

                        <p className="section-label" style={{ paddingLeft: '8px', marginTop: '32px', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>AI Assistant</p>
                        <div className={`list-tile ${currentChat.target === 'Gemini AI' ? 'active' : ''}`} onClick={() => selectChat('Gemini AI', 'PRIVATE')} style={{ borderRadius: '16px', padding: '12px' }}>
                            <div className="avatar" style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #000000 0%, #666666 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                <i className="fas fa-comment-dots"></i>
                            </div>
                            <div style={{ flex: 1, marginLeft: '12px' }}>
                                <div style={{ fontWeight: 600 }}>Gemini AI</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--md-primary)', fontWeight: 'bold' }}>Always Online</div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'MEETINGS' && (
                    <div style={{ paddingBottom: '24px' }}>
                        <p className="section-label" style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 700, marginBottom: '16px' }}>Group Meetings</p>
                        
                        {joinedRooms.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.5 }}>
                                <i className="fas fa-users-slash fa-2x" style={{ marginBottom: '16px' }}></i>
                                <p style={{ fontSize: '0.9rem' }}>No rooms joined yet</p>
                            </div>
                        ) : (
                            joinedRooms.map(room => {
                                const isInvited = room.invitedUsernames?.includes(currentUser.username);
                                return (
                                    <div key={room.id} className="list-tile premium-card-hover" style={{ 
                                        padding: '16px', 
                                        marginBottom: '12px', 
                                        borderRadius: '20px', 
                                        background: 'var(--input-bg)',
                                        border: room.meetingActive ? '1px solid var(--md-primary)' : '1px solid transparent',
                                        flexDirection: 'column',
                                        alignItems: 'stretch',
                                        height: 'auto'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                background: room.meetingActive ? 'var(--md-primary)' : 'var(--md-secondary-container)',
                                                borderRadius: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <i className={`fas ${room.meetingActive ? 'fa-video' : 'fa-video-slash'}`} style={{ color: room.meetingActive ? 'var(--md-on-primary)' : 'var(--md-primary)' }}></i>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{room.name}</div>
                                                <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{room.category || 'Group'}</div>
                                            </div>
                                            {room.meetingActive && (
                                                <div className="pulse-indicator" style={{ 
                                                    background: '#ef4444', 
                                                    padding: '4px 8px', 
                                                    borderRadius: '8px', 
                                                    fontSize: '0.65rem', 
                                                    fontWeight: 800, 
                                                    color: 'white' 
                                                }}>LIVE</div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {room.meetingActive ? (
                                                <div style={{ display: 'flex', gap: '8px', flex: 1, flexDirection: 'column', minWidth: 0 }}>
                                                    {isInvited ? (
                                                        callState.isGroupMeeting && callState.meetingRoomId === room.id ? (
                                                            <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                                                                <button 
                                                                    className="md-button md-button-danger" 
                                                                    style={{ flex: 1, padding: '10px 2px', fontSize: '0.75rem', background: '#ef4444', color: 'white', borderRadius: '12px', minWidth: 0 }}
                                                                    onClick={(e) => { e.stopPropagation(); leaveMeeting(); }}
                                                                >
                                                                    Stop Local Video
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                className="md-button" 
                                                                style={{ width: '100%', padding: '10px 8px', fontSize: '0.8rem', borderRadius: '12px' }}
                                                                onClick={(e) => { e.stopPropagation(); joinGroupMeeting(room.id); }}
                                                            >
                                                                <i className="fas fa-video"></i> Join
                                                            </button>
                                                        )
                                                    ) : (
                                                        <div style={{ textAlign: 'center', fontSize: '0.75rem', opacity: 0.5, padding: '8px' }}>
                                                            Private Meeting
                                                        </div>
                                                    )}
                                                    
                                                    {/* Global Owner/Initiator Controls visible regardless of invite status */}
                                                    {(room.initiatorUsername === currentUser?.username || room.owner?.username === currentUser?.username) && (
                                                        <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
                                                            <button 
                                                                className="md-button md-button-danger" 
                                                                style={{ flex: 1, padding: '8px 4px', fontSize: '0.7rem', background: '#ef4444', color: 'white', borderRadius: '10px' }}
                                                                onClick={(e) => { e.stopPropagation(); forceEndMeeting(room.id); }}
                                                            >
                                                                Stop
                                                            </button>
                                                            <button 
                                                                className="md-button md-button-danger" 
                                                                style={{ flex: 1, padding: '8px 4px', fontSize: '0.7rem', background: '#dc2626', color: 'white', borderRadius: '10px' }}
                                                                onClick={(e) => { e.stopPropagation(); forceEndMeeting(room.id); }}
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button 
                                                                className="md-button md-button-danger" 
                                                                style={{ flex: 1, padding: '8px 4px', fontSize: '0.7rem', background: '#991b1b', color: 'white', borderRadius: '10px' }}
                                                                onClick={(e) => { e.stopPropagation(); forceEndMeeting(room.id); }}
                                                            >
                                                                End Session
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                                                    <button 
                                                        className="md-button md-button-secondary" 
                                                        style={{ flex: 1, padding: '8px', fontSize: '0.8rem', background: 'var(--md-primary-container)', color: 'var(--md-primary)' }}
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            selectChat(room.id, 'ROOM');
                                                            setIsInviteModalOpen(true); 
                                                        }}
                                                    >
                                                        Start New Meeting
                                                    </button>
                                                    {room.owner?.username === currentUser?.username && (
                                                        <button 
                                                            className="md-button md-button-danger" 
                                                            style={{ padding: '8px 12px', fontSize: '0.9rem', background: '#ef4444', color: 'white', borderRadius: '12px' }}
                                                            onClick={(e) => { e.stopPropagation(); deleteRoom(room.id); }}
                                                            title="Delete Room"
                                                        >
                                                            <i className="fas fa-trash"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {activeTab === 'CALLS' && (
                    <div style={{ paddingBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <p className="section-label" style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Recent Calls</p>
                            <button onClick={clearCallHistory} style={{ background: 'none', border: 'none', color: 'var(--md-primary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Clear All</button>
                        </div>

                        {callHistory.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.5 }}>
                                <i className="fas fa-phone-slash fa-2x" style={{ marginBottom: '16px' }}></i>
                                <p style={{ fontSize: '0.9rem' }}>No recent calls</p>
                            </div>
                        ) : (
                            callHistory.map((log, i) => {
                                const isCaller = log.caller === currentUser.username;
                                const otherUser = isCaller ? log.receiver : log.caller;
                                return (
                                    <div key={i} className="list-tile premium-card-hover" style={{ padding: '12px 14px', marginBottom: '8px', borderRadius: '16px', background: 'var(--input-bg)' }}>
                                        <div className="avatar" style={{ width: '44px', height: '44px', borderRadius: '12px', overflow: 'hidden' }}>
                                            <img src={friends.find(f => f.username === otherUser)?.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser}`} alt="avatar" />
                                        </div>
                                        <div style={{ flex: 1, marginLeft: '12px', minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{otherUser}</span>
                                                <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>
                                                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                                <i className={`fas ${log.direction === 'OUTGOING' ? 'fa-arrow-up-right' : 'fa-arrow-down-left'}`}
                                                    style={{ fontSize: '0.7rem', color: log.status === 'MISSED' ? '#ef4444' : 'var(--text-primary)' }}></i>
                                                <span style={{ fontSize: '0.75rem', opacity: 0.7, fontWeight: 500 }}>
                                                    {log.status.charAt(0) + log.status.slice(1).toLowerCase()}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', marginLeft: '8px' }}>
                                            <button onClick={() => startCall(otherUser, log.type)} style={{
                                                width: '32px', height: '32px', borderRadius: '8px', border: 'none',
                                                background: 'var(--md-primary-container)', color: 'var(--md-primary)',
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                <i className={`fas ${log.type === 'video' ? 'fa-video' : 'fa-phone-alt'}`} style={{ fontSize: '0.8rem' }}></i>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {activeTab === 'FRIENDS' && (
                    <>
                        <p className="section-label" style={{ paddingLeft: '8px', marginTop: '32px', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Contacts</p>

                        {friends.map(friend => (
                            <div key={friend.username} className={`list-tile ${currentChat.target === friend.username ? 'active' : ''}`}
                                onClick={() => selectChat(friend.username, 'PRIVATE')}
                                style={{ padding: '12px', height: '72px' }}>
                                <div style={{ position: 'relative' }}>
                                    <div className="avatar" style={{ width: '48px', height: '48px', borderRadius: '14px', overflow: 'hidden' }}>
                                        <img src={friend.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.username}`} alt="avatar" />
                                    </div>
                                    {friend.online && <div className="online-indicator-dot"></div>}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                        <span style={{ fontWeight: 700, color: 'var(--md-on-surface)', fontSize: '0.95rem' }}>{friend.username}</span>
                                        <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>Recently</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                        <span style={{ fontSize: '0.8rem', opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {friend.online ? 'Online' : 'Offline'}
                                        </span>
                                        {unreadCounts[friend.username] > 0 && (
                                            <span className="unread-badge">
                                                {unreadCounts[friend.username]}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>

            {/* Scroll Controls */}
            {showScrollUp && (
                <button 
                    onClick={() => scroll('up')}
                    className="sidebar-scroll-btn"
                    style={{ top: '10px' }}
                >
                    <i className="fas fa-chevron-up"></i>
                </button>
            )}

            {showScrollDown && (
                <button 
                    onClick={() => scroll('down')}
                    className="sidebar-scroll-btn"
                    style={{ bottom: '10px' }}
                >
                    <i className="fas fa-chevron-down"></i>
                </button>
            )}

            <CreateGroupModal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} />
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            
            <InviteUserModal 
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                members={joinedRooms.find(r => r.id === currentChat.target)?.members || []}
                currentUser={currentUser}
                onInvite={(invitedUsernames) => {
                    startGroupMeeting(currentChat.target, invitedUsernames);
                    setIsInviteModalOpen(false);
                }}
            />
        </aside >
    );
};

export default Sidebar;
