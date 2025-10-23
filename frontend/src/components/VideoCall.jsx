// frontend/src/components/VideoCall.jsx
import React, { useEffect, useRef, useState } from 'react';

function VideoCall({ appointment, onClose, socket }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [callStatus, setCallStatus] = useState('connecting');
  const [error, setError] = useState('');
  const [callDuration, setCallDuration] = useState(0);

  const configuration = {
    iceServers: [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
    ]
  };

  useEffect(() => {
    initializeCall();
    return () => {
      closeCall();
    };
  }, []);

  useEffect(() => {
    let interval;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  useEffect(() => {
    if (!socket) return;

    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice_candidate', handleIceCandidate);
    socket.on('user_left', handleUserLeft);

    return () => {
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice_candidate', handleIceCandidate);
      socket.off('user_left', handleUserLeft);
    };
  }, [socket]);

  const initializeCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      peerConnectionRef.current = new RTCPeerConnection(configuration);

      stream.getTracks().forEach(track => {
        peerConnectionRef.current.addTrack(track, stream);
      });

      peerConnectionRef.current.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket?.emit('ice_candidate', appointment.videoCallId, event.candidate);
        }
      };

      peerConnectionRef.current.onconnectionstatechange = () => {
        const state = peerConnectionRef.current?.connectionState;
        if (state === 'connected') {
          setCallStatus('connected');
        } else if (state === 'failed' || state === 'disconnected') {
          setCallStatus('disconnected');
          setTimeout(closeCall, 2000);
        }
      };

      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      socket?.emit('offer', appointment.videoCallId, offer);
    } catch (err) {
      setError('Failed to access camera/microphone: ' + err.message);
      setCallStatus('error');
    }
  };

  const handleOffer = async (offer) => {
    try {
      if (!peerConnectionRef.current) return;
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      socket?.emit('answer', appointment.videoCallId, answer);
    } catch (err) {
      console.error('Error handling offer:', err);
    }
  };

  const handleAnswer = async (answer) => {
    try {
      if (!peerConnectionRef.current) return;
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error('Error handling answer:', err);
    }
  };

  const handleIceCandidate = async (candidate) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      console.error('Error adding ICE candidate:', err);
    }
  };

  const handleUserLeft = () => {
    setCallStatus('disconnected');
    setTimeout(closeCall, 2000);
  };

  const toggleVideo = () => {
    const stream = localVideoRef.current?.srcObject;
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleAudio = () => {
    const stream = localVideoRef.current?.srcObject;
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const closeCall = () => {
    const stream = localVideoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    socket?.emit('user_left', appointment.videoCallId);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="w-full h-full flex flex-col">
        {/* Header */}
        <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Video Call</h2>
            <p className="text-sm text-gray-400">
              {appointment.patientName} • {appointment.doctorName}
            </p>
            <div className="flex items-center gap-4 mt-2">
              <p className={`text-xs font-semibold ${
                callStatus === 'connected' ? 'text-green-400' :
                callStatus === 'connecting' ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {callStatus === 'connected' ? '● Connected' :
                 callStatus === 'connecting' ? '● Connecting...' :
                 '● Disconnected'}
              </p>
              {callStatus === 'connected' && (
                <p className="text-xs text-gray-400">Duration: {formatDuration(callDuration)}</p>
              )}
            </div>
          </div>
          <button
            onClick={closeCall}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition"
          >
            End Call
          </button>
        </div>

        {/* Video Container */}
        <div className="flex-1 flex gap-4 p-4 bg-black overflow-hidden">
          {/* Remote Video */}
          <div className="flex-1 relative bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 bg-black bg-opacity-50 px-3 py-1 rounded text-white text-xs font-semibold">
              {appointment.patientName}
            </div>
            {callStatus !== 'connected' && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-white">{callStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Local Video */}
          <div className="w-48 relative bg-gray-800 rounded-lg overflow-hidden border-4 border-gray-700 shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 px-2 py-1 rounded text-white text-xs font-semibold">
              You
            </div>
            {!isVideoEnabled && (
              <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-900 text-white p-6 flex justify-center gap-4">
          <button
            onClick={toggleVideo}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
              isVideoEnabled
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {isVideoEnabled ? 'Camera On' : 'Camera Off'}
          </button>

          <button
            onClick={toggleAudio}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
              isAudioEnabled
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
            title={isAudioEnabled ? 'Mute' : 'Unmute'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            {isAudioEnabled ? 'Mic On' : 'Mic Off'}
          </button>

          <button
            onClick={closeCall}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition"
            title="End the call"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            End Call
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-600 text-white p-4 text-center">
            <p className="font-semibold">Connection Error</p>
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default VideoCall;