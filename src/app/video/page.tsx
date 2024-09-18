"use client";
import { useEffect, useRef, useState } from "react";
import { Peer } from 'peerjs'; 
import styles from "./Video.module.css";

export default function Video() {
  const [peerId, setPeerId] = useState("");
  const [remotePeerIdValue, setRemotePeerIdValue] = useState("");
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isCallActive, setIsCallActive] = useState(false);

  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const currentUserVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerInstance = useRef<Peer | null>(null);
  const currentCall = useRef<Peer.MediaConnection | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);

  useEffect(() => {
    const peer = new Peer();

    peer.on("open", (id) => {
      setPeerId(id);
    });

    peer.on("call", (call) => {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          mediaStream.current = stream;
          if (currentUserVideoRef.current) {
            currentUserVideoRef.current.srcObject = stream;
            currentUserVideoRef.current.play();
          }
          call.answer(stream);
          setIsCallActive(true);

          call.on("stream", (remoteStream: MediaStream) => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
              remoteVideoRef.current.play();
            }
          });

          currentCall.current = call;
        })
        .catch((err) => {
          console.error("Failed to get local stream", err);
        });
    });

    peerInstance.current = peer;

    return () => {
      peer.destroy();
    };
  }, []);

  const call = (remotePeerId: string) => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        mediaStream.current = stream;
        if (currentUserVideoRef.current) {
          currentUserVideoRef.current.srcObject = stream;
          currentUserVideoRef.current.play();
        }

        const call = peerInstance.current?.call(remotePeerId, stream);
        call?.on("stream", (remoteStream: MediaStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play();
          }
        });

        currentCall.current = call;
        setIsCallActive(true);
      })
      .catch((err) => {
        console.error("Failed to get local stream", err);
      });
  };

  const toggleAudio = () => {
    if (mediaStream.current) {
      const audioTrack = mediaStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (mediaStream.current) {
      const videoTrack = mediaStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const endCall = () => {
    currentCall.current?.close();
    mediaStream.current?.getTracks().forEach((track) => track.stop());

    if (currentUserVideoRef.current) {
      currentUserVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setIsCallActive(false);
    setIsAudioOn(true); 
    setIsVideoOn(true); 
  };

  return (
    <div className={styles.app}>
      <h1 className={styles.h1}>Current user id is {peerId}</h1>
      <input
        className={styles.input}
        type="text"
        value={remotePeerIdValue}
        onChange={(e) => setRemotePeerIdValue(e.target.value)}
        placeholder="Enter remote peer ID"
      />
      <button className={styles.button} onClick={() => call(remotePeerIdValue)}>
        Call
      </button>

      {isCallActive && (
        <div className={styles.controls}>
          <button className={styles.button} onClick={toggleAudio}>
            {isAudioOn ? "Turn Audio Off" : "Turn Audio On"}
          </button>
          <button className={styles.button} onClick={toggleVideo}>
            {isVideoOn ? "Turn Video Off" : "Turn Video On"}
          </button>
          <button className={styles.button} onClick={endCall}>
            End Call
          </button>
        </div>
      )}

      <div className={styles.video_container}>
        <video ref={currentUserVideoRef} className={styles.video} muted />
        <video ref={remoteVideoRef} className={styles.video} />
      </div>
    </div>
  );
}
