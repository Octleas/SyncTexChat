import React from "react";
import { useNavigate } from "react-router-dom";

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
      <button onClick={handleCreateRoom}>ルームを作成</button>
    </div>
  );
};
