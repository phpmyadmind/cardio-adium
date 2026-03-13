import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/auth.context";
import { Toaster } from "./components/ui/toaster";

import HomePage from "./pages/HomePage";
import TermsPage from "./pages/TermsPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import DashboardLayout from "./components/DashboardLayout";
import { AgendaView } from "./components/agenda-view";
import { SpeakersView } from "./components/speakers-view";
import { QaView } from "./components/qa-view";
import { SurveysVotingView } from "./components/surveys-voting-view";
import { ExecutiveReportView } from "./components/executive-report-view";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminSettingsPage from "./pages/AdminSettingsPage";
import { AdminPanel } from "./components/admin/AdminPanel";
import { AdminAuthGuard } from "./components/admin/AdminAuthGuard";

import "./App.css";

function App() {
  return (
    <AuthProvider>
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${process.env.PUBLIC_URL || ''}/fondo.png)` }}
        aria-hidden
      />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Navigate to="/" replace />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route
            path="/dashboard"
            element={
              <DashboardLayout>
                <DashboardPage />
              </DashboardLayout>
            }
          />
          <Route
            path="/dashboard/agenda"
            element={
              <DashboardLayout>
                <div className="p-4 sm:p-6 md:p-8">
                  <AgendaView />
                </div>
              </DashboardLayout>
            }
          />
          <Route
            path="/dashboard/speakers"
            element={
              <DashboardLayout>
                <div className="p-4 sm:p-6 md:p-8">
                  <SpeakersView />
                </div>
              </DashboardLayout>
            }
          />
          <Route
            path="/dashboard/preguntas"
            element={
              <DashboardLayout>
                <div className="p-4 sm:p-6 md:p-8">
                  <QaView />
                </div>
              </DashboardLayout>
            }
          />
          <Route
            path="/dashboard/encuestas"
            element={
              <DashboardLayout>
                <div className="p-4 sm:p-6 md:p-8">
                  <SurveysVotingView />
                </div>
              </DashboardLayout>
            }
          />
          <Route
            path="/dashboard/profile"
            element={
              <DashboardLayout>
                <ProfilePage />
              </DashboardLayout>
            }
          />
          <Route
            path="/estatistics"
            element={
              <DashboardLayout>
                <div className="p-4 sm:p-6 md:p-8">
                  <ExecutiveReportView />
                </div>
              </DashboardLayout>
            }
          />
          <Route
            path="/dashboard/informe-gerencial"
            element={
              <DashboardLayout>
                <div className="p-4 sm:p-6 md:p-8">
                  <ExecutiveReportView />
                </div>
              </DashboardLayout>
            }
          />
          <Route
            path="/dashboard/estadisticas"
            element={
              <DashboardLayout>
                <div className="p-4 sm:p-6 md:p-8">
                  <ExecutiveReportView />
                </div>
              </DashboardLayout>
            }
          />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin"
            element={
              <AdminAuthGuard>
                <div className="p-4 sm:p-6 md:p-8 min-h-screen">
                  <AdminPanel />
                </div>
              </AdminAuthGuard>
            }
          />
          <Route
            path="/admin/statistics"
            element={
              <AdminAuthGuard>
                <div className="p-4 sm:p-6 md:p-8 min-h-screen">
                  <AdminPanel />
                </div>
              </AdminAuthGuard>
            }
          />
          <Route path="/admin/register" element={<Navigate to="/admin/login" replace />} />
          <Route path="/admin/profile" element={<Navigate to="/admin" replace />} />
          <Route
            path="/admin/settings"
            element={
              <AdminAuthGuard>
                <AdminSettingsPage />
              </AdminAuthGuard>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
