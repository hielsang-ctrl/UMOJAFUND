import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout.jsx";
import OverviewPage from "./pages/OverviewPage.jsx";
import ContributionsPage from "./pages/ContributionsPage.jsx";
import ExpensesPage from "./pages/ExpensesPage.jsx";
import IdeasAndProofPage from "./pages/IdeasAndProofPage.jsx";
import SavingsPage from "./pages/SavingsPage.jsx";
import AboutPage from "./pages/AboutPage.jsx";
import ContactsPage from "./pages/ContactsPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="contributions" element={<ContributionsPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="proof" element={<IdeasAndProofPage />} />
        <Route path="savings" element={<SavingsPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
