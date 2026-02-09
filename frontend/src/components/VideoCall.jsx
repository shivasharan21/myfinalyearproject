// frontend/src/components/VideoCall.jsx
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import websocketService from "../services/websocket";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Phone,
  PhoneCall,
  Users,
  Minimize2,
  Maximize2,
} from "lucide-react";

function VideoCall({
  appointmentId,
  otherUserId,
  otherUserName,
  isDoctor,
  incomingCallData,
  onCallEnd,
}) {
  const { user } = useAuth();
  const [callState, setCallState] = useState("idle");
  const [error, setError] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [debugInfo, setDebugInfo] = useState("");
  const [showDebug, setShowDebug] = useState(false);
  const [isPipMinimized, setIsPipMinimized] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const callTimerRef = useRef(null);
  const handlersRef = useRef({});
  const iceCandidateQueueRef = useRef([]);
  const incomingCallProcessedRef = useRef(false);

  const iceServers = {
    iceServers: [
      {
        urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
      },
    ],
  };

  const addDebugInfo = (msg) => {
    console.log("[DEBUG]", msg);
    setDebugInfo((prev) => prev + "\n" + msg);
  };

  const initializeMedia = async () => {
    try {
      addDebugInfo("Requesting media access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });

      addDebugInfo(
        `✓ Media stream acquired. Video: ${stream.getVideoTracks().length}, Audio: ${stream.getAudioTracks().length}`,
      );

      localStreamRef.current = stream;

      const setLocalVideoStream = () => {
        if (localVideoRef.current) {
          addDebugInfo("Setting local video stream on ref...");
          localVideoRef.current.srcObject = stream;
          localVideoRef.current
            .play()
            .catch((e) =>
              addDebugInfo("⚠ Local video play error: " + e.message),
            );
          addDebugInfo("✓ Local video stream set");
        } else {
          addDebugInfo("⚠ Local video ref not ready, retrying...");
          setTimeout(setLocalVideoStream, 100);
        }
      };

      setLocalVideoStream();

      return stream;
    } catch (error) {
      const errorMsg = "Failed to access camera/microphone: " + error.message;
      addDebugInfo("✗ " + errorMsg);
      setError(errorMsg);
      return null;
    }
  };

  const createPeerConnection = async (stream) => {
    try {
      addDebugInfo("Creating RTCPeerConnection...");
      const peerConnection = new RTCPeerConnection(iceServers);
      peerConnectionRef.current = peerConnection;

      if (stream) {
        stream.getTracks().forEach((track, index) => {
          addDebugInfo(`Adding ${track.kind} track (${index})`);
          peerConnection.addTrack(track, stream);
        });
      }

      peerConnection.ontrack = (event) => {
        addDebugInfo(
          `✓ Remote track received: ${event.track.kind}, streams: ${event.streams.length}`,
        );

        try {
          if (event.streams && event.streams.length > 0) {
            const remoteStream = event.streams[0];
            addDebugInfo(
              `Stream available with ${remoteStream.getTracks().length} tracks`,
            );

            const setRemoteStream = () => {
              if (remoteVideoRef.current) {
                addDebugInfo(`Setting remote video stream on ref`);
                remoteVideoRef.current.srcObject = remoteStream;
                remoteVideoRef.current
                  .play()
                  .catch((e) => addDebugInfo("⚠ Play error: " + e.message));
              } else {
                addDebugInfo("⚠ remoteVideoRef.current is null, retrying...");
                setTimeout(setRemoteStream, 100);
              }
            };

            setRemoteStream();
          } else {
            addDebugInfo("⚠ No streams in ontrack event");
          }
        } catch (err) {
          addDebugInfo("✗ Error in ontrack handler: " + err.message);
        }
      };

      peerConnection.onconnectionstatechange = () => {
        addDebugInfo(
          `Connection state changed: ${peerConnection.connectionState}`,
        );
        if (
          peerConnection.connectionState === "failed" ||
          peerConnection.connectionState === "disconnected"
        ) {
          addDebugInfo("✗ Connection failed or disconnected");
          setError("Connection lost");
          endCall();
        }
      };

      peerConnection.oniceconnectionstatechange = () => {
        addDebugInfo(
          `ICE connection state: ${peerConnection.iceConnectionState}`,
        );
      };

      peerConnection.onicegatheringstatechange = () => {
        addDebugInfo(
          `ICE gathering state: ${peerConnection.iceGatheringState}`,
        );
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          addDebugInfo(
            `Sending ICE candidate: ${event.candidate.candidate.substring(0, 50)}...`,
          );
          websocketService.emit("call:ice-candidate", {
            appointmentId,
            candidate: event.candidate,
            senderId: user.id,
          });
        } else {
          addDebugInfo("✓ All ICE candidates sent");
        }
      };

      addDebugInfo(
        `Processing ${iceCandidateQueueRef.current.length} queued ICE candidates`,
      );
      while (iceCandidateQueueRef.current.length > 0) {
        const queuedCandidate = iceCandidateQueueRef.current.shift();
        try {
          await peerConnection.addIceCandidate(
            new RTCIceCandidate(queuedCandidate),
          );
          addDebugInfo(`✓ Added queued ICE candidate`);
        } catch (error) {
          addDebugInfo(`⚠ Failed to add queued candidate: ${error.message}`);
        }
      }

      return peerConnection;
    } catch (error) {
      const errorMsg = "Failed to create peer connection: " + error.message;
      addDebugInfo("✗ " + errorMsg);
      setError(errorMsg);
      return null;
    }
  };

  const initiateCall = async () => {
    try {
      addDebugInfo(`>>> Initiating call to ${otherUserName} (${otherUserId})`);
      setCallState("ringing");

      const stream = await initializeMedia();
      if (!stream) {
        addDebugInfo("✗ Failed to get local media");
        return;
      }

      const peerConnection = await createPeerConnection(stream);
      if (!peerConnection) {
        addDebugInfo("✗ Failed to create peer connection");
        return;
      }

      addDebugInfo("Creating offer...");
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      addDebugInfo("Setting local description...");
      await peerConnection.setLocalDescription(offer);

      addDebugInfo(`Sending call:initiate event to ${otherUserId}`);
      websocketService.emit("call:initiate", {
        appointmentId,
        callerId: user.id,
        callerName: user.name,
        receiverId: otherUserId,
        offer: offer,
      });

      addDebugInfo("✓ Offer sent, waiting for answer...");
    } catch (error) {
      const errorMsg = "Failed to initiate call: " + error.message;
      addDebugInfo("✗ " + errorMsg);
      setError(errorMsg);
    }
  };

  const handleIncomingCall = async (data) => {
    try {
      addDebugInfo(
        `>>> Received incoming call from ${data.callerName} (${data.callerId})`,
      );
      const { offer } = data;
      setCallState("ringing");

      const stream = await initializeMedia();
      if (!stream) {
        addDebugInfo("✗ Failed to get local media");
        return;
      }

      const peerConnection = await createPeerConnection(stream);
      if (!peerConnection) {
        addDebugInfo("✗ Failed to create peer connection");
        return;
      }

      addDebugInfo("Setting remote description from offer...");
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer),
      );

      addDebugInfo("Creating answer...");
      const answer = await peerConnection.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      addDebugInfo("Setting local description for answer...");
      await peerConnection.setLocalDescription(answer);

      addDebugInfo(`Sending call:answer event`);
      websocketService.emit("call:answer", {
        appointmentId,
        answer: answer,
      });

      addDebugInfo("✓ Answer sent");
    } catch (error) {
      const errorMsg = "Failed to handle incoming call: " + error.message;
      addDebugInfo("✗ " + errorMsg);
      setError(errorMsg);
    }
  };

  const handleCallAnswered = async (data) => {
    try {
      addDebugInfo(">>> Received call answered event");
      const { answer } = data;

      if (!peerConnectionRef.current) {
        addDebugInfo("✗ No peer connection exists");
        return;
      }

      addDebugInfo("Setting remote description from answer...");
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(answer),
      );

      addDebugInfo("✓ Answer processed - transitioning to active state");
      setCallState("active");
      addDebugInfo("✓ Call state set to active");
      startCallTimer();
    } catch (error) {
      const errorMsg = "Failed to process answer: " + error.message;
      addDebugInfo("✗ " + errorMsg);
      setError(errorMsg);
    }
  };

  const handleICECandidate = async (data) => {
    try {
      const { candidate } = data;

      if (!peerConnectionRef.current) {
        addDebugInfo(`Queueing ICE candidate (peer connection not ready yet)`);
        iceCandidateQueueRef.current.push(candidate);
        return;
      }

      if (candidate) {
        addDebugInfo(
          `Adding ICE candidate: ${candidate.candidate.substring(0, 50)}...`,
        );
        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(candidate),
        );
      }
    } catch (error) {
      addDebugInfo("⚠ ICE candidate error: " + error.message);
    }
  };

  const acceptCall = async () => {
    addDebugInfo(">>> User accepted call - transitioning to active state");
    setCallState("active");
    addDebugInfo("✓ Call state set to active");
    startCallTimer();
  };

  const rejectCall = () => {
    addDebugInfo(">>> User rejected call");
    websocketService.emit("call:reject", {
      appointmentId,
      userId: user.id,
    });
    cleanup();
    setCallState("idle");
  };

  const endCall = () => {
    addDebugInfo(">>> Ending call");
    websocketService.emit("call:end", {
      appointmentId,
      userId: user.id,
    });
    cleanup();
    setCallState("ended");
    if (onCallEnd) {
      setTimeout(onCallEnd, 1000);
    }
  };

  const handleCallEnded = () => {
    addDebugInfo(">>> Remote user ended call");
    cleanup();
    setCallState("ended");
  };

  const cleanup = () => {
    addDebugInfo("Cleaning up resources...");

    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        addDebugInfo(`Stopped ${track.kind} track`);
      });
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
      addDebugInfo("Peer connection closed");
    }

    // Don't clear callDuration here - keep it for the ended state display
  };

  const startCallTimer = () => {
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
        addDebugInfo(`Audio ${audioTrack.enabled ? "enabled" : "disabled"}`);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
        addDebugInfo(`Video ${videoTrack.enabled ? "enabled" : "disabled"}`);
      }
    }
  };

  useEffect(() => {
    addDebugInfo(
      `Setting up WebSocket listeners (User: ${user.id}, Role: ${isDoctor ? "Doctor" : "Patient"})`,
    );

    const handleIncomingCallWrapper = (data) => handleIncomingCall(data);
    const handleCallAnsweredWrapper = (data) => handleCallAnswered(data);
    const handleICECandidateWrapper = (data) => handleICECandidate(data);
    const handleCallEndedWrapper = () => handleCallEnded();
    const handleCallRejectedWrapper = () => {
      addDebugInfo("✗ Call was rejected");
      setError("Call was rejected");
      cleanup();
      setCallState("idle");
    };

    handlersRef.current = {
      handleIncomingCallWrapper,
      handleCallAnsweredWrapper,
      handleICECandidateWrapper,
      handleCallEndedWrapper,
      handleCallRejectedWrapper,
    };

    websocketService.on("call:incoming", handleIncomingCallWrapper);
    websocketService.on("call:answered", handleCallAnsweredWrapper);
    websocketService.on("call:ice-candidate", handleICECandidateWrapper);
    websocketService.on("call:ended", handleCallEndedWrapper);
    websocketService.on("call:rejected", handleCallRejectedWrapper);

    return () => {
      websocketService.off("call:incoming", handleIncomingCallWrapper);
      websocketService.off("call:answered", handleCallAnsweredWrapper);
      websocketService.off("call:ice-candidate", handleICECandidateWrapper);
      websocketService.off("call:ended", handleCallEndedWrapper);
      websocketService.off("call:rejected", handleCallRejectedWrapper);
      addDebugInfo("WebSocket listeners removed");
    };
  }, [user.id, appointmentId, otherUserId, isDoctor]);

  // Handle incoming call data passed from notification acceptance
  useEffect(() => {
    if (incomingCallData && !incomingCallProcessedRef.current && !isDoctor) {
      addDebugInfo(
        ">>> Auto-handling incoming call from notification acceptance",
      );
      incomingCallProcessedRef.current = true;
      // Call handleIncomingCall which will set state to ringing and set up peer connection
      handleIncomingCall(incomingCallData);
    }
  }, [incomingCallData, isDoctor]);

  // Auto-accept the call after peer connection is established from incoming call
  useEffect(() => {
    if (
      incomingCallData &&
      callState === "ringing" &&
      !isDoctor &&
      peerConnectionRef.current
    ) {
      addDebugInfo(">>> Auto-accepting call (peer connection ready)");
      // Use timeout to ensure peer connection is properly configured
      const timer = setTimeout(() => {
        acceptCall();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [incomingCallData, callState, isDoctor]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (localVideoRef.current) {
      addDebugInfo("✓ Local video ref is ready");
    }
    if (remoteVideoRef.current) {
      addDebugInfo("✓ Remote video ref is ready");
    }
  }, []);

  useEffect(() => {
    if (
      callState === "active" &&
      localStreamRef.current &&
      localVideoRef.current
    ) {
      addDebugInfo("Call is active - ensuring local video stream is set...");
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        addDebugInfo("Setting local video stream (was not set)...");
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current
          .play()
          .catch((e) =>
            addDebugInfo("⚠ Local video play error on active: " + e.message),
          );
      } else {
        addDebugInfo("✓ Local video stream already set");
      }
    }
  }, [callState]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center z-50">
      {/* Error Banner */}
      {error && (
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
          <div className="bg-red-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 max-w-md">
            <div className="bg-white bg-opacity-20 p-2 rounded-full">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <span className="flex-1 font-medium">{error}</span>
            <button
              onClick={() => setError("")}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded-lg text-sm font-semibold transition"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Debug Toggle Button */}
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="absolute top-6 right-6 bg-gray-800 bg-opacity-50 hover:bg-opacity-70 text-gray-300 p-3 rounded-full backdrop-blur-sm transition z-50"
        title="Toggle debug info"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
          />
        </svg>
      </button>

      {/* Debug Info Panel */}
      {showDebug && (
        <div className="absolute top-20 right-6 bg-gray-900 bg-opacity-95 text-gray-300 p-4 rounded-2xl max-w-sm max-h-96 overflow-y-auto text-xs font-mono shadow-2xl backdrop-blur-lg border border-gray-700 z-40">
          <div className="font-bold text-blue-400 mb-2 flex items-center justify-between">
            <span>Debug Console</span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
          <div className="whitespace-pre-wrap break-words">{debugInfo}</div>
        </div>
      )}

      {/* Idle State */}
      {callState === "idle" && (
        <div className="text-center animate-in fade-in zoom-in duration-500">
          <div className="mb-8">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <Users className="w-16 h-16 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-white mb-2">
              Ready to Connect
            </h2>
            <p className="text-gray-400 text-lg">Start a video call with</p>
            <p className="text-blue-400 text-2xl font-semibold mt-2">
              {otherUserName}
            </p>
          </div>
          {isDoctor && (
            <button
              onClick={initiateCall}
              className="group relative px-10 py-5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl hover:from-green-600 hover:to-green-700 text-lg font-semibold shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-white bg-opacity-20 p-2 rounded-full group-hover:bg-opacity-30 transition">
                  <Video className="w-6 h-6" />
                </div>
                <span>Start Video Call</span>
              </div>
            </button>
          )}
          {!isDoctor && (
            <p className="text-gray-500 text-lg">
              Waiting for doctor to initiate call...
            </p>
          )}
        </div>
      )}

      {/* Ringing State - Incoming (Patient) */}
      {callState === "ringing" && !isDoctor && (
        <div className="text-center animate-in fade-in zoom-in duration-500">
          <div className="mb-8">
            <div className="relative w-40 h-40 mx-auto mb-6">
              <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div>
              <div className="relative w-40 h-40 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-2xl">
                <PhoneCall className="w-20 h-20 text-white animate-pulse" />
              </div>
            </div>
            <h2 className="text-4xl font-bold text-white mb-2 animate-pulse">
              Incoming Call
            </h2>
            <p className="text-blue-400 text-2xl font-semibold mt-2">
              {otherUserName}
            </p>
            <p className="text-gray-400 mt-1">wants to video call with you</p>
          </div>
          <div className="flex gap-6 justify-center">
            <button
              onClick={acceptCall}
              className="group relative px-10 py-5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl hover:from-green-600 hover:to-green-700 text-lg font-semibold shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-white bg-opacity-20 p-2 rounded-full group-hover:bg-opacity-30 transition">
                  <Phone className="w-6 h-6" />
                </div>
                <span>Accept</span>
              </div>
            </button>
            <button
              onClick={rejectCall}
              className="group relative px-10 py-5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl hover:from-red-600 hover:to-red-700 text-lg font-semibold shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-white bg-opacity-20 p-2 rounded-full group-hover:bg-opacity-30 transition">
                  <PhoneOff className="w-6 h-6" />
                </div>
                <span>Decline</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Ringing State - Outgoing (Doctor) */}
      {callState === "ringing" && isDoctor && (
        <div className="text-center animate-in fade-in zoom-in duration-500">
          <div className="mb-8">
            <div className="relative w-40 h-40 mx-auto mb-6">
              <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div>
              <div className="relative w-40 h-40 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-2xl">
                <PhoneCall className="w-20 h-20 text-white animate-pulse" />
              </div>
            </div>
            <h2 className="text-4xl font-bold text-white mb-2 animate-pulse">
              Calling...
            </h2>
            <p className="text-blue-400 text-2xl font-semibold mt-2">
              {otherUserName}
            </p>
            <p className="text-gray-400 mt-1">Waiting for answer...</p>
          </div>
          <button
            onClick={endCall}
            className="group relative px-10 py-5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl hover:from-red-600 hover:to-red-700 text-lg font-semibold shadow-2xl transition-all duration-300 transform hover:scale-105"
          >
            <div className="flex items-center space-x-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-full group-hover:bg-opacity-30 transition">
                <PhoneOff className="w-6 h-6" />
              </div>
              <span>Cancel Call</span>
            </div>
          </button>
        </div>
      )}

      {/* Active Call State */}
      {callState === "active" && (
        <div className="w-full h-full relative bg-black">
          {/* Remote video (main) - full screen */}
          <video
            key="remote-video"
            ref={remoteVideoRef}
            autoPlay={true}
            playsInline={true}
            muted={false}
            controls={false}
            onLoadedMetadata={() =>
              addDebugInfo("✓ Remote video metadata loaded")
            }
            onPlay={() => addDebugInfo("✓ Remote video started playing")}
            onError={(e) =>
              addDebugInfo(
                `✗ Remote video error: ${e.currentTarget.error?.message || "Unknown"}`,
              )
            }
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Connection indicator */}
          <div className="absolute top-6 left-6 bg-black bg-opacity-60 backdrop-blur-md px-4 py-2 rounded-full flex items-center space-x-2 z-10">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-white text-sm font-medium">Connected</span>
          </div>

          {/* Participant name */}
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 backdrop-blur-md px-6 py-2 rounded-full z-10">
            <span className="text-white text-sm font-medium">
              {otherUserName}
            </span>
          </div>

          {/* Local video (PIP) */}
          <div
            className={`absolute ${isPipMinimized ? "bottom-6 right-6" : "bottom-32 right-8"} transition-all duration-300 z-10`}
          >
            <div className="relative group">
              <video
                key="local-video"
                ref={localVideoRef}
                autoPlay={true}
                playsInline={true}
                muted={true}
                controls={false}
                onLoadedMetadata={() =>
                  addDebugInfo("✓ Local video metadata loaded")
                }
                onPlay={() => addDebugInfo("✓ Local video started playing")}
                onError={(e) =>
                  addDebugInfo(
                    `✗ Local video error: ${e.currentTarget.error?.message || "Unknown"}`,
                  )
                }
                className={`bg-gray-900 rounded-2xl overflow-hidden border-2 border-white shadow-2xl object-cover transition-all duration-300 ${
                  isPipMinimized ? "w-32 h-24" : "w-64 h-48"
                }`}
              />
              <button
                onClick={() => setIsPipMinimized(!isPipMinimized)}
                className="absolute top-2 right-2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition"
              >
                {isPipMinimized ? (
                  <Maximize2 className="w-4 h-4" />
                ) : (
                  <Minimize2 className="w-4 h-4" />
                )}
              </button>
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 px-2 py-1 rounded-md">
                <span className="text-white text-xs font-medium">You</span>
              </div>
            </div>
          </div>

          {/* Call controls */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
            <div className="bg-gray-900 bg-opacity-90 backdrop-blur-xl px-8 py-6 rounded-3xl shadow-2xl border border-gray-700">
              <div className="flex items-center gap-6">
                {/* Timer */}
                <div className="bg-gray-800 px-6 py-3 rounded-2xl min-w-28">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-white text-xl font-bold font-mono tabular-nums">
                      {formatDuration(callDuration)}
                    </span>
                  </div>
                </div>

                {/* Audio Toggle */}
                <button
                  onClick={toggleAudio}
                  className={`group relative p-4 rounded-2xl transition-all duration-300 transform hover:scale-110 ${
                    isAudioOn
                      ? "bg-gray-700 hover:bg-gray-600"
                      : "bg-red-500 hover:bg-red-600"
                  }`}
                  title={isAudioOn ? "Mute audio" : "Unmute audio"}
                >
                  {isAudioOn ? (
                    <Mic className="w-6 h-6 text-white" />
                  ) : (
                    <MicOff className="w-6 h-6 text-white" />
                  )}
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 px-2 py-1 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
                    {isAudioOn ? "Mute" : "Unmute"}
                  </div>
                </button>

                {/* Video Toggle */}
                <button
                  onClick={toggleVideo}
                  className={`group relative p-4 rounded-2xl transition-all duration-300 transform hover:scale-110 ${
                    isVideoOn
                      ? "bg-gray-700 hover:bg-gray-600"
                      : "bg-red-500 hover:bg-red-600"
                  }`}
                  title={isVideoOn ? "Turn off video" : "Turn on video"}
                >
                  {isVideoOn ? (
                    <Video className="w-6 h-6 text-white" />
                  ) : (
                    <VideoOff className="w-6 h-6 text-white" />
                  )}
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 px-2 py-1 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
                    {isVideoOn ? "Stop Video" : "Start Video"}
                  </div>
                </button>

                {/* End Call */}
                <button
                  onClick={endCall}
                  className="group relative p-4 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:scale-110 shadow-lg"
                  title="End call"
                >
                  <PhoneOff className="w-6 h-6 text-white" />
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 px-2 py-1 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
                    End Call
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Video status indicators */}
          {!isVideoOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-5">
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <VideoOff className="w-12 h-12 text-gray-400" />
                </div>
                <p className="text-white text-lg font-medium">
                  Your camera is off
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ended State */}
      {callState === "ended" && (
        <div className="text-center animate-in fade-in zoom-in duration-500">
          <div className="mb-8">
            <div className="w-32 h-32 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <PhoneOff className="w-16 h-16 text-gray-400" />
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">Call Ended</h2>
            <div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm px-6 py-3 rounded-2xl inline-block mb-2">
              <p className="text-gray-300 text-sm">Call Duration</p>
              <p className="text-white text-2xl font-bold font-mono">
                {formatDuration(callDuration)}
              </p>
            </div>
            <p className="text-gray-400 mt-4">
              Thank you for using Dr.AssistAI
            </p>
          </div>
          <button
            onClick={() => onCallEnd && onCallEnd()}
            className="group relative px-10 py-5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl hover:from-blue-600 hover:to-blue-700 text-lg font-semibold shadow-2xl transition-all duration-300 transform hover:scale-105"
          >
            <div className="flex items-center space-x-3">
              <span>Close</span>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

export default VideoCall;
