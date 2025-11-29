import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

// Replace with your LAN IP
const socket = io("http://192.168.136.1:5000"); 

export default function VideoChat() {
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);

  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);

  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState("");

  const servers = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  // Socket listeners – run only once
  useEffect(() => {
    const handleOffer = async ({ sdp }) => {
      if (!pcRef.current) await setupConnection();

      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socket.emit("answer", { room, sdp: answer });
    };

    const handleAnswer = async ({ sdp }) => {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
    };

    const handleCandidate = ({ candidate }) => {
      pcRef.current?.addIceCandidate(candidate);
    };

    const handleReady = async () => {
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      socket.emit("offer", { room, sdp: offer });
    };

    const handleChat = (data) => {
      setMessages((prev) => [...prev, data]);
    };

    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleCandidate);
    socket.on("ready", handleReady);
    socket.on("chat", handleChat);

    return () => {
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleCandidate);
      socket.off("ready", handleReady);
      socket.off("chat", handleChat);
    };
  }, []);

  // Create peer connection after join
  useEffect(() => {
    if (joined) setupConnection();
  }, [joined]);

  const setupConnection = async () => {
    if (!localVideo.current || !remoteVideo.current) {
      setTimeout(setupConnection, 100);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideo.current.srcObject = stream;
      localStreamRef.current = stream;
    } catch (err) {
      alert("Please allow camera and microphone access.");
      console.error(err);
      return;
    }

    pcRef.current = new RTCPeerConnection(servers);

    localStreamRef.current.getTracks().forEach((track) => {
      pcRef.current.addTrack(track, localStreamRef.current);
    });

    pcRef.current.ontrack = (event) => {
      remoteVideo.current.srcObject = event.streams[0];
    };

    pcRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { room, candidate: event.candidate });
      }
    };

    socket.emit("join", { room });
  };

  const joinRoom = () => {
    if (!room.trim()) return alert("Enter a Room ID");
    setJoined(true);
  };

  const sendMessage = () => {
    if (!msg.trim()) return;
    const data = { room, msg };
    socket.emit("chat", data);
    setMessages((prev) => [...prev, data]);
    setMsg("");
  };

  return (
    <div style={{ padding: 20 }}>
      {!joined ? (
        <>
          <input
            type="text"
            placeholder="Enter Room ID"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
          <button onClick={joinRoom}>Join</button>
        </>
      ) : (
        <>
          <h3>Room: {room}</h3>
          <div style={{ display: "flex", gap: 20 }}>
            <video ref={localVideo} autoPlay muted playsInline width="300" />
            <video ref={remoteVideo} autoPlay playsInline width="300" />
          </div>

          <h3>Chat</h3>
          <div
            style={{
              width: "300px",
              height: "200px",
              border: "1px solid black",
              padding: 10,
              overflowY: "auto",
            }}
          >
            {messages.map((m, i) => (
              <p key={i}>{m.msg}</p>
            ))}
          </div>

          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Type message..."
          />
          <button onClick={sendMessage}>Send</button>
        </>
      )}
    </div>
  );
}
