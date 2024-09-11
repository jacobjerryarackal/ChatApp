"use client"
import React, { useState, useRef, useEffect } from 'react';
import styles from './VideoCallModal.module.css';

interface VideoCallModalProps { 
  isOpen: boolean;
  onClose: () => void;
  socket: any;
  userId: string;
}

const VideoCallModal: React.FC<VideoCallModalProps> = ({ isOpen, onClose, socket, userId }) => {
  const [isCalling, setIsCalling] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [offer, setOffer] = useState<RTCSessionDescriptionInit | null>(null);
  const [answer, setAnswer] = useState<RTCSessionDescriptionInit | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);

  useEffect(() => {
    if (socket) {
      socket.on('receive-call', (offer: RTCSessionDescriptionInit) => {
        console.log('Received call offer:', offer);
        setOffer(offer);
        setIsCalling(true);
      });

      socket.on('call-answered', (answer: RTCSessionDescriptionInit) => {
        setAnswer(answer);
        setIsInCall(true);
      });

      socket.on('new-ice-candidate', (candidate: RTCIceCandidateInit) => {
        if (peerConnectionRef.current) {
          if (peerConnectionRef.current.remoteDescription) {
            peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
              .catch(error => console.error('Error adding ICE candidate:', error));
          } else {
            iceCandidatesQueue.current.push(candidate);
          }
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('receive-call');
        socket.off('call-answered');
        socket.off('new-ice-candidate');
      }
    };
  }, [socket]);

  const startCall = async () => {
    if (!socket) {
      console.error('Socket is not initialized');
      return;
    }
  
    try {
      console.log('Starting call');
      const configuration: RTCConfiguration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
      peerConnectionRef.current = new RTCPeerConnection(configuration);
  
      peerConnectionRef.current.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
        console.log('ICE candidate event:', event.candidate);
        if (event.candidate && socket) {
          socket.emit('ice-candidate', { candidate: event.candidate.toJSON(), userId });
        }
      };
  
      peerConnectionRef.current.ontrack = (event: RTCTrackEvent) => {
        console.log('Track event:', event);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };
  
      const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      console.log('Local stream acquired:', localStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
      localStream.getTracks().forEach((track) => peerConnectionRef.current?.addTrack(track, localStream));
  
      const offer = await peerConnectionRef.current.createOffer();
      console.log('Offer created:', offer);
      await peerConnectionRef.current.setLocalDescription(offer);
  
      socket.emit('call-user', { offer, userId });
    } catch (error) {
      console.error('Error starting call:', error);
    }
  };
  

  const answerCall = async () => {
    if (!socket || !offer) {
      console.error('Socket or offer is not available');
      return;
    }

    if (peerConnectionRef.current && offer) {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));

      const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
      localStream.getTracks().forEach((track) => peerConnectionRef.current?.addTrack(track, localStream));

      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      socket.emit('answer-call', { answer, userId });
      setIsInCall(true);

     
      iceCandidatesQueue.current.forEach(candidate => {
        peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(candidate))
          .catch(error => console.error('Error adding ICE candidate from queue:', error));
      });
      iceCandidatesQueue.current = [];
    }
  };

  const closeModal = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
  
      if (localVideoRef.current && localVideoRef.current.srcObject instanceof MediaStream) {
        (localVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    }
  
    setOffer(null);
    setAnswer(null);
    setIsCalling(false);
    setIsInCall(false);
    onClose();
  };
  
  
  

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <button className={styles.closeButton} onClick={closeModal}>
          &times;
        </button>
        <h2 className={styles.h2}>{isCalling ? 'Incoming Call' : isInCall ? 'In Call' : 'Start Call'}</h2>
        <div className={styles.videoContainer}>
          <video ref={localVideoRef} autoPlay muted className={styles.localVideo} />
          <video ref={remoteVideoRef} autoPlay className={styles.remoteVideo} />
        </div>
        {!isInCall && !isCalling && <button className={styles.button} onClick={startCall}>Start Call</button>}
        {isCalling && <button className={styles.button} onClick={answerCall}>Answer Call</button>}
        {isInCall && <button className={styles.button} onClick={closeModal}>End Call</button>}
      </div>
    </div>
  );
};

export default VideoCallModal;
