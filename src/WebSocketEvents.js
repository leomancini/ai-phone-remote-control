import React, { useState, useEffect } from "react";
import styled, { StyleSheetManager } from "styled-components";
import isPropValid from "@emotion/is-prop-valid";

const Page = styled.div`
  max-width: 48rem;
  margin: 0 auto;

  * {
    font-family: monospace;
    text-transform: uppercase;
  }
`;

const Header = styled.h1`
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 2rem;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin-top: 1rem;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 2rem;
  justify-content: space-between;
`;

const Button = styled.button`
  padding: 1rem;
  border: none;
  border-radius: 1rem;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.2s;
  font-size: 1rem;
  flex: 1;
  min-width: 0;

  &:hover {
    opacity: 0.9;
  }
`;

const LedButton = styled(Button)`
  background-color: ${(props) => (props.isOn ? "#9e9e9e" : "#000000")};
  color: white;
`;

const RingButton = styled(Button)`
  background-color: ${(props) => (props.isPlaying ? "#9e9e9e" : "#000000")};
  color: white;
`;

const Status = styled.div`
  font-weight: bold;
  color: ${(props) => props.color};
  display: flex;
  align-items: center;
  font-size: 1rem;
`;

const StatusIndicator = styled.div`
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  margin-right: 0.75rem;
  background-color: ${(props) => props.color};
`;

const LedStatus = styled(Status)`
  color: ${(props) => (props.isOn ? "#f44336" : "#9e9e9e")};
`;

const SocketServerStatus = styled(Status)`
  color: ${(props) => (props.isOn ? "#4CAF50" : "rgba(0, 0, 0, 0.5)")};
`;

const EventList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const EventItem = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 1rem;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 0.5rem;
  text-transform: uppercase;
  font-size: 1rem;
`;

const EventItemKeyValuePairs = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const EventItemKeyValuePair = styled.div`
  display: flex;
`;

const EventItemKey = styled.div`
  color: rgba(0, 0, 0, 0.5);
  width: 8rem;
`;

const EventItemValue = styled.div`
  font-weight: bold;
`;

const Timestamp = styled.div`
  color: rgba(0, 0, 0, 0.5);
`;

function WebSocketEvents() {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const [ledState, setLedState] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ws, setWs] = useState(null);

  const connectWebSocket = () => {
    const socket = new WebSocket("ws://192.168.8.219:8765");

    socket.onopen = () => {
      setConnected(true);
      console.log("Connected to server");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle LED state notifications
        if (data.event === "led_state") {
          setLedState(data.state === "on");
        }

        // Handle ringtone stopped event
        if (data.event === "ringtone_stopped") {
          setIsPlaying(false);
        }

        // Add to events list
        const newEvent = {
          id: Date.now(),
          data: event.data,
          timestamp: new Date().toLocaleTimeString(),
          source: "Server"
        };
        setEvents((prevEvents) => [newEvent, ...prevEvents].slice(0, 100));
      } catch (error) {
        console.error("Error parsing server message:", error);
      }
    };

    socket.onclose = () => {
      setConnected(false);
      console.log("Disconnected from server");
    };

    socket.onerror = (error) => {
      console.error("Server connection error:", error);
    };

    setWs(socket);

    return socket;
  };

  // Initial connection
  useEffect(() => {
    const socket = connectWebSocket();
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, []);

  // Polling for reconnection
  useEffect(() => {
    let intervalId;

    if (!connected) {
      intervalId = setInterval(() => {
        console.log("Attempting to reconnect...");
        if (ws && ws.readyState === WebSocket.CLOSED) {
          connectWebSocket();
        }
      }, 3000); // Try every 3 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [connected, ws]);

  const sendCommand = (command, data = {}) => {
    if (ws && connected) {
      const message = JSON.stringify({
        event: command,
        ...data
      });
      ws.send(message);

      // Log the sent event
      const newEvent = {
        id: Date.now(),
        data: message,
        timestamp: new Date().toLocaleTimeString(),
        source: "Client"
      };
      setEvents((prevEvents) => [newEvent, ...prevEvents].slice(0, 100));
    }
  };

  const handleRingtone = () => {
    if (isPlaying) {
      sendCommand("stop");
      setIsPlaying(false);
    } else {
      sendCommand("ring", { ringtone: "telephone-ring-02.wav" });
      setIsPlaying(true);
    }
  };

  return (
    <StyleSheetManager shouldForwardProp={isPropValid}>
      <Page>
        <Header>AI Phone Remote Control</Header>

        <SocketServerStatus isOn={connected}>
          <StatusIndicator
            color={connected ? "#4CAF50" : "rgba(0, 0, 0, 0.5)"}
          />
          {connected ? "Connected" : "Connecting..."}
        </SocketServerStatus>

        {connected && (
          <Content>
            <LedStatus isOn={ledState}>
              <StatusIndicator color={ledState ? "#f44336" : "#9e9e9e"} />
              LED {ledState ? "ON" : "OFF"}
            </LedStatus>

            <ButtonContainer>
              <LedButton
                onClick={() => sendCommand(ledState ? "led_off" : "led_on")}
                disabled={!connected}
                isOn={ledState}
              >
                Turn LED {ledState ? "Off" : "On"}
              </LedButton>
              <RingButton
                onClick={handleRingtone}
                disabled={!connected}
                isPlaying={isPlaying}
              >
                {isPlaying ? "Stop Ringing" : "Start Ringing"}
              </RingButton>
            </ButtonContainer>

            <EventList>
              {events.map((event) => (
                <EventItem key={event.id}>
                  <EventItemKeyValuePairs>
                    <EventItemKeyValuePair>
                      <EventItemKey>source</EventItemKey>
                      <EventItemValue>{event.source}</EventItemValue>
                    </EventItemKeyValuePair>
                    {Object.entries(JSON.parse(event.data)).map(
                      ([key, value]) => (
                        <EventItemKeyValuePair key={key}>
                          <EventItemKey>{key}</EventItemKey>
                          <EventItemValue>
                            {typeof value === "object"
                              ? JSON.stringify(value)
                              : value}
                          </EventItemValue>
                        </EventItemKeyValuePair>
                      )
                    )}
                  </EventItemKeyValuePairs>
                  <Timestamp>{event.timestamp}</Timestamp>
                </EventItem>
              ))}
            </EventList>
          </Content>
        )}
      </Page>
    </StyleSheetManager>
  );
}

export default WebSocketEvents;
