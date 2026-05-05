import { Navigate, Route, Routes } from "react-router-dom";
import Intake from "./pages/Intake";
import Opportunities from "./pages/Opportunities";
import Workspace from "./pages/Workspace";
import Tracker from "./pages/Tracker";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Intake />} />
      <Route path="/opportunities" element={<Opportunities />} />
      <Route path="/workspace/:opportunityId" element={<Workspace />} />
      <Route path="/tracker" element={<Tracker />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
