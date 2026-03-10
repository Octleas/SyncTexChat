import React from "react";
import { useNavigate } from "react-router-dom";
import { Button, Heading, VStack, Text, HStack, Input } from "@yamada-ui/react";

export const Home: React.FC = () => {
  const navigate = useNavigate();

  const handleCreateRoom = () => {
    const id = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    navigate(`/room/${id}`);
  };

  return (
    <VStack gap="md" alignItems="center" justifyContent="center" height="100vh">
      <Heading as="h1" size="2xl">
        SyncTexChatへようこそ
      </Heading>
      <Text color="fg.muted">ルームIDを共有して, Texが使える議論をしよう.</Text>
      <HStack
        gap="lg"
        alignItems="center"
        justifyContent="center"
        w="full"
        flexWrap={{ base: "wrap", md: "nowrap" }}
      >
        <Button
          colorScheme="primary"
          size="lg"
          onClick={handleCreateRoom}
          flexShrink={0}
        >
          ルームを作成
        </Button>

        <Text color="fg.muted" whiteSpace="nowrap">
          または
        </Text>
        <Input
          placeholder="ルームIDを入力"
          size="lg"
          maxW="160px"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const id = (e.target as HTMLInputElement).value;
              if (id.trim() !== "") {
                navigate(`/room/${id}`);
              }
            }
          }}
        />
      </HStack>
    </VStack>
  );
};
