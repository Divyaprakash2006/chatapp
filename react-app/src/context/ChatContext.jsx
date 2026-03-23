import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import { useWebRTC } from '../hooks/useWebRTC';


const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:9090';

const compressAudio = async (dataUrl) => {
    // Basic stub for audio compression, returns same dataUrl for now
    // to avoid ReferenceError. Real implementation would use Web Audio API.
    return dataUrl;
};

export const ChatProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [stompClient, setStompClient] = useState(null);
    const clientRef = useRef(null);
    const [friends, setFriends] = useState([]);
    const [joinedRooms, setJoinedRooms] = useState([]);
    const [currentChat, setCurrentChat] = useState({ target: null, type: 'ROOM' });
    const [messages, setMessages] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
    const [unreadCounts, setUnreadCounts] = useState({}); // { target: count }
    const [customRingtone, setCustomRingtone] = useState(localStorage.getItem('customRingtone') || null);
    const [isCompressingRingtone, setIsCompressingRingtone] = useState(false);
    const [readReceipts, setReadReceipts] = useState(() => {
        const saved = localStorage.getItem('readReceipts');
        return saved === null ? true : JSON.parse(saved);
    });
    const [activeTab, setActiveTab] = useState('CHATS');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [starredMessages, setStarredMessages] = useState(() => {
        const saved = localStorage.getItem('starredMessages');
        return saved ? JSON.parse(saved) : [];
    });
    const [replyTo, setReplyTo] = useState(null);
    const [callHistory, setCallHistory] = useState([]);
    const [recentChats, setRecentChats] = useState(() => {
        const saved = localStorage.getItem('recentChats');
        return saved ? JSON.parse(saved) : [];
    });

    const subscriptions = useRef({});
    const privateMsgHandlerRef = useRef(null);
    const signalHandlerRef = useRef(null);
    const currentChatRef = useRef(currentChat);

    const addToRecent = useCallback((target, type) => {
        if (!target || target === 'Gemini AI') return;
        setRecentChats(prev => {
            const index = prev.findIndex(c => c.target === target && c.type === type);
            const newChat = { target, type, lastInteraction: Date.now() };
            let newList = [...prev];
            if (index > -1) {
                newList.splice(index, 1);
            }
            newList.unshift(newChat);
            return newList.slice(0, 50);
        });
    }, []);

    useEffect(() => {
        localStorage.setItem('recentChats', JSON.stringify(recentChats));
    }, [recentChats]);

    // Keep currentChatRef up to date
    useEffect(() => {
        currentChatRef.current = currentChat;
    }, [currentChat]);

    const fetchRooms = useCallback(async (username) => {
        const userToFetch = username || currentUser?.username;
        if (!userToFetch) return;
        console.log(`%c[FETCH ROOMS] for ${userToFetch}`, 'color: #3b82f6; font-weight: bold');
        try {
            const response = await fetch(`${BACKEND_URL}/api/rooms/my?username=${userToFetch}`);
            if (response.ok) {
                const data = await response.json();
                console.log(`%c[ROOMS RECEIVED]`, 'color: #10b981; font-weight: bold', data);
                setJoinedRooms(data);
            }
        } catch (err) {
            console.error("Fetch rooms error:", err);
        }
    }, [currentUser, BACKEND_URL]);

    const {
        callState,
        startCall,
        acceptCall,
        declineCall,
        hangUp,
        handleSignal,
        resetCallState,
        toggleMute,
        toggleVideo,
        startGroupMeeting,
        joinGroupMeeting,
        leaveMeeting,
        endMeetingForAll
    } = useWebRTC(
        currentUser || {},
        stompClient,
        customRingtone,
        (sig) => signalHandlerRef.current(sig),
        (log) => addCallToHistory(log),
        BACKEND_URL,
        fetchRooms
    );

    // Update refs on every render to avoid stale closures in subscriptions
    useEffect(() => {
        privateMsgHandlerRef.current = handleIncomingPrivateMessage;
        signalHandlerRef.current = handleSignal;
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('starredMessages', JSON.stringify(starredMessages));
    }, [starredMessages]);


    useEffect(() => {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            const user = JSON.parse(savedUser);
            if (user && user.username) {
                setCurrentUser(user);
                connectToServer(user.username);
            }
        }

        // Request notification permission
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }

        return () => {
            if (clientRef.current && clientRef.current.connected) {
                try {
                    console.log("Cleaning up STOMP connection...");
                    clientRef.current.disconnect();
                } catch (e) {
                    console.warn("Error during STOMP cleanup:", e);
                }
            }
        };
    }, []);

    const connectToServer = (username) => {
        if (clientRef.current && clientRef.current.connected) {
            console.log("Disconnecting existing client...");
            try {
                clientRef.current.disconnect();
            } catch (e) {
                console.warn("Error disconnecting client:", e);
            }
        }

        const socket = new SockJS(`${BACKEND_URL}/ws`);
        const client = Stomp.over(socket);
        client.debug = null;
        clientRef.current = client;

        client.connect({ username: username }, (frame) => {
            console.log('Connected: ' + frame);
            setStompClient(client);
            setIsConnected(true);

            client.subscribe(`/topic/messages/${username}`, (payload) => {
                const message = JSON.parse(payload.body);
                console.log(`%c[INCOMING PRIVATE] from ${message.sender}`, 'color: #10b981; font-weight: bold', message);
                if (privateMsgHandlerRef.current) privateMsgHandlerRef.current(message);
            });

            fetchCallHistory(username);

            client.subscribe('/topic/status', (payload) => {
                const status = JSON.parse(payload.body);
                if (status.type === 'STATUS_UPDATE') {
                    setFriends(prev => prev.map(f =>
                        f.username === status.sender ? { ...f, online: status.online } : f
                    ));

                    // Also update in messages if needed, but primary is friends list
                    console.log(`[STATUS] ${status.sender} is now ${status.online ? 'ONLINE' : 'OFFLINE'}`);
                }
            });

            client.subscribe(`/topic/signal/${username}`, (payload) => {
                const signal = JSON.parse(payload.body);
                if (signalHandlerRef.current) signalHandlerRef.current(signal);
            });

            fetchFriends(username);
            fetchRooms(username);
        }, (error) => {
            console.error('STOMP Error:', error);
            setIsConnected(false);
        });
    };

    const fetchFriends = async (username) => {
        if (!username) return;
        console.log(`%c[FETCH FRIENDS] for ${username}`, 'color: #3b82f6; font-weight: bold');
        try {
            const response = await fetch(`${BACKEND_URL}/api/friends/my?username=${username}`);
            if (response.ok) {
                const data = await response.json();
                console.log(`%c[FRIENDS RECEIVED]`, 'color: #10b981; font-weight: bold', data);
                setFriends(data);
            }
        } catch (err) {
            console.error("Fetch friends error:", err);
        }
    };



    const selectChat = async (target, type) => {
        if (currentChat.target === target && currentChat.type === type) return;

        addToRecent(target, type);
        if (currentChat.type === 'ROOM' && subscriptions.current[currentChat.target]) {
            subscriptions.current[currentChat.target].unsubscribe();
            delete subscriptions.current[currentChat.target];
        }

        setCurrentChat({ target, type });
        setMessages([]);

        // Clear unread count
        setUnreadCounts(prev => ({ ...prev, [target]: 0 }));

        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            setIsSidebarOpen(false);
        }

        // Fetch History
        console.log(`%c[FETCH HISTORY] ${type} ${target}`, 'color: #3b82f6; font-weight: bold');
        try {
            const url = type === 'ROOM'
                ? `${BACKEND_URL}/api/messages/room/${target}`
                : `${BACKEND_URL}/api/messages/private?user1=${currentUser.username}&user2=${target}`;

            const res = await fetch(url);
            if (res.ok) {
                const history = await res.json();
                console.log(`%c[HISTORY RECEIVED] ${target}`, 'color: #10b981; font-weight: bold', history);
                setMessages(history);
            }

            // If it's a room, update its AI status in joinedRooms
            if (type === 'ROOM') {
                const roomRes = await fetch(`${BACKEND_URL}/api/rooms/my?username=${currentUser.username}`);
                if (roomRes.ok) {
                    const rooms = await roomRes.json();
                    setJoinedRooms(rooms);
                }
            }
        } catch (err) {
            console.error("History fetch error:", err);
        }

        if (type === 'ROOM' && clientRef.current) {
            const sub = clientRef.current.subscribe(`/topic/${target}`, (payload) => {
                const message = JSON.parse(payload.body);
                console.log(`%c[INCOMING ROOM] ${target} from ${message.sender}`, 'color: #3b82f6; font-weight: bold', message);
                addToRecent(target, 'ROOM');

                if (message.type === 'CHAT' && message.content.startsWith('__SIGNAL__:')) {
                    const parts = message.content.split(':');
                    const signalType = parts[1];
                    const targetTs = parts[2];

                    if (signalType === 'DELETE') {
                        setMessages(prev => prev.filter(m => m.timestamp !== targetTs));
                    } else if (signalType === 'PIN') {
                        updateMessageInState(targetTs, (m) => ({ ...m, pinned: !m.pinned }));
                    } else if (signalType === 'REACTION') {
                        const emoji = parts[3];
                        updateMessageInState(targetTs, (m) => {
                            const reactions = m.reactions || {};
                            reactions[emoji] = (reactions[emoji] || 0) + 1;
                            return { ...m, reactions };
                        });
                    }
                    // Handle Group Meeting Signals
                    handleSignal(message);
                    return;
                }

                if (message.type === 'REACTION') {
                    updateMessageInState(message.targetTimestamp, (m) => {
                        const reactions = m.reactions || {};
                        reactions[message.content] = (reactions[message.content] || 0) + 1;
                        return { ...m, reactions };
                    });
                    return;
                }

                if (message.type === 'DELETE') {
                    setMessages(prev => prev.filter(m => m.timestamp !== message.targetTimestamp));
                    return;
                }

                if (message.type === 'PIN') {
                    updateMessageInState(message.targetTimestamp, (m) => ({ ...m, pinned: !m.pinned }));
                    return;
                }

                if (message.type === 'DELETE') {
                    setMessages(prev => prev.filter(m => m.timestamp !== message.targetTimestamp));
                    return;
                }

                if (message.type === 'PIN') {
                    updateMessageInState(message.targetTimestamp, (m) => ({ ...m, pinned: !m.pinned }));
                    return;
                }
                if (currentChatRef.current.target === target) {
                    setMessages(prev => {
                        if (prev.some(m => m.content === message.content && m.timestamp === message.timestamp && m.sender === message.sender)) {
                            return prev;
                        }
                        return [...prev, message];
                    });
                } else {
                    // Otherwise increment unread count
                    setUnreadCounts(prev => ({
                        ...prev,
                        [target]: (prev[target] || 0) + 1
                    }));

                    // Browser Notification
                    if ("Notification" in window && Notification.permission === "granted") {
                        new Notification(`New message in #${target}`, {
                            body: message.sender + ": " + message.content,
                            icon: "/favicon.ico"
                        });
                    }
                }
            });
            subscriptions.current[target] = sub;
        }
    };

    const sendMessage = (content) => {
        if (!clientRef.current || !isConnected || !currentChat.target) return;
        addToRecent(currentChat.target, currentChat.type);

        const chatMessage = {
            sender: currentUser.username,
            content: content,
            type: 'CHAT',
            status: 'SENT',
            timestamp: new Date().toISOString(),
            replyTo: replyTo // Include reply info if exists
        };

        if (currentChat.type === 'ROOM') {
            console.log(`%c[SENDING ROOM] to ${currentChat.target}`, 'color: #f59e0b; font-weight: bold', chatMessage);
            clientRef.current.send(`/app/chat/${currentChat.target}`, {}, JSON.stringify(chatMessage));
            setMessages(prev => [...prev, chatMessage]);
        } else {
            console.log(`%c[SENDING PRIVATE] to ${currentChat.target}`, 'color: #8b5cf6; font-weight: bold', chatMessage);
            chatMessage.recipient = currentChat.target;
            clientRef.current.send("/app/chat/private", {}, JSON.stringify(chatMessage));
            setMessages(prev => {
                if (prev.some(m => m.content === chatMessage.content && m.timestamp === chatMessage.timestamp)) {
                    return prev;
                }
                return [...prev, chatMessage];
            });
        }
        setReplyTo(null);
    };

    const sendFile = (fileData) => {
        if (!clientRef.current || !isConnected || !currentChat.target) {
            console.error("Cannot send file: Client not connected or no target selected.", {
                connected: isConnected,
                hasClient: !!clientRef.current,
                target: currentChat.target
            });
            alert("Connection lost. Please wait or refresh.");
            return;
        }
        addToRecent(currentChat.target, currentChat.type);

        const chatMessage = {
            sender: currentUser.username,
            content: `Sent a file: ${fileData.fileName}`,
            type: 'CHAT',
            status: 'SENT',
            timestamp: new Date().toISOString(),
            fileUrl: fileData.fileUrl,
            fileName: fileData.fileName,
            fileType: fileData.fileType,
            replyTo: replyTo
        };

        if (currentChat.type === 'ROOM') {
            console.log(`%c[SENDING FILE ROOM] to ${currentChat.target}`, 'color: #f59e0b; font-weight: bold', chatMessage);
            clientRef.current.send(`/app/chat/${currentChat.target}`, {}, JSON.stringify(chatMessage));
            // Optimistic update for Room too
            setMessages(prev => [...prev, chatMessage]);
        } else {
            console.log(`%c[SENDING FILE PRIVATE] to ${currentChat.target}`, 'color: #8b5cf6; font-weight: bold', chatMessage);
            chatMessage.recipient = currentChat.target;
            clientRef.current.send("/app/chat/private", {}, JSON.stringify(chatMessage));
            setMessages(prev => {
                if (prev.some(m => m.content === chatMessage.content && m.timestamp === chatMessage.timestamp)) {
                    return prev;
                }
                return [...prev, chatMessage];
            });
        }
        setReplyTo(null);
    };

    const sendReaction = (msgTimestamp, emoji) => {
        if (!clientRef.current || !isConnected || !currentChat.target) return;

        if (currentChat.type === 'ROOM') {
            const magicMsg = {
                sender: currentUser.username,
                content: `__SIGNAL__:REACTION:${msgTimestamp}:${emoji}`,
                type: 'CHAT',
                timestamp: new Date().toISOString()
            };
            clientRef.current.send(`/app/chat/${currentChat.target}`, {}, JSON.stringify(magicMsg));
        } else {
            const reactionSignal = {
                sender: currentUser.username,
                recipient: currentChat.target,
                type: 'REACTION',
                targetTimestamp: msgTimestamp,
                content: emoji,
                timestamp: new Date().toISOString()
            };
            clientRef.current.send("/app/signal", {}, JSON.stringify(reactionSignal));
        }

        // Optimistic update
        updateMessageInState(msgTimestamp, (m) => {
            const reactions = m.reactions || {};
            reactions[emoji] = (reactions[emoji] || 0) + 1;
            return { ...m, reactions };
        });
    };

    const fetchCallHistory = async (username) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/calls/${username}`);
            if (response.ok) {
                const history = await response.ok ? await response.json() : [];
                setCallHistory(history);
            }
        } catch (error) {
            console.error("Error fetching call history:", error);
        }
    };

    const addCallToHistory = async (log) => {
        const callLog = {
            ...log,
            caller: currentUser.username,
            receiver: log.target,
            status: log.status === 'ACCEPTED' ? 'COMPLETED' : log.status, // Map status to backend enum-like strings
            direction: log.direction,
            type: log.type,
            timestamp: new Date().toISOString()
        };

        try {
            const response = await fetch(`${BACKEND_URL}/api/calls`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(callLog)
            });
            if (response.ok) {
                const savedLog = await response.json();
                setCallHistory(prev => [savedLog, ...prev].slice(0, 50));
            }
        } catch (error) {
            console.error("Error saving call log:", error);
            // Optimistic update if needed, but backend is preferred
        }
    };

    const clearCallHistory = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/calls/${currentUser.username}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                setCallHistory([]);
            }
        } catch (error) {
            console.error("Error clearing call history:", error);
        }
    };

    const markMessageAsRead = (msgTimestamp, sender) => {
        if (!clientRef.current || !isConnected || currentChat.type !== 'PRIVATE') return;
        if (!readReceipts) return;

        const readSignal = {
            sender: currentUser.username,
            recipient: sender,
            type: 'READ',
            targetTimestamp: msgTimestamp,
            timestamp: new Date().toISOString()
        };

        clientRef.current.send("/app/chat/private", {}, JSON.stringify(readSignal));
    };

    const updateMessageInState = (timestamp, updateFn) => {
        setMessages(prev => prev.map(m => m.timestamp === timestamp ? updateFn(m) : m));
    };

    const toggleStar = (message) => {
        setStarredMessages(prev => {
            const isStarred = prev.some(m => m.timestamp === message.timestamp);
            if (isStarred) {
                return prev.filter(m => m.timestamp !== message.timestamp);
            } else {
                return [...prev, message];
            }
        });
    };

    const togglePin = (msgTimestamp) => {
        if (!clientRef.current || !isConnected || !currentChat.target) return;

        if (currentChat.type === 'ROOM') {
            const magicMsg = {
                sender: currentUser.username,
                content: `__SIGNAL__:PIN:${msgTimestamp}`,
                type: 'CHAT',
                timestamp: new Date().toISOString()
            };
            clientRef.current.send(`/app/chat/${currentChat.target}`, {}, JSON.stringify(magicMsg));
        } else {
            const pinSignal = {
                sender: currentUser.username,
                recipient: currentChat.target,
                type: 'PIN',
                targetTimestamp: msgTimestamp,
                timestamp: new Date().toISOString()
            };
            clientRef.current.send("/app/signal", {}, JSON.stringify(pinSignal));
        }

        // Optimistic update
        updateMessageInState(msgTimestamp, (m) => ({ ...m, pinned: !m.pinned }));
    };

    const toggleReadReceipts = () => {
        setReadReceipts(prev => {
            const newVal = !prev;
            localStorage.setItem('readReceipts', JSON.stringify(newVal));
            return newVal;
        });
    };

    const updateRingtone = async (input) => {
        if (typeof input === 'string') {
            const validatedUrl = input && input.startsWith('http') ? input : null;
            setCustomRingtone(validatedUrl);
            if (validatedUrl) {
                localStorage.setItem('customRingtone', validatedUrl);
            } else {
                localStorage.removeItem('customRingtone');
            }
        } else if (input instanceof File) {
            setIsCompressingRingtone(true);
            const reader = new FileReader();
            reader.onloadend = async () => {
                let dataUrl = reader.result;

                // If file is large, compress it before saving
                if (input.size > 64000) {
                    console.log("[ChatContext] File large, compressing...");
                    dataUrl = await compressAudio(dataUrl);
                }

                setCustomRingtone(dataUrl);
                localStorage.setItem('customRingtone', dataUrl);
                setIsCompressingRingtone(false);
            };
            reader.readAsDataURL(input);
        } else {
            setCustomRingtone(null);
            localStorage.removeItem('customRingtone');
        }
    };

    const handleIncomingPrivateMessage = (message) => {
        console.log("Received PRIVATE message:", message);
        addToRecent(message.sender, 'PRIVATE');

        if (message.type === 'READ') {
            updateMessageInState(message.targetTimestamp, (m) => ({ ...m, status: 'READ' }));
            return;
        }

        if (message.type === 'REACTION') {
            updateMessageInState(message.targetTimestamp, (m) => {
                const reactions = m.reactions || {};
                reactions[message.content] = (reactions[message.content] || 0) + 1;
                return { ...m, reactions };
            });
            return;
        }

        if (message.type === 'DELETE') {
            setMessages(prev => prev.filter(m => m.timestamp !== message.targetTimestamp));
            return;
        }

        if (message.type === 'PIN') {
            updateMessageInState(message.targetTimestamp, (m) => ({ ...m, pinned: !m.pinned }));
            return;
        }

        const isCurrent = currentChatRef.current.type === 'PRIVATE' && currentChatRef.current.target === message.sender;

        if (isCurrent) {
            setMessages(prev => {
                if (prev.some(m => m.content === message.content && m.timestamp === message.timestamp)) {
                    return prev;
                }
                const newMsgs = [...prev, message];
                // Notify sender that we read it
                markMessageAsRead(message.timestamp, message.sender);
                return newMsgs;
            });
        } else {
            // Unread count
            const target = message.sender;
            setUnreadCounts(prev => ({
                ...prev,
                [target]: (prev[target] || 0) + 1
            }));
            fetchFriends(currentUser.username);

            // Browser Notification
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification(`New message from ${message.sender}`, {
                    body: message.content,
                    icon: "/favicon.ico"
                });
            }
        }
    };

    const toggleAi = async () => {
        if (!currentChat.target) return;

        try {
            if (currentChat.type === 'ROOM') {
                const res = await fetch(`${BACKEND_URL}/api/rooms/${currentChat.target}/toggle-ai`, { method: 'POST' });
                if (res.ok) {
                    const updatedRoom = await res.json();
                    setJoinedRooms(prev => prev.map(r => r.id === updatedRoom.id ? updatedRoom : r));
                }
            } else {
                // Toggle AI for the current user's profile which acts as "AI mode for my private chats"
                const res = await fetch(`${BACKEND_URL}/api/auth/toggle-ai?username=${currentUser.username}`, { method: 'POST' });
                if (res.ok) {
                    const updatedUser = await res.json();
                    setCurrentUser(updatedUser);
                    localStorage.setItem('currentUser', JSON.stringify(updatedUser));

                    // Also refresh friends list to show AI status if shown
                    fetchFriends(currentUser.username);
                }
            }
        } catch (err) {
            console.error("Toggle AI error:", err);
        }
    };

    const clearChat = async () => {
        if (!currentChat.target) return;
        try {
            const url = currentChat.type === 'ROOM'
                ? `${BACKEND_URL}/api/messages/clear/room/${currentChat.target}`
                : `${BACKEND_URL}/api/messages/clear/private?user1=${currentUser.username}&user2=${currentChat.target}`;

            const res = await fetch(url, { method: 'DELETE' });
            if (res.ok) {
                setMessages([]);
            }
        } catch (err) {
            console.error("Clear chat error:", err);
        }
    };

    const deleteMessage = async (timestamp, sender) => {
        try {
            // Broadcast DELETE signal for real-time
            if (clientRef.current && isConnected && currentChat.target) {
                if (currentChat.type === 'ROOM') {
                    const magicMsg = {
                        sender: currentUser.username,
                        content: `__SIGNAL__:DELETE:${timestamp}`,
                        type: 'CHAT',
                        timestamp: new Date().toISOString()
                    };
                    clientRef.current.send(`/app/chat/${currentChat.target}`, {}, JSON.stringify(magicMsg));
                } else {
                    const deleteSignal = {
                        sender: currentUser.username,
                        recipient: currentChat.target,
                        type: 'DELETE',
                        targetTimestamp: timestamp,
                        timestamp: new Date().toISOString()
                    };
                    clientRef.current.send("/app/signal", {}, JSON.stringify(deleteSignal));
                }
            }

            const url = `${BACKEND_URL}/api/messages?timestamp=${encodeURIComponent(timestamp)}&sender=${encodeURIComponent(sender)}`;
            const res = await fetch(url, { method: 'DELETE' });
            if (res.ok) {
                setMessages(prev => prev.filter(m => m.timestamp !== timestamp));
            }
        } catch (err) {
            console.error("Delete message error:", err);
        }
    };

    const deleteRoom = async (roomId) => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/rooms/${roomId}`, { method: 'DELETE' });
            if (res.ok) {
                setJoinedRooms(prev => prev.filter(r => r.id !== roomId));
                if (currentChat.target === roomId) {
                    setCurrentChat({ target: null, type: 'ROOM' });
                }
            }
        } catch (err) {
            console.error("Delete room error:", err);
        }
    };

    const forceEndMeeting = async (roomId) => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/rooms/${roomId}/meeting/end`, { method: 'POST' });
            if (res.ok) {
                // Locally end it
                setJoinedRooms(prev => prev.map(r => 
                    r.id === roomId ? { ...r, meetingActive: false, meetingStartTime: null, invitedUsernames: [], initiatorUsername: null } : r
                ));
                // Signal everyone else synchronously
                if (clientRef.current && isConnected) {
                    const magicMsg = {
                        sender: currentUser.username,
                        content: `__SIGNAL__:MEETING_END:${roomId}`,
                        type: 'CHAT',
                        timestamp: new Date().toISOString()
                    };
                    clientRef.current.send(`/app/chat/${roomId}`, {}, JSON.stringify(magicMsg));
                }
            }
        } catch (err) {
             console.error("Force end meeting error:", err);
        }
    };

    const login = async (username, password) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const user = await response.json();
                localStorage.setItem('currentUser', JSON.stringify(user));
                setCurrentUser(user);
                connectToServer(user.username);
                return { success: true };
            } else {
                const error = await response.text();
                return { success: false, error };
            }
        } catch (err) {
            return { success: false, error: "Cannot connect to server." };
        }
    };

    const signup = async (username, email, password) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            if (response.ok) {
                return { success: true };
            } else {
                const error = await response.text();
                return { success: false, error };
            }
        } catch (err) {
            return { success: false, error: "Cannot connect to server." };
        }
    };

    const updateProfile = async (profileData) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/update-profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...profileData, username: currentUser.username })
            });

            if (response.ok) {
                const updatedUser = await response.json();
                setCurrentUser(updatedUser);
                localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                return { success: true, user: updatedUser };
            } else {
                const error = await response.text();
                return { success: false, error };
            }
        } catch (err) {
            return { success: false, error: "Cannot connect to server." };
        }
    };

    const logout = async () => {
        if (currentUser) {
            try {
                await fetch(`${BACKEND_URL}/api/auth/logout?username=${currentUser.username}`, { method: 'POST' });
            } catch (err) {
                console.error("Logout error:", err);
            }
        }
        localStorage.removeItem('currentUser');
        if (clientRef.current && clientRef.current.connected) {
            try {
                clientRef.current.disconnect();
            } catch (e) {
                console.warn("Logout disconnect error:", e);
            }
            clientRef.current = null;
        }
        setCurrentUser(null);
        setIsConnected(false);
        setStompClient(null);
        setFriends([]);
        setJoinedRooms([]);
        setCurrentChat({ target: null, type: 'ROOM' });
        setMessages([]);
        resetCallState();
    };

    return (
        <ChatContext.Provider value={{
            currentUser,
            friends,
            joinedRooms,
            currentChat,
            messages,
            isConnected,
            callState,
            login,
            signup,
            logout,
            selectChat,
            sendMessage,
            sendFile,
            startCall,
            acceptCall,
            declineCall,
            hangUp,
            fetchFriends,
            fetchRooms,
            isSidebarOpen,
            setIsSidebarOpen,
            theme,
            toggleTheme: () => setTheme(prev => prev === 'dark' ? 'light' : 'dark'),
            unreadCounts,
            clearChat,
            deleteMessage,
            deleteRoom,
            forceEndMeeting,
            toggleAi,
            sendReaction,
            markMessageAsRead,
            toggleMute,
            toggleVideo,
            customRingtone,
            updateRingtone,
            isCompressingRingtone,
            readReceipts,
            toggleReadReceipts,
            activeTab,
            setActiveTab,
            isSettingsOpen,
            setIsSettingsOpen,
            isProfileOpen,
            setIsProfileOpen,
            updateProfile,
            starredMessages,
            toggleStar,
            togglePin,
            replyTo,
            setReplyTo,
            callHistory,
            clearCallHistory,
            recentChats,
            addToRecent,
            startGroupMeeting, joinGroupMeeting, leaveMeeting, endMeetingForAll
        }}>
            {children}
        </ChatContext.Provider>
    );
};
