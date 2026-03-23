import { useState, useEffect, useCallback, useRef } from 'react';

let userInteracted = false;
if (typeof window !== 'undefined') {
    const markInteracted = () => {
        userInteracted = true;
        ['click', 'touchstart', 'keydown'].forEach(event => 
            window.removeEventListener(event, markInteracted)
        );
    };
    ['click', 'touchstart', 'keydown'].forEach(event => 
        window.addEventListener(event, markInteracted, { once: true })
    );
}

const rtcConfig = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
    ]
};

export const useWebRTC = (currentUser, stompClient, customRingtone, onSignal, onCallLog, BACKEND_URL, onRoomUpdate) => {
    const [callState, setCallState] = useState({
        isActive: false,
        isIncoming: false,
        caller: null,
        localStream: null,
        remoteStream: null, // Legacy/1-to-1
        remoteStreams: {},  // Group Meetings: { username: MediaStream }
        type: 'video',
        isMuted: false,
        isVideoOff: false,
        isInitiator: false,
        isGroupMeeting: false,
        isInCall: false,
        meetingRoomId: null
    });

    const pcs = useRef({}); // { username: RTCPeerConnection }
    const iceCandidatesQueue = useRef({}); // { username: [candidates] }
    const pendingOffer = useRef(null);
    const ringtoneRef = useRef(null);
    const dialToneRef = useRef(null);
    const currentAudioUrl = useRef(null);

    const stopSounds = useCallback(() => {
        if (ringtoneRef.current) {
            ringtoneRef.current.pause();
            ringtoneRef.current.currentTime = 0;
        }
        if (dialToneRef.current) {
            dialToneRef.current.pause();
            dialToneRef.current.currentTime = 0;
        }
        if ("vibrate" in navigator && userInteracted) {
            try {
                navigator.vibrate(0);
            } catch (e) {
                // Ignore interventions
            }
        }
    }, []);

    const resetCallState = useCallback(() => {
        stopSounds();
        Object.values(pcs.current).forEach(pc => pc.close());
        pcs.current = {};
        
        if (callState.localStream) {
            callState.localStream.getTracks().forEach(track => track.stop());
        }
        setCallState({
            isActive: false,
            isIncoming: false,
            caller: null,
            localStream: null,
            remoteStream: null,
            remoteStreams: {},
            type: 'video',
            isMuted: false,
            isVideoOff: false,
            isInitiator: false,
            isGroupMeeting: false,
            isInCall: false,
            meetingRoomId: null
        });
        iceCandidatesQueue.current = {};
        pendingOffer.current = null;
    }, [callState.localStream, stopSounds]);

    // 1. Persistent Audio Object Initialization & Diagnostics
    useEffect(() => {
        if (!ringtoneRef.current) {
            const audio = new Audio();
            audio.loop = true;
            audio.preload = "auto";
            audio.volume = 1.0;
            audio.muted = false;
            ringtoneRef.current = audio;
        }
        if (!dialToneRef.current) {
            const audio = new Audio();
            audio.loop = true;
            audio.preload = "auto";
            audio.volume = 1.0;
            audio.muted = false;
            dialToneRef.current = audio;
        }

        const standardDialtone = 'https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3';
        const defaultRingtone = 'https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3';
        const ringtoneUrl = customRingtone || defaultRingtone;

        if (ringtoneRef.current.src !== ringtoneUrl) {
            ringtoneRef.current.src = ringtoneUrl;
            ringtoneRef.current.load();
        }
        if (dialToneRef.current.src !== standardDialtone) {
            dialToneRef.current.src = standardDialtone;
            dialToneRef.current.load();
        }
    }, [customRingtone]);

    // 2. Sticky Playback Control Effect (For 1-to-1 Calls)
    useEffect(() => {
        if (callState.isGroupMeeting) return; // No ringtones for group meetings

        const ringtone = ringtoneRef.current;
        const dialtone = dialToneRef.current;
        if (!ringtone || !dialtone) return;

        if (callState.isIncoming) {
            if (ringtone.paused) {
                const playTimeout = setTimeout(() => {
                    ringtone.play().catch(e => console.warn("[WebRTC] Ringtone blocked:", e));
                }, 250);
                if ("vibrate" in navigator && userInteracted) {
                    try { navigator.vibrate([500, 500, 500, 500, 500]); } catch (e) { }
                }
                return () => clearTimeout(playTimeout);
            }
        } else if (callState.isInitiator && callState.isActive && !callState.remoteStream) {
            if (dialtone.paused) {
                dialtone.play().catch(e => console.warn("[WebRTC] Dialtone blocked:", e));
            }
        } else {
            const shouldStop = !callState.isIncoming && (!callState.isInitiator || !callState.isActive || callState.remoteStream);
            if (shouldStop) stopSounds();
        }
    }, [callState.isIncoming, callState.isInitiator, callState.isActive, callState.remoteStream, callState.isGroupMeeting, stopSounds]);

    const toggleMute = useCallback(() => {
        if (callState.localStream) {
            const audioTrack = callState.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setCallState(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
            }
        }
    }, [callState.localStream]);

    const toggleVideo = useCallback(() => {
        if (callState.localStream) {
            const videoTrack = callState.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setCallState(prev => ({ ...prev, isVideoOff: !videoTrack.enabled }));
            }
        }
    }, [callState.localStream]);

    const sendSignal = useCallback((signal) => {
        if (!stompClient) return;
        signal.sender = currentUser.username;
        if (callState.isGroupMeeting) {
            // Signal to room topic
            stompClient.send(`/app/chat/${callState.meetingRoomId}`, {}, JSON.stringify(signal));
        } else {
            // signal to private topic
            stompClient.send("/app/signal", {}, JSON.stringify(signal));
        }
    }, [stompClient, currentUser, callState.isGroupMeeting, callState.meetingRoomId]);

    const flushIceCandidates = (pc, target) => {
        const queue = iceCandidatesQueue.current[target] || [];
        console.log(`[WebRTC] Flushing ${queue.length} ICE candidates for ${target}`);
        queue.forEach(candidate => {
            pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(err =>
                console.error("[WebRTC] Error adding queued ICE candidate:", err)
            );
        });
        iceCandidatesQueue.current[target] = [];
    };

    const createPeerConnection = useCallback((target, localStream) => {
        console.log(`[WebRTC] Creating PeerConnection for: ${target}`);
        const pc = new RTCPeerConnection(rtcConfig);
        pcs.current[target] = pc;

        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

        pc.ontrack = (event) => {
            console.log(`[WebRTC] Received remote track from ${target}: ${event.track.kind}`);
            stopSounds();
            const stream = event.streams[0] || new MediaStream([event.track]);
            
            if (callState.isGroupMeeting) {
                setCallState(prev => ({
                    ...prev,
                    remoteStreams: { ...prev.remoteStreams, [target]: stream }
                }));
            } else {
                setCallState(prev => ({ ...prev, remoteStream: stream }));
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignal({ 
                    type: "ice-candidate", 
                    data: event.candidate, 
                    recipient: target,
                    meetingRoomId: callState.meetingRoomId
                });
            }
        };

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                console.log(`[WebRTC] Connection with ${target} lost`);
                if (callState.isGroupMeeting) {
                    setCallState(prev => {
                        const newStreams = { ...prev.remoteStreams };
                        delete newStreams[target];
                        return { ...prev, remoteStreams: newStreams };
                    });
                    delete pcs.current[target];
                } else {
                    resetCallState();
                }
            }
        };

        return pc;
    }, [sendSignal, stopSounds, resetCallState, callState.isGroupMeeting, callState.meetingRoomId]);

    const setupLocalStream = async (type) => {
        try {
            const constraints = {
                video: type === 'video' ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false,
                audio: true
            };
            return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (error) {
            console.error("[WebRTC] Media error:", error);
            alert("Could not access camera/microphone.");
            return null;
        }
    };

    const startCall = async (target, type) => {
        const stream = await setupLocalStream(type);
        if (!stream) return;
        setCallState(prev => ({ ...prev, isActive: true, isInitiator: true, localStream: stream, type, caller: target }));
        const pc = createPeerConnection(target, stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal({ type: "offer", data: offer, recipient: target, callType: type });
    };

    const acceptCall = async () => {
        const stream = await setupLocalStream(callState.type);
        if (!stream) return;
        setCallState(prev => ({ ...prev, isActive: true, isIncoming: false, localStream: stream }));
        const pc = createPeerConnection(callState.caller, stream);
        await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer.current));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal({ type: "answer", data: answer, recipient: callState.caller });
        flushIceCandidates(pc, callState.caller);
    };

    const declineCall = () => {
        sendSignal({ type: "decline", recipient: callState.caller });
        resetCallState();
    };

    const startGroupMeeting = async (roomId, invitedUsernames = []) => {
        console.log(`[WebRTC] Starting Private Group Meeting in Room: ${roomId} with ${invitedUsernames.length} invites`);
        const stream = await setupLocalStream('video');
        if (!stream) return;

        setCallState(prev => ({
            ...prev,
            isActive: true,
            isInCall: true,
            isInitiator: true,
            isGroupMeeting: true,
            meetingRoomId: roomId,
            localStream: stream
        }));

        try {
            await fetch(`${BACKEND_URL}/api/rooms/${roomId}/meeting/start`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(invitedUsernames)
            });
        } catch (err) {
            console.error("Error starting meeting on backend:", err);
        }

        // Send signal to others that meeting is starting, including the invite list
        sendSignal({ 
            type: "CHAT", 
            meetingRoomId: roomId,
            sender: currentUser.username,
            content: `__SIGNAL__:MEETING_START:${roomId}:${invitedUsernames.join(',')}`
        });
    };

    const joinGroupMeeting = async (roomId) => {
        console.log(`[WebRTC] Joining Group Meeting in Room: ${roomId}`);
        const stream = await setupLocalStream('video');
        if (!stream) return;

        setCallState(prev => ({
            ...prev,
            isActive: true,
            isInCall: true,
            isGroupMeeting: true,
            meetingRoomId: roomId,
            localStream: stream
        }));

        // Inform others that I've joined so they can initiate offers to me
        sendSignal({ 
            type: "CHAT", 
            content: `__SIGNAL__:MEETING_JOINED:${roomId}`,
            meetingRoomId: roomId 
        });
    };

    const leaveMeeting = async () => {
        console.log("[WebRTC] Leaving Group Meeting");
        if (callState.isGroupMeeting) {
            sendSignal({ 
                type: "CHAT", 
                content: `__SIGNAL__:MEETING_LEFT:${callState.meetingRoomId}`,
                meetingRoomId: callState.meetingRoomId 
            });
        }
        resetCallState();
    };

    const endMeetingForAll = async () => {
        console.log("[WebRTC] Ending Group Meeting for All");
        if (callState.isGroupMeeting && callState.isInitiator) {
            try {
                await fetch(`${BACKEND_URL}/api/rooms/${callState.meetingRoomId}/meeting/end`, { method: 'POST' });
                sendSignal({ 
                    type: "CHAT", 
                    content: `__SIGNAL__:MEETING_END:${callState.meetingRoomId}`,
                    meetingRoomId: callState.meetingRoomId 
                });
            } catch (err) {
                console.error("Error ending meeting on backend:", err);
            }
        }
        resetCallState();
    };

    const handleSignal = useCallback(async (signal) => {
        const sender = signal.sender;
        if (sender === currentUser.username) return;

        // Handle logical SIGNALS from room messages
        if (signal.content && signal.content.startsWith('__SIGNAL__:')) {
            const parts = signal.content.split(':');
            const sigType = parts[1];
            const roomId = parts[2];

            if (sigType === 'MEETING_START' && !callState.isGroupMeeting) {
                const invitedStr = parts[3] || "";
                const invitedList = invitedStr.split(',').filter(u => u.length > 0);
                
                // My side only logic: Only show/join if I'm in the invite list
                const isInvited = invitedList.includes(currentUser.username);
                if (isInvited) {
                    console.log(`[WebRTC] Meeting started in room ${roomId}. I am invited!`);
                    if (onRoomUpdate) onRoomUpdate();
                }
            }
            if (sigType === 'MEETING_JOINED' && callState.isGroupMeeting && roomId === callState.meetingRoomId) {
                // Someone joined! I (as an existing participant) will offer to them
                console.log(`[WebRTC] New participant ${sender} joined. Initiating offer...`);
                const pc = createPeerConnection(sender, callState.localStream);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                sendSignal({ type: "offer", data: offer, recipient: sender, meetingRoomId: roomId });
            }
            if (sigType === 'MEETING_LEFT' && callState.isGroupMeeting && roomId === callState.meetingRoomId) {
                console.log(`[WebRTC] Participant ${sender} left.`);
                if (pcs.current[sender]) {
                    pcs.current[sender].close();
                    delete pcs.current[sender];
                    setCallState(prev => {
                        const newStreams = { ...prev.remoteStreams };
                        delete newStreams[sender];
                        return { ...prev, remoteStreams: newStreams };
                    });
                }
            }
            if (sigType === 'MEETING_END' && callState.isGroupMeeting && roomId === callState.meetingRoomId) {
                console.log(`[WebRTC] Meeting ended by initiator.`);
                resetCallState();
                if (onRoomUpdate) onRoomUpdate();
            }
            return;
        }

        switch (signal.type) {
            case "offer":
                console.log(`[WebRTC] Handling OFFER from ${sender}`);
                if (callState.isGroupMeeting) {
                    const pc = createPeerConnection(sender, callState.localStream);
                    await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    sendSignal({ type: "answer", data: answer, recipient: sender, meetingRoomId: callState.meetingRoomId });
                    flushIceCandidates(pc, sender);
                } else {
                    pendingOffer.current = signal.data;
                    setCallState(prev => ({ ...prev, isIncoming: true, caller: sender, type: signal.callType || 'video' }));
                }
                break;
            case "answer":
                console.log(`[WebRTC] Handling ANSWER from ${sender}`);
                const pcA = pcs.current[sender];
                if (pcA) {
                    await pcA.setRemoteDescription(new RTCSessionDescription(signal.data));
                    flushIceCandidates(pcA, sender);
                }
                break;
            case "ice-candidate":
                const pcI = pcs.current[sender];
                if (pcI && pcI.remoteDescription) {
                    await pcI.addIceCandidate(new RTCIceCandidate(signal.data));
                } else {
                    if (!iceCandidatesQueue.current[sender]) iceCandidatesQueue.current[sender] = [];
                    iceCandidatesQueue.current[sender].push(signal.data);
                }
                break;
            case "decline":
                alert(`${sender} declined the call.`);
                resetCallState();
                break;
            case "hangup":
                resetCallState();
                break;
        }
    }, [currentUser.username, resetCallState, callState.isGroupMeeting, callState.meetingRoomId, callState.localStream, createPeerConnection, sendSignal]);

    return {
        callState,
        startCall,
        acceptCall,
        declineCall,
        hangUp: (callState.isGroupMeeting ? leaveMeeting : () => {
            sendSignal({ type: "hangup", recipient: callState.caller });
            resetCallState();
        }),
        handleSignal,
        resetCallState,
        toggleMute,
        stopSounds,
        startGroupMeeting,
        joinGroupMeeting,
        leaveMeeting,
        endMeetingForAll
    };
};
