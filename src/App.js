import React from "react";
import styled from "styled-components";
import WebSocketEvents from "./WebSocketEvents";

const Page = styled.div`
  min-height: 100vh;
  padding: 20px;
  background-color: #f0f2f5;
`;

function App() {
  return (
    <Page>
      <WebSocketEvents />
    </Page>
  );
}

export default App;
