import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import katex from "katex";
import "katex/dist/katex.min.css";
import Editor from "@monaco-editor/react";
import {
  Input,
  Button,
  Heading,
  Text,
  Field,
  Box,
  Flex,
  HStack,
  VStack,
} from "@yamada-ui/react";

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

  const [isJoined, setIsJoined] = useState(false); //入室したかどうか
  const [inputName, setInputName] = useState(""); //入力中
  const [myName, setMyName] = useState(""); //確定

  //useRefは再レンダリングに影響を与えないデータを保持するために使う
  const ws = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [blocks, drafts]);

  useEffect(() => {
    if (!isJoined) return;
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
  }, [roomId, myName, isJoined]);

  if (!isJoined) {
    return (
      <VStack
        gap="lg"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <VStack as="form" gap="lg" maxW="md" mx="auto" p="md">
          <VStack gap="xs" alignItems="center">
            <Heading as="h2" size="xl">
              名前を入力して入室
            </Heading>
            <Text color="fg.muted">Room ID: {roomId}</Text>
          </VStack>

          <Field.Root label="名前を入力してください。">
            <Input
              onChange={(e) => setInputName(e.target.value)}
              autoComplete="username"
              placeholder="未入力の場合は guest"
            />
          </Field.Root>

          <Button
            colorScheme="primary"
            onClick={() => {
              setMyName(inputName.trim() || "guest");
              setIsJoined(true);
            }}
          >
            入室する
          </Button>
        </VStack>
      </VStack>
    );
  }

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

  return (
    <Flex direction="column" h="100vh" w="full" bg="blackAlpha.50">
      {/* ヘッダーエリア */}
      <HStack
        px="md"
        py="sm"
        bg="bg"
        borderBottomWidth="1px"
        justifyContent="space-between"
      >
        <HStack alignItems="baseline">
          <Heading as="h2" size="md">
            Room: {roomId}
          </Heading>
          <Text fontSize="sm" color="fg.muted">
            (You: {myName})
          </Text>
        </HStack>
        <Button
          colorScheme="danger"
          size="sm"
          variant="outline"
          onClick={() => handleDeleteBlocks()}
        >
          全削除
        </Button>
      </HStack>

      {/* チャット（数式）表示エリア */}
      <Box flex={1} overflowY="auto" p="md">
        <VStack gap="md">
          {/* 確定済みのブロック */}
          {blocks.map((b) => (
            <Box
              key={b.id}
              onDoubleClick={() => handleDoubleClick(b.content)}
              p="md"
              bg="bg"
              rounded="md"
              shadow="sm"
              cursor="pointer"
              transitionProperty="all"
              _hover={{ shadow: "md", transform: "translateY(-2px)" }} // ホバー時のちょっとしたアニメーション
              title="ダブルクリックで引用"
            >
              <Text fontSize="xs" color="fg.muted" mb="sm">
                {b.author}
              </Text>
              <Box
                dangerouslySetInnerHTML={{
                  __html: katex.renderToString(
                    b.content.replace(/\n/g, "\\\\"),
                    {
                      displayMode: true,
                      throwOnError: false,
                    }
                  ),
                }}
              />
            </Box>
          ))}

          {/* 入力中（ドラフト）のブロック */}
          {Object.entries(drafts).map(([author, content]) => (
            <Box
              key={author}
              p="md"
              bg="blue.50"
              borderLeftWidth="4px"
              borderColor="blue.500"
              rounded="md"
              opacity={0.8}
              _dark={{ bg: "blue.900", borderColor: "blue.300" }} // ダークモード対応のおまけ
            >
              <Text
                fontSize="xs"
                color="blue.500"
                mb="sm"
                _dark={{ color: "blue.300" }}
              >
                {author} が入力中...
              </Text>
              <Box
                dangerouslySetInnerHTML={{
                  __html: katex.renderToString(
                    (content || "\\text{typing...}").replace(/\n/g, "\\\\"),
                    { displayMode: true, throwOnError: false }
                  ),
                }}
              />
            </Box>
          ))}
          <Box ref={messagesEndRef} />
        </VStack>
      </Box>

      {/* 入力エリア */}
      <Box p="md" bg="bg" borderTopWidth="1px" h="150px">
        <Text mb="sm" fontSize="xs" color="fg.muted">
          Enter で確定 (Shift + Enter で改行) / 過去の数式をダブルクリックで引用
        </Text>
        <Box borderWidth="1px" rounded="md" overflow="hidden" h="80px">
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
        </Box>
      </Box>
    </Flex>
  );
};

export default Whiteboard;
