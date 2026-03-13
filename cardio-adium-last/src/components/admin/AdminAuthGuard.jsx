import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/auth.context';
import { Skeleton } from '../ui/skeleton';

export function AdminAuthGuard({ children }) {
  const navigate = useNavigate();
  const { user, isUserLoading } = useAuthContext();

  useEffect(() => {
    if (!isUserLoading && !user) {
      navigate('/admin/login');
      return;
    }
    if (!isUserLoading && user && !user.isAdmin) {
      navigate('/dashboard');
    }
  }, [user, isUserLoading, navigate]);

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-12 w-64" />
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return null;
  }

  return children;
}
