// frontend/src/components/VideoCall.jsx (Complete Implementation)
import React, { useState, useEffect, useRef } from 'react';
import websocketService from '../services/websocket';
import { useAuth } from '../contexts/AuthContext';

function VideoCall({ appointmentId, otherUserId, otherUserName, isDoctor, onCallEnd }) {
  const { user } = useAuth();
  const [callStatus, setCallStatus] = useState('connecting'); // connecting, ringing, active, ended
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const callStartTimeRef = useRef(null);
  const durationIntervalRef = useRef(null);

  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    initializeCall();

    return () => {
      cleanup();
    };
  }, []);

  const initializeCall = async () => {
    try {
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      peerConnectionRef.current = new RTCPeerConnection(configuration);

      // Add local tracks to peer connection
      stream.getTracks().forEach(track => {
        peerConnectionRef.current.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnectionRef.current.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          websocketService.sendICECandidate({
            appointmentId,
            candidate: event.candidate,
            senderId: user.id
          });
        }
      };

      // Handle connection state changes
      peerConnectionRef.current.onconnectionstatechange = () => {
        const state = peerConnectionRef.current.connectionState;
        console.log('Connection state:', state);
        
        if (state === 'connected') {
          setCallStatus('active');
          startCallTimer();
        } else if (state === 'disconnected' || state === 'failed') {
          handleCallEnd();
        }
      };

      // Set up WebSocket listeners
      setupWebSocketListeners();

      // If doctor, initiate call
      if (isDoctor) {
        await initiateCall();
      } else {
        setCallStatus('ringing');
      }

    } catch (err) {
      console.error('Error initializing call:', err);
      setError('Failed to access camera/microphone. Please check permissions.');
    }
  };

  const setupWebSocketListeners = () => {
    websocketService.onCallIncoming(handleIncomingCall);
    websocketService.onCallAnswered(handleCallAnswered);
    websocketService.onICECandidate(handleICECandidate);
    websocketService.onCallRejected(handleCallRejected);
    websocketService.onCallEnded(handleCallEnd);
  };

  const initiateCall = async () => {
    try {
      if (!peerConnectionRef.current) {
        throw new Error('Peer connection not initialized');
      }
      
      const offer = await peerConnectionRef.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      await peerConnectionRef.current.setLocalDescription(offer);

      websocketService.initiateCall({
        appointmentId,
        callerId: user.id,
        callerName: user.name,
        receiverId: otherUserId,
        offer: {
          type: offer.type,
          sdp: offer.sdp
        }
      });

      setCallStatus('ringing');
    } catch (err) {
      console.error('Error initiating call:', err);
      setError('Failed to initiate call: ' + err.message);
    }
  };

  const handleIncomingCall = async (data) => {
    if (data.appointmentId === appointmentId && peerConnectionRef.current) {
      try {
        // Create RTCSessionDescription object properly
        const offer = new RTCSessionDescription({
          type: 'offer',
          sdp: data.offer.sdp || data.offer
        });
        
        await peerConnectionRef.current.setRemoteDescription(offer);

        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);

        websocketService.answerCall({
          appointmentId,
          answer: answer
        });

        setCallStatus('active');
        startCallTimer();
      } catch (err) {
        console.error('Error handling incoming call:', err);
        setError('Failed to answer call: ' + err.message);
      }
    }
  };

  const handleCallAnswered = async (data) => {
    if (data.appointmentId === appointmentId && peerConnectionRef.current) {
      try {
        const answer = new RTCSessionDescription({
          type: 'answer',
          sdp: data.answer.sdp || data.answer
        });
        
        await peerConnectionRef.current.setRemoteDescription(answer);
      } catch (err) {
        console.error('Error handling call answer:', err);
        setError('Failed to establish connection: ' + err.message);
      }
    }
  };

  const handleICECandidate = async (data) => {
    if (data.appointmentId === appointmentId && data.candidate && peerConnectionRef.current) {
      try {
        const candidate = new RTCIceCandidate({
          candidate: data.candidate.candidate || data.candidate.candidate,
          sdpMLineIndex: data.candidate.sdpMLineIndex || 0,
          sdpMid: data.candidate.sdpMid || 'video'
        });
        
        await peerConnectionRef.current.addIceCandidate(candidate);
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    }
  };

  const handleCallRejected = (data) => {
    if (data.appointmentId === appointmentId) {
      setError('Call was rejected');
      setTimeout(() => handleCallEnd(), 2000);
    }
  };

  const startCallTimer = () => {
    callStartTimeRef.current = Date.now();
    durationIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
      setCallDuration(elapsed);
    }, 1000);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const handleCallEnd = () => {
    setCallStatus('ended');
    websocketService.endCall({
      appointmentId,
      userId: user.id
    });
    cleanup();
    setTimeout(() => {
      if (onCallEnd) onCallEnd();
    }, 1000);
  };

  const cleanup = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    websocketService.off('call:incoming', handleIncomingCall);
    websocketService.off('call:answered', handleCallAnswered);
    websocketService.off('call:ice-candidate', handleICECandidate);
    websocketService.off('call:rejected', handleCallRejected);
    websocketService.off('call:ended', handleCallEnd);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
            {otherUserName.charAt(0)}
          </div>
          <div>
            <p className="text-white font-semibold">{otherUserName}</p>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                callStatus === 'active' ? 'bg-green-500 animate-pulse' :
                callStatus === 'ringing' ? 'bg-yellow-500 animate-pulse' :
                'bg-gray-500'
              }`}></div>
              <p className="text-gray-300 text-sm">
                {callStatus === 'active' ? formatDuration(callDuration) :
                 callStatus === 'ringing' ? 'Ringing...' :
                 callStatus === 'connecting' ? 'Connecting...' :
                 'Call ended'}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={handleCallEnd}
          className="text-gray-300 hover:text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative bg-black">
        {/* Remote Video (Full Screen) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Local Video (Picture in Picture) */}
        <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden shadow-2xl border-2 border-gray-600">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {isVideoOff && (
            <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
              <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl font-bold">{user.name.charAt(0)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-500 text-white px-6 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Call Status Overlay */}
        {callStatus !== 'active' && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-4xl font-bold">{otherUserName.charAt(0)}</span>
              </div>
              <p className="text-white text-2xl font-semibold mb-2">{otherUserName}</p>
              <p className="text-gray-300">
                {callStatus === 'connecting' && 'Connecting...'}
                {callStatus === 'ringing' && 'Ringing...'}
                {callStatus === 'ended' && 'Call ended'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-6">
        <div className="flex items-center justify-center space-x-4">
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isMuted ? (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>

          {/* Video Toggle Button */}
          <button
            onClick={toggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isVideoOff ? (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>

          {/* End Call Button */}
          <button
            onClick={handleCallEnd}
            className="w-16 h-16 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-all shadow-lg"
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default VideoCall;