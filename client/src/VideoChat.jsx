import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

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

  // Handle socket events
  useEffect(() => {
    socket.on("offer", async ({ sdp }) => {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));

      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);

      socket.emit("answer", { room, sdp: answer });
    });

    socket.on("answer", async ({ sdp }) => {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    socket.on("ice-candidate", ({ candidate }) => {
      if (candidate && pcRef.current) {
        pcRef.current.addIceCandidate(candidate);
      }
    });

    socket.on("ready", async () => {
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);

      socket.emit("offer", { room, sdp: offer });
    });

    socket.on("chat", (data) => {
      setMessages((prev) => [...prev, data]);
    });
  }, [room]);

  // Create peer connection ONLY after join screen disappears
  useEffect(() => {
    if (joined) setupConnection();
  }, [joined]);

  async function setupConnection() {
    // Wait until video elements exist
    if (!localVideo.current || !remoteVideo.current) {
      setTimeout(setupConnection, 100);
      return;
    }

    // Camera stream
    localStreamRef.current = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    localVideo.current.srcObject = localStreamRef.current;

    // Create peer
    pcRef.current = new RTCPeerConnection(servers);

    // Add local tracks
    localStreamRef.current.getTracks().forEach((track) => {
      pcRef.current.addTrack(track, localStreamRef.current);
    });

    pcRef.current.ontrack = (event) => {
      console.log("Remote stream received");
      remoteVideo.current.srcObject = event.streams[0];
    };

    pcRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { room, candidate: event.candidate });
      }
    };

    socket.emit("join", { room });
  }

  function joinRoom() {
    if (!room) return alert("Enter room ID");
    setJoined(true);
  }

  function sendMessage() {
    if (msg.trim() === "") return;

    const data = { room, msg };

    socket.emit("chat", data);
    setMessages((prev) => [...prev, data]);
    setMsg("");
  }

  return (
    <div>
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
