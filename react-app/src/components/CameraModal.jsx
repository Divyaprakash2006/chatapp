import React, { useState, useRef, useEffect } from 'react';

const CameraModal = ({ isOpen, onClose, onCapture }) => {
    const [mode, setMode] = useState('photo'); // 'photo' or 'video'
    const [isRecording, setIsRecording] = useState(false);
    const [capturedMedia, setCapturedMedia] = useState(null); // { blob, url, type }
    const [error, setError] = useState(null);

    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const chunksRef = useRef([]);

    useEffect(() => {
        if (isOpen && !capturedMedia) {
            startCamera();
        }
        return () => stopCamera();
    }, [isOpen, capturedMedia]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' },
                audio: true
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setError(null);
        } catch (err) {
            console.error("Camera access error:", err);
            setError("Could not access camera. Please check permissions.");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const takePhoto = () => {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            setCapturedMedia({ blob, url, type: 'image/jpeg' });
            stopCamera();
        }, 'image/jpeg');
    };

    const startRecording = () => {
        chunksRef.current = [];
        const options = { mimeType: 'video/webm;codecs=vp8,opus' };
        const recorder = new MediaRecorder(streamRef.current, options);

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunksRef.current.push(e.data);
            }
        };

        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            setCapturedMedia({ blob, url, type: 'video/webm' });
            stopCamera();
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleConfirm = () => {
        onCapture(capturedMedia);
        handleClose();
    };

    const handleRetake = () => {
        setCapturedMedia(null);
        setIsRecording(false);
    };

    const handleClose = () => {
        setCapturedMedia(null);
        setIsRecording(false);
        stopCamera();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.95)', zIndex: 2000, position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '500px', height: '100%', maxHeight: '700px', background: '#000', display: 'flex', flexDirection: 'column' }}>

                {/* Header */}
                <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white', zIndex: 10 }}>
                    <button onClick={handleClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>
                        <i className="fas fa-times"></i>
                    </button>
                    <div style={{ fontSize: '1rem', fontWeight: 600 }}>{capturedMedia ? 'Preview' : (mode === 'photo' ? 'Take Photo' : 'Record Video')}</div>
                    <div style={{ width: '24px' }}></div>
                </div>

                {/* Viewport */}
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
                    {!capturedMedia ? (
                        <>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            {error && (
                                <div style={{ position: 'absolute', color: 'white', textAlign: 'center', padding: '20px' }}>
                                    <i className="fas fa-exclamation-triangle fa-2x" style={{ marginBottom: '10px' }}></i>
                                    <p>{error}</p>
                                </div>
                            )}
                        </>
                    ) : (
                        capturedMedia.type.startsWith('image/') ? (
                            <img src={capturedMedia.url} alt="captured" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                            <video src={capturedMedia.url} controls autoPlay loop style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        )
                    )}
                </div>

                {/* Controls */}
                <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', background: 'rgba(0,0,0,0.5)', zIndex: 10 }}>
                    {!capturedMedia ? (
                        <>
                            {/* Mode Switcher */}
                            <div style={{ display: 'flex', gap: '20px', background: 'rgba(255,255,255,0.1)', padding: '4px', borderRadius: '25px', marginBottom: '10px' }}>
                                <button
                                    onClick={() => setMode('photo')}
                                    style={{
                                        padding: '8px 20px',
                                        borderRadius: '20px',
                                        border: 'none',
                                        background: mode === 'photo' ? 'white' : 'transparent',
                                        color: mode === 'photo' ? 'black' : 'white',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >Photo</button>
                                <button
                                    onClick={() => setMode('video')}
                                    style={{
                                        padding: '8px 20px',
                                        borderRadius: '20px',
                                        border: 'none',
                                        background: mode === 'video' ? 'white' : 'transparent',
                                        color: mode === 'video' ? 'black' : 'white',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >Video</button>
                            </div>

                            {/* Capture Button */}
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '4px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                                {mode === 'photo' ? (
                                    <button
                                        onClick={takePhoto}
                                        style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'white', border: 'none', cursor: 'pointer' }}
                                    />
                                ) : (
                                    <button
                                        onClick={isRecording ? stopRecording : startRecording}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            borderRadius: isRecording ? '8px' : '50%',
                                            background: '#ff4b2b',
                                            border: 'none',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    />
                                )}
                            </div>
                            {isRecording && <div style={{ color: '#ff4b2b', fontWeight: 700, animation: 'pulse 1s infinite' }}>REC</div>}
                        </>
                    ) : (
                        <div style={{ display: 'flex', gap: '20px', width: '100%' }}>
                            <button className="md-button btn-capsule btn-dark-capsule" style={{ flex: 1, height: '56px' }} onClick={handleRetake}>Retake</button>
                            <button className="md-button btn-capsule btn-primary-capsule" style={{ flex: 2, height: '56px' }} onClick={handleConfirm}>Send</button>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default CameraModal;
