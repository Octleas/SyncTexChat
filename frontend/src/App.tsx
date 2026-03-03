import { useState, useEffect, useRef } from "react";

function App() {
  const [messages, setMessages] = useState<string[]>([]);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    ws.current = new WebSocket("ws://localhost:8080/ws");
    ws.current.onopen = () => console.log("WebSocket Connected");
    ws.current.onmessage = (event) => {
      console.log("Received from server: ", event.data);
      setMessages((prev) => [...prev, event.data]);
    };
    return () => {
      ws.current?.close();
    };
  }, []);

  const sendMessage = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send("Hello WhiTex-Board!");
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>WhiTex-Board Connecting Test</h1>
      <button
        onClick={sendMessage}
        style={{ padding: "10px", fontSize: "16px" }}
      >
        Send Message
      </button>

      <div style={{ marginTop: "20px" }}>
        <h2>Server response:</h2>
        <ul>
          {messages.map((msg, index) => (
            <li key={index}>{msg}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
