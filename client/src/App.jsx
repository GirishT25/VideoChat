import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import Peer from "simple-peer";

const socket = io("http://YOUR_LOCAL_IP:5000");  // <-- IMPORTANT

function App() {
  const userVideo = useRef();
  const [peers, setPeers] = useState([]);
  const peersRef = useRef([]);
  const roomID = "demo-room";

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      userVideo.current.srcObject = stream;

      socket.emit("join-room", roomID, socket.id);

      socket.on("user-connected", userID => {
        const peer = createPeer(userID, socket.id, stream);
        peersRef.current.push({ peerID: userID, peer });
        setPeers(prev => [...prev, peer]);
      });

      socket.on("signal", ({ signal, sender }) => {
        let peerObj = peersRef.current.find(p => p.peerID === sender);

        if (!peerObj) {
          const peer = addPeer(signal, sender, stream);
          peersRef.current.push({ peerID: sender, peer });
          setPeers(prev => [...prev, peer]);
        } else {
          peerObj.peer.signal(signal);
        }
      });
    });
  }, []);

  function createPeer(userToSignal, callerID, stream) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream
    });

    peer.on("signal", signal => {
      socket.emit("signal", { target: userToSignal, signal });
    });

    return peer;
  }

  function addPeer(incomingSignal, callerID, stream) {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream
    });

    peer.on("signal", signal => {
      socket.emit("signal", { target: callerID, signal });
    });

    peer.signal(incomingSignal);
    return peer;
  }

  return (
    <div>
      <h2>Google Meet Clone</h2>

      <video ref={userVideo} autoPlay muted style={{ width: "300px" }} />

      {peers.map((peer, index) => (
        <Video key={index} peer={peer} />
      ))}
    </div>
  );
}

function Video({ peer }) {
  const ref = useRef();

  useEffect(() => {
    peer.on("stream", stream => {
      ref.current.srcObject = stream;
    });
  }, [peer]);

  return <video ref={ref} autoPlay style={{ width: "300px" }} />;
}

export default App;
