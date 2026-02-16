import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import AdminUsers from './AdminUsers';

const AdminGuard: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsAdmin(false);
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setIsAdmin(payload.role === 'admin');
    } catch {
      setIsAdmin(false);
    }
  }, []);

  if (isAdmin === null) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[200px]">
        <div className="animate-pulse text-slate-400">Yükleniyor...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AdminUsers />;
};

export default AdminGuard;
