import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@yamada-ui/react";

export const Home: React.FC = () => {
  const navigate = useNavigate();

  const handleCreateRoom = () => {
    const id = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    navigate(`/room/${id}`);
    alert(`Roomを作成しました: ${window.location.origin}/room/${id}`);
  };

  return (
    <div style={{ padding: "20px" }}>
      <p>This is Homepage.</p>
      <Button onClick={handleCreateRoom}>ルームを作成</Button>
    </div>
  );
};
