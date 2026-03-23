import React, { useState, useRef, useEffect } from 'react';
import { useChat, BACKEND_URL } from '../context/ChatContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CameraModal from './CameraModal';
import MeetingModal from './MeetingModal';
import InviteUserModal from './InviteUserModal';
import GroupMembersModal from './GroupMembersModal';

const ChatWindow = () => {
    const {
        currentChat, messages, sendMessage, sendFile, joinedRooms,
        startCall, currentUser, friends, clearChat, deleteMessage, isConnected,
        isSidebarOpen, setIsSidebarOpen,
        starredMessages, toggleStar, togglePin, replyTo, setReplyTo,
        callState, startGroupMeeting, joinGroupMeeting, leaveMeeting, endMeetingForAll, toggleMute, toggleVideo
    } = useChat();

    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [shouldAutoSpeak, setShouldAutoSpeak] = useState(false);
    const messagesEndRef = useRef(null);
    const recognitionRef = useRef(null);
    const fileInputRef = useRef(null);
    const [availableVoices, setAvailableVoices] = useState([]);
    const [previewImage, setPreviewImage] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
    const [activeReactionId, setActiveReactionId] = useState(null); // Track which message picker is open
    const [menuDirection, setMenuDirection] = useState('up');

    const REACTION_OPTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👍'];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
        // Auto-speak implementation for Speech-to-Speech flow
        if (shouldAutoSpeak && messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            const isAi = lastMsg.sender === 'AI Assistant' || lastMsg.sender === 'Gemini AI' || lastMsg.sender === 'System';
            if (isAi) {
                speakText(lastMsg.content);
                setShouldAutoSpeak(false); // Reset after speaking
            }
        }
    }, [messages, shouldAutoSpeak]);

    // Initialize Voices
    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            setAvailableVoices(voices);
        };
        window.speechSynthesis.onvoiceschanged = loadVoices;
        loadVoices();
    }, []);

    // Initialize Speech Recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setInput(transcript);
                setIsListening(false);
                // Trigger auto-send for speech-to-speech
                handleSend(transcript, true);
            };

            recognitionRef.current.onerror = () => {
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, []);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            setInput('');
            setIsListening(true);
            recognitionRef.current?.start();
        }
    };

    const speakText = (text) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Use availableVoices state for more reliable matching
        const preferredVoice = availableVoices.find(v => v.name.includes('Google') || v.name.includes('Natural') || v.lang === 'en-US');
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        utterance.rate = 1.0;
        utterance.pitch = 1.1;
        utterance.volume = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    };

    const stopSpeaking = () => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    };

    const handleReactionClick = (e, timestamp) => {
        e.stopPropagation();
        if (activeReactionId === timestamp) {
            setActiveReactionId(null);
        } else {
            const rect = e.currentTarget.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            setMenuDirection(spaceBelow < 300 ? 'up' : 'down');
            setActiveReactionId(timestamp);
        }
    };

    const handleDoubleClick = (timestamp) => {
        sendReaction(timestamp, '❤️');
    };

    const handleReaction = (timestamp, emoji) => {
        sendReaction(timestamp, emoji);
        setActiveReactionId(null);
    };

    const handleForward = (msg) => {
        const targetFriend = prompt("Enter username to forward to:");
        if (targetFriend) {
            // Logic to forward: essentially sending a new message to that target
            // This would require a more complex UI, but for now we simulate
            alert(`Forwarded to ${targetFriend}`);
            // In a real app, we'd call sendMessage with a different target
        }
        setActiveReactionId(null);
    };

    const handleSend = (textOverride, isFromVoice = false) => {
        const messageText = textOverride || input;
        if (messageText.trim()) {
            sendMessage(messageText.trim());
            setInput('');
            if (isFromVoice) {
                setShouldAutoSpeak(true);
            }
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            console.log("Starting file upload:", file.name);
            const response = await fetch(`${BACKEND_URL}/api/files/upload`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const fileData = await response.json();
                console.log("Upload successful, file data:", fileData);
                sendFile(fileData);
            } else {
                const error = await response.json();
                console.error("Upload failed server-side:", error);
                alert(`Upload failed: ${error.error || 'Server error'}`);
            }
        } catch (err) {
            console.error("File upload error:", err);
            alert("Failed to upload file.");
        }
        // Reset input
        e.target.value = null;
    };

    const handleCameraCapture = async (media) => {
        const { blob, type } = media;
        const filename = type.startsWith('image/') ? 'photo.jpg' : 'video.webm';
        const file = new File([blob], filename, { type });

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${BACKEND_URL}/api/files/upload`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const fileData = await response.json();
                sendFile(fileData);
            } else {
                console.error("Camera upload failed");
            }
        } catch (err) {
            console.error("Camera capture upload error:", err);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleSend();
    };

    const getChatTitle = () => {
        if (!currentChat.target) return 'Communication Engine';
        if (currentChat.type === 'ROOM') {
            const room = joinedRooms.find(r => r.id === currentChat.target);
            return room ? room.name : `Group: ${currentChat.target}`;
        }
        return currentChat.target;
    };

    const getChatAvatar = () => {
        if (!currentChat.target) return <i className="fas fa-terminal" style={{ color: 'var(--md-primary)' }}></i>;
        if (currentChat.type === 'ROOM') return <i className="fas fa-users"></i>;
        if (currentChat.target === 'Gemini AI') return <i className="fas fa-comment-dots"></i>;
        const friend = friends.find(f => f.username === currentChat.target);
        return <img src={friend?.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentChat.target}`} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: 'inherit' }} />;
    };


    const WelcomeView = () => (
        <div className="welcome-container">
            <div className="welcome-content">
                <div className="welcome-logo">
                    <img src="/logo.svg" alt="logo" />
                </div>
                <h1 className="welcome-title">Welcome back, <span className="highlight">{currentUser?.username || 'User'}</span>!</h1>
                <p className="welcome-subtitle">Select a contact to start a conversation or explore your groups and meetings.</p>
                
                <div className="welcome-actions">
                    <div className="welcome-card" onClick={() => setIsInviteModalOpen(true)}>
                        <i className="fas fa-user-plus"></i>
                        <span>Find Friends</span>
                    </div>
                    <div className="welcome-card" onClick={() => setActiveTab('GROUPS')}>
                        <i className="fas fa-users-cog"></i>
                        <span>Manage Groups</span>
                    </div>
                    <div className="welcome-card" onClick={() => startCall('Gemini AI', 'audio')}>
                        <i className="fas fa-robot"></i>
                        <span>Chat with AI</span>
                    </div>
                </div>
                
                <div className="welcome-footer">
                    <p>Experience the next generation of communication.</p>
                </div>
            </div>
            <div className="welcome-bg-blobs">
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
                <div className="blob blob-3"></div>
            </div>
        </div>
    );

    if (!currentChat.target) {
        return (
            <div className="chat-window welcome-mode">
                <WelcomeView />
                <InviteUserModal 
                    isOpen={isInviteModalOpen}
                    onClose={() => setIsInviteModalOpen(false)}
                    members={[]}
                    currentUser={currentUser}
                    onInvite={(invitedUsernames) => {
                        // Handle invite logic if needed
                        setIsInviteModalOpen(false);
                    }}
                />
            </div>
        );
    }
    return (
        <main className="chat-window surface">
            <header className="component-header">
                {currentChat.target && (
                    <button 
                        className="mobile-back-btn" 
                        onClick={() => setIsSidebarOpen(true)}
                        style={{ background: 'none', border: 'none', color: 'inherit', padding: '8px', cursor: 'pointer', display: 'none' }}
                    >
                        <i className="fas fa-chevron-left"></i>
                    </button>
                )}
                <div 
                    className="header-info-container"
                    onClick={() => {
                        if (currentChat.type === 'ROOM') setIsMembersModalOpen(true);
                    }}
                    title={currentChat.type === 'ROOM' ? 'View Group Members' : ''}
                >
                    <div className="avatar chat-avatar">
                        {getChatAvatar()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{getChatTitle()}</h3>
                            <span style={{ width: '8px', height: '8px', background: 'var(--md-primary)', borderRadius: '50%' }}></span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.6 }}>Online</p>
                    </div>
                </div>

                {getChatTitle() !== 'Communication Engine' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        {currentChat.type === 'PRIVATE' ? (
                            <>
                                <i className="fas fa-phone-alt" style={{ color: '#5F6368', cursor: 'pointer', fontSize: '1.1rem' }} onClick={() => startCall(currentChat.target, 'audio')}></i>
                                <i className="fas fa-video" style={{ color: '#5F6368', cursor: 'pointer', fontSize: '1.1rem' }} onClick={() => startCall(currentChat.target, 'video')}></i>
                            </>
                        ) : (() => {
                            const room = joinedRooms.find(r => r.id === currentChat.target);
                            const isInvited = room?.invitedUsernames?.includes(currentUser.username);
                            
                            return (
                                <>
                                    {room?.meetingActive ? (
                                        (() => {
                                            const isInThisMeeting = callState.isActive && callState.isGroupMeeting && callState.meetingRoomId === currentChat.target;
                                            
                                            if (isInThisMeeting) {
                                                return (
                                                    <button className="md-button md-button-danger" style={{ 
                                                        padding: '6px 16px', 
                                                        borderRadius: '20px', 
                                                        fontSize: '0.8rem',
                                                        background: '#ef4444',
                                                        color: 'white',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px'
                                                    }} onClick={callState.isInitiator ? endMeetingForAll : leaveMeeting}>
                                                        <i className={`fas ${callState.isInitiator ? 'fa-stop-circle' : 'fa-sign-out-alt'}`}></i>
                                                        {callState.isInitiator ? 'End' : 'Stop'}
                                                    </button>
                                                );
                                            } else {
                                                return (
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        {isInvited ? (
                                                            <button className="md-button" style={{ 
                                                                padding: '6px 16px', 
                                                                borderRadius: '20px', 
                                                                fontSize: '0.8rem',
                                                                background: 'var(--md-primary)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px'
                                                            }} onClick={() => joinGroupMeeting(currentChat.target)}>
                                                                <i className="fas fa-video"></i> Join
                                                            </button>
                                                        ) : null}
                                                        {(room.initiatorUsername === currentUser?.username || room.owner === currentUser?.username) && (
                                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                                <button className="md-button md-button-danger" style={{ 
                                                                    padding: '6px 12px', 
                                                                    borderRadius: '20px', 
                                                                    fontSize: '0.75rem',
                                                                    background: '#ef4444',
                                                                    color: 'white'
                                                                }} onClick={endMeetingForAll} title="Stop Meeting">
                                                                    Stop
                                                                </button>
                                                                <button className="md-button md-button-danger" style={{ 
                                                                    padding: '6px 12px', 
                                                                    borderRadius: '20px', 
                                                                    fontSize: '0.75rem',
                                                                    background: '#dc2626',
                                                                    color: 'white'
                                                                }} onClick={endMeetingForAll} title="Cancel Meeting">
                                                                    Cancel
                                                                </button>
                                                                <button className="md-button md-button-danger" style={{ 
                                                                    padding: '6px 12px', 
                                                                    borderRadius: '20px', 
                                                                    fontSize: '0.75rem',
                                                                    background: '#991b1b',
                                                                    color: 'white'
                                                                }} onClick={endMeetingForAll} title="End Meeting">
                                                                    End
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()
                                    ) : (
                                        <i className="fas fa-video-plus" 
                                           style={{ color: '#5F6368', cursor: 'pointer', fontSize: '1.1rem' }} 
                                           title="Start Group Meeting"
                                           onClick={() => setIsInviteModalOpen(true)}></i>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                )}
            </header>

            <div className="messages-list" style={{ flex: 1, padding: '32px', overflowY: 'auto', minHeight: 0 }}>
                {messages.length === 0 ? (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}>
                        <i className="fas fa-comments fa-3x" style={{ marginBottom: '16px', color: 'var(--md-primary)' }}></i>
                        <p style={{ fontWeight: 600 }}>Start a new conversation</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {messages.filter(m => !m.content?.startsWith('__SIGNAL__:')).map((msg, idx) => {
                            const isMe = msg.sender === currentUser?.username;
                            const isAi = msg.sender === 'AI Assistant' || msg.sender === 'Gemini AI';
                            const bubbleStyle = isMe ? 'bubble-sent' : (isAi ? 'bubble-ai' : 'bubble-received');

                            const isStarred = starredMessages.some(m => m.timestamp === msg.timestamp);
                            const isPinned = msg.pinned;

                            return (
                                <div key={idx}
                                    className={`bubble ${bubbleStyle}`}
                                    style={{ position: 'relative' }}
                                    onDoubleClick={() => handleDoubleClick(msg.timestamp)}
                                >
                                    {/* Pin/Star Indicators */}
                                    {(isStarred || isPinned) && (
                                        <div className="msg-indicators">
                                            {isPinned && <div className="indicator-icon pin-icon" title="Pinned"><i className="fas fa-thumbtack"></i></div>}
                                            {isStarred && <div className="indicator-icon star-icon" title="Starred"><i className="fas fa-star"></i></div>}
                                        </div>
                                    )}
                                    {/* Message Actions (Reaction Button) */}
                                    <div className="message-actions">
                                        <button className="action-btn" onClick={(e) => handleReactionClick(e, msg.timestamp)}>
                                            <i className="far fa-smile"></i>
                                        </button>
                                        {activeReactionId === msg.timestamp && (
                                            <div className={`message-menu ${menuDirection === 'down' ? 'menu-down' : ''}`}>
                                                <div className="emoji-row">
                                                    {REACTION_OPTIONS.map(emoji => (
                                                        <button key={emoji} className="reaction-btn" onClick={() => handleReaction(msg.timestamp, emoji)}>
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                    <button className="reaction-btn plus-btn"><i className="fas fa-plus"></i></button>
                                                </div>
                                                <div className="menu-divider"></div>
                                                <div className="menu-actions-list">
                                                    <button className="menu-item" onClick={() => { setReplyTo(msg); setActiveReactionId(null); }}>
                                                        <i className="fas fa-reply"></i> <span>Reply</span>
                                                    </button>
                                                    <button className="menu-item" onClick={() => {
                                                        navigator.clipboard.writeText(msg.content);
                                                        setActiveReactionId(null);
                                                    }}>
                                                        <i className="fas fa-copy"></i> <span>Copy</span>
                                                    </button>
                                                    <button className="menu-item" onClick={() => handleForward(msg)}>
                                                        <i className="fas fa-share"></i> <span>Forward</span>
                                                    </button>
                                                    <button className="menu-item" onClick={() => { togglePin(msg.timestamp); setActiveReactionId(null); }}>
                                                        <i className="fas fa-thumbtack"></i> <span>{isPinned ? 'Unpin' : 'Pin'}</span>
                                                    </button>
                                                    <button className="menu-item" onClick={() => { toggleStar(msg); setActiveReactionId(null); }}>
                                                        <i className="fas fa-star"></i> <span>{isStarred ? 'Unstar' : 'Star'}</span>
                                                    </button>
                                                    <button className="menu-item delete-action" onClick={() => {
                                                        if (window.confirm("Delete this message?")) {
                                                            deleteMessage(msg.timestamp, msg.sender);
                                                            setActiveReactionId(null);
                                                        }
                                                    }}>
                                                        <i className="fas fa-trash"></i> <span>Delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {(isAi || (!isMe && currentChat.type === 'ROOM')) && (
                                        <span style={{
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            marginBottom: '4px',
                                            color: isAi ? '#82b1ff' : 'var(--md-primary-container)',
                                            filter: 'brightness(1.5)'
                                        }}>
                                            {isAi && <i className="fas fa-comment-dots" style={{ fontSize: '0.65rem' }}></i>}
                                            {msg.sender}
                                        </span>
                                    )}
                                    {msg.replyTo && (
                                        <div className="quoted-message">
                                            <div className="quoted-sender">{msg.replyTo.sender}</div>
                                            <div className="quoted-text">{msg.replyTo.content}</div>
                                        </div>
                                    )}
                                    <div className="markdown-content">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>

                                    <div className="message-time">
                                        {new Date(msg.timestamp).toLocaleTimeString([], {
                                            hour: 'numeric',
                                            minute: '2-digit',
                                            hour12: true
                                        })}
                                        {isMe && currentChat.type === 'PRIVATE' && (
                                            <span className={`status-ticks ${msg.status === 'READ' ? 'status-read' : 'status-sent'}`}>
                                                <i className={`fas ${msg.status === 'READ' ? 'fa-check-double' : 'fa-check'}`}></i>
                                            </span>
                                        )}
                                    </div>

                                    {/* Render Reactions */}
                                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                        <div className="reactions-container">
                                            {Object.entries(msg.reactions).map(([emoji, count]) => (
                                                <div
                                                    key={emoji}
                                                    className="reaction-chip"
                                                    onClick={() => handleReaction(msg.timestamp, emoji)}
                                                >
                                                    <span>{emoji}</span>
                                                    <span>{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {msg.fileUrl && (
                                        <div className="media-container" style={{ marginTop: '10px' }}>
                                            {msg.fileType?.startsWith('image/') ? (
                                                <div style={{ position: 'relative', marginTop: '8px' }}>
                                                    <img
                                                        src={`${BACKEND_URL}${msg.fileUrl}`}
                                                        alt={msg.fileName}
                                                        style={{
                                                            maxHeight: '200px',
                                                            maxWidth: '240px',
                                                            borderRadius: '12px',
                                                            cursor: 'zoom-in',
                                                            objectFit: 'cover',
                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                            display: 'block'
                                                        }}
                                                        onClick={() => setPreviewImage(`${BACKEND_URL}${msg.fileUrl}`)}
                                                    />
                                                    <div style={{
                                                        position: 'absolute',
                                                        bottom: '8px',
                                                        right: '8px',
                                                        background: 'rgba(0,0,0,0.5)',
                                                        borderRadius: '8px',
                                                        width: '32px',
                                                        height: '32px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        backdropFilter: 'blur(4px)',
                                                        pointerEvents: 'none'
                                                    }}>
                                                        <i className="fas fa-expand-alt" style={{ fontSize: '0.8rem', color: '#fff' }}></i>
                                                    </div>
                                                </div>
                                            ) : msg.fileType?.startsWith('video/') ? (
                                                <video
                                                    controls
                                                    style={{ maxWidth: '100%', borderRadius: '12px' }}
                                                >
                                                    <source src={`${BACKEND_URL}${msg.fileUrl}`} type={msg.fileType} />
                                                </video>
                                            ) : msg.fileType?.startsWith('audio/') ? (
                                                <audio controls style={{ width: '100%' }}>
                                                    <source src={`${BACKEND_URL}${msg.fileUrl}`} type={msg.fileType} />
                                                </audio>
                                            ) : (
                                                <a
                                                    href={`${BACKEND_URL}${msg.fileUrl}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="file-download-bubble"
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        background: 'rgba(255,255,255,0.08)',
                                                        padding: '12px 16px',
                                                        borderRadius: '16px',
                                                        color: '#fff',
                                                        textDecoration: 'none',
                                                        marginTop: '8px',
                                                        border: '1px solid rgba(255,255,255,0.05)',
                                                        transition: 'var(--transition)'
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        borderRadius: '10px',
                                                        background: 'var(--md-primary-container)',
                                                        color: 'var(--md-on-primary-container)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <i className="fas fa-file-alt"></i>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 600, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {msg.fileName}
                                                        </span>
                                                        <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>
                                                            Click to Download
                                                        </span>
                                                    </div>
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    {isAi && (
                                        <button
                                            onClick={() => speakText(msg.content)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#82b1ff',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem',
                                                marginTop: '8px',
                                                opacity: 0.7,
                                                padding: '4px'
                                            }}
                                            title="Read Aloud"
                                        >
                                            <i className="fas fa-volume-up"></i>
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Voice/Speaking Overlay */}
            {
                isSpeaking && (
                    <div className="loader-overlay">
                        <button className="close-speaking-btn" onClick={stopSpeaking} title="Stop Speaking">
                            <i className="fas fa-times"></i>
                        </button>
                        <div className="loader-wrapper">
                            {"Speaking...".split("").map((char, i) => (
                                <span key={i} className="loader-letter" style={{ animationDelay: `${i * 0.1}s` }}>
                                    {char}
                                </span>
                            ))}
                            <div className="loader-circle" />
                        </div>
                    </div>
                )
            }

            <div className="chat-input-area">
                {replyTo && (
                    <div className="reply-preview-bar">
                        <div className="reply-content">
                            <div className="reply-label">Replying to {replyTo.sender}</div>
                            <div className="reply-text">{replyTo.content}</div>
                        </div>
                        <div className="close-reply" onClick={() => setReplyTo(null)}>
                            <i className="fas fa-times"></i>
                        </div>
                    </div>
                )}
                <div className="chat-input-container">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <i className="far fa-smile" style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', opacity: 0.7, cursor: 'pointer' }} onClick={() => setShowEmojiPicker(!showEmojiPicker)} title="Add Emoji"></i>
                            {showEmojiPicker && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '50px',
                                    left: '0',
                                    background: 'var(--surface-overlay)',
                                    padding: '12px',
                                    borderRadius: '16px',
                                    display: 'flex',
                                    gap: '10px',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                                    border: '1px solid var(--border-color)',
                                    zIndex: 100,
                                    backdropFilter: 'blur(10px)'
                                }}>
                                    {['❤️', '😂', '😮', '😢', '🔥', '👍', '🙏', '✨'].map(emoji => (
                                        <span key={emoji} style={{ cursor: 'pointer', fontSize: '1.2rem', transition: 'transform 0.2s' }}
                                            onClick={() => { setInput(prev => prev + emoji); setShowEmojiPicker(false); }}
                                            onMouseEnter={(e) => e.target.style.transform = 'scale(1.3)'}
                                            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}>
                                            {emoji}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <i className="fas fa-paperclip" style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', opacity: 0.7, cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()} title="Attach File"></i>
                        <i className="far fa-image" style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', opacity: 0.7, cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()} title="Attach Image"></i>
                        <i className="fas fa-camera" style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', opacity: 0.7, cursor: 'pointer' }} onClick={() => setIsCameraModalOpen(true)} title="Take Photo/Video"></i>

                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                        />

                        <input
                            type="text"
                            className="md-input"
                            placeholder="Enter Message..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            style={{ background: 'transparent', border: 'none', flex: 1 }}
                        />

                        <button className="md-button" onClick={() => handleSend()} style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '10px',
                            padding: 0,
                            background: 'var(--md-primary)',
                            boxShadow: 'none'
                        }}>
                            <i className="fas fa-paper-plane" style={{ fontSize: '1rem' }}></i>
                        </button>
                    </div>
                </div>
                {/* Image Preview Modal */}
                {
                    previewImage && (
                        <div
                            style={{
                                position: 'fixed',
                                inset: 0,
                                zIndex: 10000,
                                background: 'rgba(0,0,0,0.9)',
                                backdropFilter: 'blur(10px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '40px',
                                cursor: 'zoom-out'
                            }}
                            onClick={() => setPreviewImage(null)}
                        >
                            <button
                                style={{
                                    position: 'absolute',
                                    top: '24px',
                                    right: '24px',
                                    background: 'white',
                                    color: 'black',
                                    border: 'none',
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    fontSize: '1.2rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                }}
                                onClick={() => setPreviewImage(null)}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                            <img
                                src={previewImage}
                                alt="Preview"
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    borderRadius: '16px',
                                    boxShadow: '0 24px 48px rgba(0,0,0,0.8)',
                                    objectFit: 'contain',
                                    animation: 'modalScale 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                }}
                            />
                            <style>
                                {`
                        @keyframes modalScale {
                            from { transform: scale(0.9); opacity: 0; }
                            to { transform: scale(1); opacity: 1; }
                        }
                        `}
                            </style>
                        </div>
                    )
                }
                <CameraModal
                    isOpen={isCameraModalOpen}
                    onClose={() => setIsCameraModalOpen(false)}
                    onCapture={handleCameraCapture}
                />
                
                <InviteUserModal
                    isOpen={isInviteModalOpen}
                    onClose={() => setIsInviteModalOpen(false)}
                    members={joinedRooms.find(r => r.id === currentChat.target)?.members || []}
                    onInvite={(usernames) => startGroupMeeting(currentChat.target, usernames)}
                    currentUser={currentUser}
                />

                <GroupMembersModal
                    isOpen={isMembersModalOpen}
                    onClose={() => setIsMembersModalOpen(false)}
                    room={joinedRooms.find(r => r.id === currentChat.target)}
                    friends={friends}
                />
                
                <MeetingModal
                isOpen={callState.isActive && callState.isGroupMeeting}
                onClose={leaveMeeting}
                localStream={callState.localStream}
                remoteStreams={callState.remoteStreams}
                isMuted={callState.isMuted}
                isVideoOff={callState.isVideoOff}
                onToggleMute={toggleMute}
                onToggleVideo={toggleVideo}
                isInitiator={callState.isInitiator}
                onEndMeeting={endMeetingForAll}
            />

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
            </div>
        </main>
    );
};

export default ChatWindow;
