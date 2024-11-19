import React, { useEffect, useCallback, useState } from "react";
import ReactPlayer from "react-player";
import { useParams, useLocation } from "react-router-dom";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";
import { Button, Container, Row, Col, Alert, Form, ListGroup } from 'react-bootstrap';
import FileUpload from './FileUpload';

const RoomPage = () => {
  const { roomId } = useParams();
  const location = useLocation();
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();
  const [myEmail, setMyEmail] = useState(location.state?.email || ''); 
  const [remoteEmail, setRemoteEmail] = useState(''); 
  const [tracksAdded, setTracksAdded] = useState(false); 
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [isSocketConnected, setIsSocketConnected] = useState(true);

  useEffect(() => {
    if (location.state?.email) {
      setMyEmail(location.state.email);
    }
  }, [location.state]);

  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined room`);
    setRemoteSocketId(id);
    setRemoteEmail(email); 
  }, []);

  const handleCallAndSendStream = useCallback(async () => {
    if (!myStream) {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      // Remove the line that mutes the local stream
      // stream.getAudioTracks().forEach(track => track.enabled = false);

      const offer = await peer.getOffer();

      socket.emit("user:call", { to: remoteSocketId, offer, email: myEmail });

      setMyStream(stream);

      peer.createDataChannel();
    } else {
      if (!tracksAdded) {
        for (const track of myStream.getTracks()) {
          peer.peer.addTrack(track, myStream);
        }
        setTracksAdded(true); 
      }
    }
  }, [remoteSocketId, socket, myEmail, myStream, tracksAdded]);

  const handleIncommingCall = useCallback(
    async ({ from, offer, email }) => {
      setRemoteSocketId(from);
      setRemoteEmail(email); 
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);
      console.log(`Incoming Call`, from, offer);
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans, email: myEmail });
    },
    [socket, myEmail]
  );

  const handleCallAccepted = useCallback(
    ({ from, ans, email }) => {
      setRemoteEmail(email); 
      peer.setLocalDescription(ans);
      console.log("Call Accepted!");
      if (!tracksAdded) {
        for (const track of myStream.getTracks()) {
          peer.peer.addTrack(track, myStream);
        }
        setTracksAdded(true); 
      }
    },
    [myStream, tracksAdded]
  );

  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams;
      console.log("GOT TRACKS!!");
      setRemoteStream(remoteStream[0]);
    });
  }, []);

  const handleIncomingMessage = useCallback(({ message, email }) => {
    setMessages((prevMessages) => [...prevMessages, { email, message }]);
    if (email !== myEmail) {
    setRemoteEmail(email);
    }
  }, []);

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncomming);
    socket.on("peer:nego:final", handleNegoNeedFinal);
    socket.on("chat:message", handleIncomingMessage);
    socket.on("connect", () => setIsSocketConnected(true));
    socket.on("disconnect", () => setIsSocketConnected(false));

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncomming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
      socket.off("chat:message", handleIncomingMessage);
      socket.off("connect", () => setIsSocketConnected(true));
      socket.off("disconnect", () => setIsSocketConnected(false));
    };
  }, [
    socket,
    handleUserJoined,
    handleIncommingCall,
    handleCallAccepted,
    handleNegoNeedIncomming,
    handleNegoNeedFinal,
    handleIncomingMessage,
  ]);

  const handleSendMessage = () => {
    if (message.trim() && isSocketConnected) {
      socket.emit("chat:message", { room: roomId, message, email: myEmail });
      setMessage("");
    }
  };

  return (
    <Container>
      <Row className="my-4">
        <Col md={8}>
          <h1>Room Page</h1>
          <Alert variant="info">Room ID: {roomId}</Alert>
          <Alert variant={remoteSocketId ? "success" : "warning"}>
            {remoteSocketId ? "Connected" : "No one in room"}
          </Alert>
          {remoteSocketId && (
            <Button variant="success" onClick={handleCallAndSendStream}>
              {myStream ? "Send Stream" : "CALL"}
            </Button>
          )}
          <Row className="mt-4">
            <Col>
              {myStream && (
                <>
                  <h2>My Stream</h2>
                  <p>{myEmail}</p>
                  <ReactPlayer
                    playing
                    muted={true} // Ensure the local playback is muted to avoid echo
                    height="200px"
                    width="100%"
                    url={myStream}
                  />
                </>
              )}
            </Col>
            <Col>
              {remoteStream && (
                <>
                  <h2>Remote Stream</h2>
                  <p>{remoteEmail}</p>
                  <ReactPlayer
                    playing
                    muted={false}
                    height="200px"
                    width="100%"
                    url={remoteStream}
                  />
                </>
              )}
            </Col>
          </Row>
          <Row>
            <Col>
              {myStream && remoteStream && <FileUpload />}
            </Col>
          </Row>
        </Col>
        <Col md={4}>
          <h2>Chat</h2>
          <ListGroup>
            {messages.map((msg, index) => (
              <ListGroup.Item key={index}>
                <strong>{msg.email}: </strong>{msg.message}
              </ListGroup.Item>
            ))}
          </ListGroup>
          <Form.Control
            type="text"
            placeholder="Type a message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <Button
            variant={isSocketConnected ? "primary" : "danger"}
            onClick={handleSendMessage}
            className="mt-2"
          >
            {isSocketConnected ? "Send" : "No Socket Connection"}
          </Button>
        </Col>
      </Row>
    </Container>
  );
};

export default RoomPage;