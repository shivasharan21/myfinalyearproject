// frontend/src/components/VideoCall.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import websocketService from '../services/websocket';

function VideoCall({ appointmentId, otherUserId, otherUserName, isDoctor, onCallEnd }) {
  const { user } = useAuth();
  const [callState, setCallState] = useState('idle');
  const [error, setError] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [debugInfo, setDebugInfo] = useState('');
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const callTimerRef = useRef(null);
  const handlersRef = useRef({});
  const iceCandidateQueueRef = useRef([]);

  const iceServers = {
    iceServers: [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
    ]
  };

  const addDebugInfo = (msg) => {
    console.log('[DEBUG]', msg);
    setDebugInfo(prev => prev + '\n' + msg);
  };

  const initializeMedia = async () => {
    try {
      addDebugInfo('Requesting media access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      
      addDebugInfo(`✓ Media stream acquired. Video: ${stream.getVideoTracks().length}, Audio: ${stream.getAudioTracks().length}`);
      
      localStreamRef.current = stream;
      
      // Set local video with retry logic
      const setLocalVideoStream = () => {
        if (localVideoRef.current) {
          addDebugInfo('Setting local video stream on ref...');
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(e => addDebugInfo('⚠ Local video play error: ' + e.message));
          addDebugInfo('✓ Local video stream set');
        } else {
          addDebugInfo('⚠ Local video ref not ready, retrying...');
          setTimeout(setLocalVideoStream, 100);
        }
      };
      
      setLocalVideoStream();
      
      return stream;
    } catch (error) {
      const errorMsg = 'Failed to access camera/microphone: ' + error.message;
      addDebugInfo('✗ ' + errorMsg);
      setError(errorMsg);
      return null;
    }
  };

  const createPeerConnection = async (stream) => {
    try {
      addDebugInfo('Creating RTCPeerConnection...');
      const peerConnection = new RTCPeerConnection(iceServers);
      peerConnectionRef.current = peerConnection;

      if (stream) {
        stream.getTracks().forEach((track, index) => {
          addDebugInfo(`Adding ${track.kind} track (${index})`);
          peerConnection.addTrack(track, stream);
        });
      }

      peerConnection.ontrack = (event) => {
        addDebugInfo(`✓ Remote track received: ${event.track.kind}, streams: ${event.streams.length}`);
        
        try {
          if (event.streams && event.streams.length > 0) {
            const remoteStream = event.streams[0];
            addDebugInfo(`Stream available with ${remoteStream.getTracks().length} tracks`);
            
            // Use a direct approach without ref
            const setRemoteStream = () => {
              if (remoteVideoRef.current) {
                addDebugInfo(`Setting remote video stream on ref`);
                remoteVideoRef.current.srcObject = remoteStream;
                remoteVideoRef.current.play().catch(e => addDebugInfo('⚠ Play error: ' + e.message));
              } else {
                addDebugInfo('⚠ remoteVideoRef.current is null, retrying...');
                setTimeout(setRemoteStream, 100);
              }
            };
            
            setRemoteStream();
          } else {
            addDebugInfo('⚠ No streams in ontrack event');
          }
        } catch (err) {
          addDebugInfo('✗ Error in ontrack handler: ' + err.message);
        }
      };

      peerConnection.onconnectionstatechange = () => {
        addDebugInfo(`Connection state changed: ${peerConnection.connectionState}`);
        if (peerConnection.connectionState === 'failed' || 
            peerConnection.connectionState === 'disconnected') {
          addDebugInfo('✗ Connection failed or disconnected');
          setError('Connection lost');
          endCall();
        }
      };

      peerConnection.oniceconnectionstatechange = () => {
        addDebugInfo(`ICE connection state: ${peerConnection.iceConnectionState}`);
      };

      peerConnection.onicegatheringstatechange = () => {
        addDebugInfo(`ICE gathering state: ${peerConnection.iceGatheringState}`);
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          addDebugInfo(`Sending ICE candidate: ${event.candidate.candidate.substring(0, 50)}...`);
          websocketService.emit('call:ice-candidate', {
            appointmentId,
            candidate: event.candidate,
            senderId: user.id
          });
        } else {
          addDebugInfo('✓ All ICE candidates sent');
        }
      };

      // Process any queued ICE candidates
      addDebugInfo(`Processing ${iceCandidateQueueRef.current.length} queued ICE candidates`);
      while (iceCandidateQueueRef.current.length > 0) {
        const queuedCandidate = iceCandidateQueueRef.current.shift();
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(queuedCandidate));
          addDebugInfo(`✓ Added queued ICE candidate`);
        } catch (error) {
          addDebugInfo(`⚠ Failed to add queued candidate: ${error.message}`);
        }
      }

      return peerConnection;
    } catch (error) {
      const errorMsg = 'Failed to create peer connection: ' + error.message;
      addDebugInfo('✗ ' + errorMsg);
      setError(errorMsg);
      return null;
    }
  };

  const initiateCall = async () => {
    try {
      addDebugInfo(`>>> Initiating call to ${otherUserName} (${otherUserId})`);
      setCallState('ringing');
      
      const stream = await initializeMedia();
      if (!stream) {
        addDebugInfo('✗ Failed to get local media');
        return;
      }

      const peerConnection = await createPeerConnection(stream);
      if (!peerConnection) {
        addDebugInfo('✗ Failed to create peer connection');
        return;
      }

      addDebugInfo('Creating offer...');
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      addDebugInfo('Setting local description...');
      await peerConnection.setLocalDescription(offer);

      addDebugInfo(`Sending call:initiate event to ${otherUserId}`);
      websocketService.emit('call:initiate', {
        appointmentId,
        callerId: user.id,
        callerName: user.name,
        receiverId: otherUserId,
        offer: offer
      });
      
      addDebugInfo('✓ Offer sent, waiting for answer...');
    } catch (error) {
      const errorMsg = 'Failed to initiate call: ' + error.message;
      addDebugInfo('✗ ' + errorMsg);
      setError(errorMsg);
    }
  };

  const handleIncomingCall = async (data) => {
    try {
      addDebugInfo(`>>> Received incoming call from ${data.callerName} (${data.callerId})`);
      const { offer } = data;
      setCallState('ringing');

      const stream = await initializeMedia();
      if (!stream) {
        addDebugInfo('✗ Failed to get local media');
        return;
      }

      const peerConnection = await createPeerConnection(stream);
      if (!peerConnection) {
        addDebugInfo('✗ Failed to create peer connection');
        return;
      }

      addDebugInfo('Setting remote description from offer...');
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      addDebugInfo('Creating answer...');
      const answer = await peerConnection.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      addDebugInfo('Setting local description for answer...');
      await peerConnection.setLocalDescription(answer);

      addDebugInfo(`Sending call:answer event`);
      websocketService.emit('call:answer', {
        appointmentId,
        answer: answer
      });
      
      addDebugInfo('✓ Answer sent');
    } catch (error) {
      const errorMsg = 'Failed to handle incoming call: ' + error.message;
      addDebugInfo('✗ ' + errorMsg);
      setError(errorMsg);
    }
  };

  const handleCallAnswered = async (data) => {
    try {
      addDebugInfo('>>> Received call answered event');
      const { answer } = data;
      
      if (!peerConnectionRef.current) {
        addDebugInfo('✗ No peer connection exists');
        return;
      }

      addDebugInfo('Setting remote description from answer...');
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
      
      addDebugInfo('✓ Answer processed - transitioning to active state');
      setCallState('active');
      addDebugInfo('✓ Call state set to active');
      startCallTimer();
    } catch (error) {
      const errorMsg = 'Failed to process answer: ' + error.message;
      addDebugInfo('✗ ' + errorMsg);
      setError(errorMsg);
    }
  };

  const handleICECandidate = async (data) => {
    try {
      const { candidate } = data;
      
      // If peer connection doesn't exist yet, queue the candidate
      if (!peerConnectionRef.current) {
        addDebugInfo(`Queueing ICE candidate (peer connection not ready yet)`);
        iceCandidateQueueRef.current.push(candidate);
        return;
      }
      
      if (candidate) {
        addDebugInfo(`Adding ICE candidate: ${candidate.candidate.substring(0, 50)}...`);
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      addDebugInfo('⚠ ICE candidate error: ' + error.message);
    }
  };

  const acceptCall = async () => {
    addDebugInfo('>>> User accepted call - transitioning to active state');
    setCallState('active');
    addDebugInfo('✓ Call state set to active');
    startCallTimer();
  };

  const rejectCall = () => {
    addDebugInfo('>>> User rejected call');
    websocketService.emit('call:reject', {
      appointmentId,
      userId: user.id
    });
    cleanup();
    setCallState('idle');
  };

  const endCall = () => {
    addDebugInfo('>>> Ending call');
    websocketService.emit('call:end', {
      appointmentId,
      userId: user.id
    });
    cleanup();
    setCallState('ended');
    if (onCallEnd) {
      setTimeout(onCallEnd, 1000);
    }
  };

  const handleCallEnded = () => {
    addDebugInfo('>>> Remote user ended call');
    cleanup();
    setCallState('ended');
  };

  const cleanup = () => {
    addDebugInfo('Cleaning up resources...');
    
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        addDebugInfo(`Stopped ${track.kind} track`);
      });
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
      addDebugInfo('Peer connection closed');
    }

    setCallDuration(0);
  };

  const startCallTimer = () => {
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
        addDebugInfo(`Audio ${audioTrack.enabled ? 'enabled' : 'disabled'}`);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
        addDebugInfo(`Video ${videoTrack.enabled ? 'enabled' : 'disabled'}`);
      }
    }
  };

  // Setup WebSocket listeners
  useEffect(() => {
    addDebugInfo(`Setting up WebSocket listeners (User: ${user.id}, Role: ${isDoctor ? 'Doctor' : 'Patient'})`);

    const handleIncomingCallWrapper = (data) => handleIncomingCall(data);
    const handleCallAnsweredWrapper = (data) => handleCallAnswered(data);
    const handleICECandidateWrapper = (data) => handleICECandidate(data);
    const handleCallEndedWrapper = () => handleCallEnded();
    const handleCallRejectedWrapper = () => {
      addDebugInfo('✗ Call was rejected');
      setError('Call was rejected');
      cleanup();
      setCallState('idle');
    };

    handlersRef.current = {
      handleIncomingCallWrapper,
      handleCallAnsweredWrapper,
      handleICECandidateWrapper,
      handleCallEndedWrapper,
      handleCallRejectedWrapper
    };

    websocketService.on('call:incoming', handleIncomingCallWrapper);
    websocketService.on('call:answered', handleCallAnsweredWrapper);
    websocketService.on('call:ice-candidate', handleICECandidateWrapper);
    websocketService.on('call:ended', handleCallEndedWrapper);
    websocketService.on('call:rejected', handleCallRejectedWrapper);

    return () => {
      websocketService.off('call:incoming', handleIncomingCallWrapper);
      websocketService.off('call:answered', handleCallAnsweredWrapper);
      websocketService.off('call:ice-candidate', handleICECandidateWrapper);
      websocketService.off('call:ended', handleCallEndedWrapper);
      websocketService.off('call:rejected', handleCallRejectedWrapper);
      addDebugInfo('WebSocket listeners removed');
    };
  }, [user.id, appointmentId, otherUserId, isDoctor]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Ensure video elements are ready
  useEffect(() => {
    if (localVideoRef.current) {
      addDebugInfo('✓ Local video ref is ready');
    }
    if (remoteVideoRef.current) {
      addDebugInfo('✓ Remote video ref is ready');
    }
  }, []);

  // When call becomes active, ensure local stream is set
  useEffect(() => {
    if (callState === 'active' && localStreamRef.current && localVideoRef.current) {
      addDebugInfo('Call is active - ensuring local video stream is set...');
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        addDebugInfo('Setting local video stream (was not set)...');
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.play().catch(e => addDebugInfo('⚠ Local video play error on active: ' + e.message));
      } else {
        addDebugInfo('✓ Local video stream already set');
      }
    }
  }, [callState]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 flex flex-col items-center justify-center z-50">
      {error && (
        <div className="absolute top-4 left-4 right-4 p-4 bg-red-500 text-white rounded-lg flex justify-between items-center z-50">
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            className="ml-2 underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Debug Info Panel */}
      <div className="absolute top-20 right-4 bg-gray-900 bg-opacity-90 text-gray-300 p-4 rounded-lg max-w-xs max-h-96 overflow-y-auto text-xs font-mono">
        <div className="font-bold text-blue-400 mb-2">Debug Info:</div>
        <div className="whitespace-pre-wrap break-words">{debugInfo}</div>
      </div>

      {callState === 'idle' && (
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to call</h2>
          <p className="text-gray-300 mb-8 text-lg">{otherUserName}</p>
          <button
            onClick={initiateCall}
            className="px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 text-lg font-semibold shadow-lg"
          >
            Start Video Call
          </button>
        </div>
      )}

      {callState === 'ringing' && !isDoctor && (
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4 animate-pulse">Incoming call</h2>
          <p className="text-gray-300 mb-8 text-lg">{otherUserName}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={acceptCall}
              className="px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 text-lg font-semibold shadow-lg"
            >
              Accept
            </button>
            <button
              onClick={rejectCall}
              className="px-8 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 text-lg font-semibold shadow-lg"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {callState === 'ringing' && isDoctor && (
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4 animate-pulse">Calling...</h2>
          <p className="text-gray-300 mb-8 text-lg">{otherUserName}</p>
          <button
            onClick={endCall}
            className="px-8 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 text-lg font-semibold shadow-lg"
          >
            End Call
          </button>
        </div>
      )}

      {callState === 'active' && (
        <div className="w-full h-full relative bg-black">
          {/* Remote video (main) - full screen */}
          <video
            key="remote-video"
            ref={remoteVideoRef}
            autoPlay={true}
            playsInline={true}
            muted={false}
            controls={false}
            onLoadedMetadata={() => addDebugInfo('✓ Remote video metadata loaded')}
            onPlay={() => addDebugInfo('✓ Remote video started playing')}
            onError={(e) => addDebugInfo(`✗ Remote video error: ${e.currentTarget.error?.message || 'Unknown'}`)}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ width: '100%', height: '100%' }}
          />

          {/* Local video (PIP) - bottom right */}
          <video
            key="local-video"
            ref={localVideoRef}
            autoPlay={true}
            playsInline={true}
            muted={true}
            controls={false}
            onLoadedMetadata={() => addDebugInfo('✓ Local video metadata loaded')}
            onPlay={() => addDebugInfo('✓ Local video started playing')}
            onError={(e) => addDebugInfo(`✗ Local video error: ${e.currentTarget.error?.message || 'Unknown'}`)}
            className="absolute bottom-20 right-6 w-32 h-24 bg-black rounded-lg overflow-hidden border-2 border-white shadow-lg z-10 object-cover"
            style={{ width: '128px', height: '96px' }}
          />

          {/* Call controls */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 bg-opacity-80 px-6 py-4 rounded-lg flex items-center gap-6 backdrop-blur-sm">
            <div className="text-white text-2xl font-bold min-w-20 text-center">
              {formatDuration(callDuration)}
            </div>
            
            <button
              onClick={toggleAudio}
              className={`p-3 rounded-full transition ${
                isAudioOn
                  ? 'bg-gray-700 hover:bg-gray-600'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
              title={isAudioOn ? 'Mute audio' : 'Unmute audio'}
            >
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>

            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full transition ${
                isVideoOn
                  ? 'bg-gray-700 hover:bg-gray-600'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
              title={isVideoOn ? 'Turn off video' : 'Turn on video'}
            >
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
            </button>

            <button
              onClick={endCall}
              className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition"
              title="End call"
            >
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {callState === 'ended' && (
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Call ended</h2>
          <p className="text-gray-300 mb-2">Duration: {formatDuration(callDuration)}</p>
          <button
            onClick={() => onCallEnd && onCallEnd()}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mt-6 font-semibold"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

export default VideoCall;