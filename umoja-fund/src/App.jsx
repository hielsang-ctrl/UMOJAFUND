import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import AppLayout from "./components/layout/AppLayout.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import OverviewPage from "./pages/OverviewPage.jsx";
import ContributionsPage from "./pages/ContributionsPage.jsx";
import ExpensesPage from "./pages/ExpensesPage.jsx";
import IdeasAndProofPage from "./pages/IdeasAndProofPage.jsx";
import SavingsPage from "./pages/SavingsPage.jsx";
import AboutPage from "./pages/AboutPage.jsx";
import ContactsPage from "./pages/ContactsPage.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { FundProvider } from "./context/FundContext.jsx";

// Everything except /login needs a signed-in user. The fund data is only fetched once someone is signed in.
function Protected() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-stone-100"><Loader2 className="animate-spin text-stone-400" size={32} /></div>;
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return (
    <FundProvider>
      <AppLayout />
    </FundProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Protected />}>
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
    </AuthProvider>
  );
}
