import React, { useState, useEffect, useCallback } from "react";
import styled, { StyleSheetManager } from "styled-components";
import isPropValid from "@emotion/is-prop-valid";

const Container = styled.div`
  min-height: 100vh;
  padding: 20px;
  background-color: #f0f2f5;
`;

const Page = styled.div`
  max-width: 48rem;
  margin: 0 auto;

  * {
    font-family: monospace;
    text-transform: uppercase;
  }

  ${({ isKiosk }) =>
    isKiosk &&
    `
      transform: scale(2);
      transform-origin: top;
    `}
`;

const Header = styled.h1`
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 2rem;
`;

const StatusIndicators = styled.div`
  display: flex;
  flex-direction: row;
  gap: 2rem;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin-top: 2rem;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 2rem;
  justify-content: space-between;

  ${({ isKiosk }) =>
    isKiosk &&
    `
      display: none;
    `}
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
  flex: 1;
`;

const EventItemHeader = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
`;

const EventItemKeyValuePairs = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
`;

const EventItemKeyValuePair = styled.div`
  display: flex;
`;

const EventItemKey = styled.div`
  color: rgba(0, 0, 0, 0.5);
  width: 8rem;
  flex-shrink: 0;
`;

const EventItemValue = styled.div`
  font-weight: 600;
`;

const Timestamp = styled.div`
  color: rgba(0, 0, 0, 0.5);
`;

// Add this line at the top, outside the App component
let eventId = 0;

function App() {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const [ledState, setLedState] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ws, setWs] = useState(null);

  const addEvent = useCallback((newEvent) => {
    setEvents((prevEvents) => {
      // Add new event and sort by timestamp descending
      const updatedEvents = [newEvent, ...prevEvents];
      updatedEvents.sort((a, b) => b.timestamp - a.timestamp);
      // Keep only the last 100 events
      return updatedEvents.slice(0, 100);
    });
  }, []);

  const connectWebSocket = useCallback(() => {
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
        addEvent({
          id: ++eventId, // Unique incrementing event key
          data: event.data,
          timestamp: data.timestamp || Date.now(),
          timestampFormatted:
            data.timestamp_formatted ||
            new Date().toLocaleString("en-US", {
              hour: "numeric",
              minute: "numeric",
              second: "numeric",
              fractionalSecondDigits: 3,
              hour12: true
            }),
          source: "Server"
        });
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
  }, [addEvent]);

  // Initial connection
  useEffect(() => {
    const socket = connectWebSocket();
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [connectWebSocket]);

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
  }, [connected, ws, connectWebSocket]);

  const sendCommand = (command, data = {}) => {
    if (ws && connected) {
      const timestamp = Date.now();
      const timestampFormatted = new Date(timestamp).toLocaleString("en-US", {
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        fractionalSecondDigits: 3,
        hour12: true
      });

      const message = JSON.stringify({
        event: command,
        timestamp: timestamp,
        timestamp_formatted: timestampFormatted,
        ...data
      });
      ws.send(message);

      // Log the sent event
      addEvent({
        id: ++eventId, // Unique incrementing event key
        data: message,
        timestamp: timestamp,
        timestampFormatted: timestampFormatted,
        source: "Client"
      });
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

  const isKiosk =
    new URLSearchParams(window.location.search).get("isKiosk") === "true";

  return (
    <StyleSheetManager shouldForwardProp={isPropValid}>
      <Container>
        <Page isKiosk={isKiosk}>
          <Header>AI Phone Remote Control</Header>
          <StatusIndicators>
            <SocketServerStatus isOn={connected}>
              <StatusIndicator
                color={connected ? "#4CAF50" : "rgba(0, 0, 0, 0.5)"}
              />
              {connected ? "Connected" : "Connecting..."}
            </SocketServerStatus>
            {connected && (
              <LedStatus isOn={ledState}>
                <StatusIndicator color={ledState ? "#f44336" : "#9e9e9e"} />
                LED {ledState ? "ON" : "OFF"}
              </LedStatus>
            )}
          </StatusIndicators>
          {connected && (
            <Content>
              <ButtonContainer isKiosk={isKiosk}>
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
                      <EventItemHeader>
                        <EventItemKeyValuePair>
                          <EventItemKey>source</EventItemKey>
                          <EventItemValue>{event.source}</EventItemValue>
                        </EventItemKeyValuePair>
                        <Timestamp>{event.timestampFormatted}</Timestamp>
                      </EventItemHeader>
                      {Object.entries(JSON.parse(event.data)).map(
                        ([key, value]) => {
                          // Skip timestamp fields
                          if (
                            key === "timestamp" ||
                            key === "timestamp_formatted"
                          ) {
                            return null;
                          }
                          return (
                            <EventItemKeyValuePair key={key}>
                              <EventItemKey>{key}</EventItemKey>
                              <EventItemValue>
                                {typeof value === "object"
                                  ? JSON.stringify(value)
                                  : value}
                              </EventItemValue>
                            </EventItemKeyValuePair>
                          );
                        }
                      )}
                    </EventItemKeyValuePairs>
                  </EventItem>
                ))}
              </EventList>
            </Content>
          )}
        </Page>
      </Container>
    </StyleSheetManager>
  );
}

export default App;
