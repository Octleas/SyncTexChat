import { BrowserRouter, Routes, Route } from "react-router-dom";
import Whiteboard from "./Whiteboard";
import { Home } from "./Home";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:id" element={<Whiteboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
