import { useLocation, useNavigate } from 'react-router-dom';
import { LogoHead } from './logo';
import { Menu } from 'lucide-react';

export default function DashboardLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isMainDashboard = location.pathname === '/dashboard';

  return (
    <div className="min-h-screen relative">
      {!isMainDashboard && (
        <header className="w-full px-6 sm:px-8 py-4 flex items-center justify-between relative z-10 sticky top-0 bg-white/95 backdrop-blur">
          <LogoHead className="w-[64px] h-[64px]" />
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Volver al menú"
          >
            <Menu className="h-6 w-6 text-gray-800" />
          </button>
        </header>
      )}
      {children}
    </div>
  );
}
