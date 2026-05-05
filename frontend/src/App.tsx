import { Navigate, Route, Routes } from "react-router-dom";
import Hero from "./pages/Hero";
import Intake from "./pages/Intake";
import Opportunities from "./pages/Opportunities";
import Workspace from "./pages/Workspace";
import Tracker from "./pages/Tracker";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Hero />} />
      <Route path="/intake" element={<Intake />} />
      <Route path="/opportunities" element={<Opportunities />} />
      <Route path="/workspace/:opportunityId" element={<Workspace />} />
      <Route path="/tracker" element={<Tracker />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
