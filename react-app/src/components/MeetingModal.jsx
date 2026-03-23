import React, { useEffect, useRef } from 'react';


const MeetingModal = ({ 
    isOpen, 
    onClose, 
    localStream, 
    remoteStreams, 
    isMuted, 
    isVideoOff, 
    onToggleMute, 
    onToggleVideo,
    isInitiator,
    onEndMeeting 
}) => {
    const localVideoRef = useRef(null);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    if (!isOpen) return null;

    const participants = Object.entries(remoteStreams);
    const totalParticipants = participants.length + 1;

    // Determine grid columns based on participant count
    const getGridTemplate = () => {
        if (totalParticipants === 1) return '1fr';
        if (totalParticipants === 2) return '1fr 1fr';
        if (totalParticipants <= 4) return '1fr 1fr';
        return '1fr 1fr 1fr';
    };

    return (
        <div className="meeting-overlay">
            <div className="meeting-container">
                <div className="meeting-header">
                    <h3>Group Meeting</h3>
                    <div className="meeting-timer">Live</div>
                </div>

                <div className="video-grid" style={{ gridTemplateColumns: getGridTemplate() }}>
                    {/* Local Video */}
                    <div className="video-card local">
                        <video ref={localVideoRef} autoPlay playsInline muted />
                        <div className="participant-name">You {isMuted && <i className="fas fa-microphone-slash"></i>}</div>
                        {isVideoOff && <div className="video-off-placeholder"><i className="fas fa-video-slash"></i></div>}
                    </div>

                    {/* Remote Videos */}
                    {participants.map(([username, stream]) => (
                        <RemoteVideo key={username} username={username} stream={stream} />
                    ))}
                </div>

                <div className="meeting-controls">
                    <div className="control-group">
                        <button className={`control-btn ${isMuted ? 'muted' : ''}`} onClick={onToggleMute} title={isMuted ? "Unmute" : "Mute"}>
                            <i className={`fas ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
                        </button>
                        <span className="control-label">{isMuted ? 'Unmute' : 'Mute'}</span>
                    </div>

                    <div className="control-group">
                        <button className={`control-btn ${isVideoOff ? 'off' : ''}`} onClick={onToggleVideo} title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}>
                            <i className={`fas ${isVideoOff ? 'fa-video-slash' : 'fa-video'}`}></i>
                        </button>
                        <span className="control-label">{isVideoOff ? 'Camera On' : 'Camera Off'}</span>
                    </div>
                    
                    <div className="control-group">
                        <button className="control-btn leave" onClick={onClose} title="Leave Meeting">
                            <i className="fas fa-sign-out-alt"></i>
                        </button>
                        <span className="control-label">Leave</span>
                    </div>

                    {isInitiator && (
                        <>
                            <div className="control-group">
                                <button className="control-btn stop-red" onClick={onEndMeeting} title="Stop Meeting">
                                    <i className="fas fa-hand-paper"></i>
                                </button>
                                <span className="control-label">Stop</span>
                            </div>
                            <div className="control-group">
                                <button className="control-btn cancel-dark-red" onClick={onEndMeeting} title="Cancel Meeting">
                                    <i className="fas fa-times-circle"></i>
                                </button>
                                <span className="control-label">Cancel</span>
                            </div>
                            <div className="control-group">
                                <button className="control-btn end-final" onClick={onEndMeeting} title="End Meeting for All">
                                    <i className="fas fa-stop-circle"></i>
                                </button>
                                <span className="control-label">End</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <style>{`
                .meeting-overlay {
                    position: fixed;
                    inset: 0;
                    background: #1a1a1a;
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-family: 'Inter', sans-serif;
                }
                .meeting-container {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    padding: 24px;
                    gap: 20px;
                }
                .meeting-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0 10px;
                }
                .meeting-timer {
                    background: #ea4335;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    box-shadow: 0 4px 10px rgba(234, 67, 53, 0.3);
                }
                .video-grid {
                    flex: 1;
                    display: grid;
                    gap: 16px;
                    width: 100%;
                    max-width: 1200px;
                    margin: 0 auto;
                    overflow: hidden; /* Prevent grid from pushing controls off */
                }
                .video-card {
                    position: relative;
                    background: #121212;
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 24px;
                    overflow: hidden;
                    aspect-ratio: 16/9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 12px 30px rgba(0,0,0,0.5);
                    transition: transform 0.3s ease;
                }
                .video-card:hover {
                    transform: translateY(-4px);
                    border-color: rgba(255,255,255,0.1);
                }
                .video-card video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .participant-name {
                    position: absolute;
                    bottom: 16px;
                    left: 16px;
                    background: rgba(0,0,0,0.6);
                    padding: 6px 14px;
                    border-radius: 12px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    backdrop-filter: blur(10px);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    z-index: 5;
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .video-off-placeholder {
                    position: absolute;
                    inset: 0;
                    background: #1e1e1e;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 4rem;
                    opacity: 0.3;
                    color: white;
                }
                .meeting-controls {
                    display: flex;
                    justify-content: center;
                    align-items: flex-end;
                    gap: 24px;
                    padding: 20px 40px 40px;
                    background: linear-gradient(transparent, rgba(0,0,0,0.8));
                    z-index: 10;
                }
                .control-group {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                }
                .control-label {
                    font-size: 0.65rem;
                    font-weight: 700;
                    opacity: 0.7;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .control-btn {
                    width: 52px;
                    height: 52px;
                    border-radius: 16px;
                    border: none;
                    background: rgba(255,255,255,0.1);
                    color: white;
                    font-size: 1.1rem;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(10px);
                }
                .control-btn:hover {
                    background: rgba(255,255,255,0.2);
                    transform: translateY(-4px);
                    box-shadow: 0 8px 20px rgba(0,0,0,0.3);
                }
                .control-btn.muted, .control-btn.off {
                    background: #ea4335;
                    box-shadow: 0 4px 12px rgba(234, 67, 53, 0.3);
                }
                .control-btn.leave {
                    background: #3c4043;
                }
                .control-btn.leave:hover {
                    background: #5f6368;
                }
                .control-btn.stop-red {
                    background: #ef4444; /* Stop button */
                }
                .control-btn.cancel-dark-red {
                    background: #dc2626; /* Cancel button */
                }
                .control-btn.end-final {
                    background: #991b1b; /* End button - dark red */
                    box-shadow: 0 4px 15px rgba(153, 27, 27, 0.4);
                }
                .control-btn.end-final:hover {
                    background: #7f1d1d;
                }
            `}</style>
        </div>
    );
};

const RemoteVideo = ({ username, stream }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="video-card remote">
            <video ref={videoRef} autoPlay playsInline />
            <div className="participant-name">{username}</div>
        </div>
    );
};

export default MeetingModal;
