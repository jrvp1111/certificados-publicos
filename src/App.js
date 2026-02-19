import { BrowserRouter, Routes, Route } from "react-router-dom";
import VerifyCertificate from "./VerifyCertificate";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/verify/:token" element={<VerifyCertificate />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
