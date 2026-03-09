import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import katex from "katex";
import "katex/dist/katex.min.css";
import Editor from "@monaco-editor/react";

interface WhiteboardProps {
  roomId?: string;
}

type WsMessage =
  | { type: "draft_update"; content: string; author: string }
  | {
      type: "add_block";
      id: string;
      content: string;
      author: string;
      createdAt: number;
    }
  | { type: "clear_all" };

interface Block {
  id: string;
  content: string;
  author: string;
  createdAt: number;
}

const Whiteboard: React.FC<WhiteboardProps> = ({ roomId: propRoomId }) => {
  const params = useParams<{ id: string }>();
  const roomId = params.id ?? propRoomId;

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [myInput, setMyInput] = useState("");

  //useRefは再レンダリングに影響を与えないデータを保持するために使う
  const myName = useRef(`User_${Math.floor(Math.random() * 1000)}`).current;
  const ws = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const editorRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [blocks, drafts]);

  useEffect(() => {
    ws.current = new WebSocket(`ws://localhost:8080/ws/${roomId}`);

    //sendでwebsocketで繋がっているclientに対して命令(type)を送るが、その時の処理
    ws.current.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as WsMessage;

        if (data.type === "add_block") {
          setBlocks((prev) => {
            if (prev.some((b) => b.id === data.id)) return prev;
            return [
              ...prev,
              {
                id: data.id,
                content: data.content,
                author: data.author,
                createdAt: data.createdAt,
              },
            ];
          });
          setDrafts((prev) => {
            const newDrafts = { ...prev };
            delete newDrafts[data.author];
            return newDrafts;
          });
        } else if (data.type === "draft_update") {
          if (data.author === myName) return;

          setDrafts((prev) => {
            if (data.content === "") {
              const newDrafts = { ...prev };
              delete newDrafts[data.author];
              return newDrafts;
            }
            return { ...prev, [data.author]: data.content };
          });
        } else if (data.type === "clear_all") {
          setBlocks([]);
        }
      } catch (e) {
        console.error("無効なJSONを受信:", e);
      }
    };

    return () => {
      if (ws.current) ws.current.close();
    };
  }, [roomId, myName]);

  //メッセージ送信処理
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    editor.addCommand(monaco.KeyCode.Enter, () => {
      const currentVal = editor.getValue();
      if (!currentVal.trim()) return;

      const newBlock: WsMessage = {
        type: "add_block",
        id: Date.now().toString(),
        content: currentVal,
        author: myName,
        createdAt: Date.now(),
      };

      setBlocks((prev) => [...prev, newBlock as Block]);

      setMyInput(""); //myinputの中身にtext入れる→useStateで更新
      editor.setValue("");

      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify(newBlock)); //メッセージを送信
        ws.current.send(
          JSON.stringify({ type: "draft_update", content: "", author: myName }) //websocketで全員にupdateすることを要請
        );
      }
    });

    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
      editor.trigger("keyboard", "type", { text: "\n" });
    });
  };

  //同期（他のメンバーに打ってる内容をリアルタイムで送信）
  const handleEditorChange = (value: string | undefined) => {
    const text = value || ""; //valueに値入ってたらそのまま代入、undefinedなら虚無を代入
    setMyInput(text);
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const msg: WsMessage = {
        type: "draft_update",
        content: text,
        author: myName,
      };
      ws.current.send(JSON.stringify(msg));
    }
  };

  //引用処理
  const handleDoubleClick = (content: string) => {
    setMyInput(content);
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({ type: "draft_update", content, author: myName })
      );
    }
    editorRef.current?.focus();
  };

  //全削除
  const handleDeleteBlocks = () => {
    setBlocks([]);
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "clear_all" }));
    }
  };

  //フロント部分
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100%",
        backgroundColor: "#f5f5f5",
      }}
    >
      <div
        style={{
          padding: "10px 20px",
          backgroundColor: "#fff",
          borderBottom: "1px solid #ccc",
        }}
      >
        <h2>
          Room: {roomId}{" "}
          <span style={{ fontSize: "14px", color: "#666" }}>
            (You: {myName})
            <button onClick={() => handleDeleteBlocks()}>全削除</button>
          </span>
        </h2>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {blocks.map((b) => (
          <div
            key={b.id}
            onDoubleClick={() => handleDoubleClick(b.content)}
            style={{
              marginBottom: "20px",
              padding: "15px",
              backgroundColor: "#fff",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              cursor: "pointer",
            }}
            title="ダブルクリックで引用"
          >
            <div
              style={{ fontSize: "12px", color: "#888", marginBottom: "8px" }}
            >
              {b.author}
            </div>
            <div
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(b.content.replace(/\n/g, "\\\\"), {
                  displayMode: true,
                  throwOnError: false,
                }),
              }}
            />
          </div>
        ))}

        {Object.entries(drafts).map(([author, content]) => (
          <div
            key={author}
            style={{
              marginBottom: "20px",
              padding: "15px",
              backgroundColor: "#e9f5ff",
              borderLeft: "4px solid #007bff",
              borderRadius: "4px",
              opacity: 0.8,
            }}
          >
            <div
              style={{
                fontSize: "12px",
                color: "#007bff",
                marginBottom: "8px",
              }}
            >
              {author} が入力中...
            </div>
            <div
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(
                  (content || "\\text{typing...}").replace(/\n/g, "\\\\"),
                  { displayMode: true, throwOnError: false }
                ),
              }}
            />
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div
        style={{
          padding: "20px",
          backgroundColor: "#fff",
          borderTop: "1px solid #ccc",
          height: "150px",
        }}
      >
        <div style={{ marginBottom: "10px", fontSize: "12px", color: "#666" }}>
          Enter で確定 (Shift + Enter で改行) / 過去の数式をダブルクリックで引用
        </div>
        <div
          style={{
            border: "1px solid #ccc",
            borderRadius: "4px",
            overflow: "hidden",
            height: "80px",
          }}
        >
          <Editor
            height="100%"
            defaultLanguage="latex"
            value={myInput}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: false },
              lineNumbers: "off",
              scrollBeyondLastLine: false,
              wordWrap: "on",
              padding: { top: 10, bottom: 10 },
              fontSize: 16,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Whiteboard;
