import { createContext, useContext, useState, ReactNode } from 'react';

interface AdminContextType {
  isAdmin: boolean;
  adminToken: string | null;
  adminLogin: (token: string) => void;
  adminLogout: () => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [adminToken, setAdminToken] = useState<string | null>(() =>
    sessionStorage.getItem('adminToken')
  );

  const adminLogin = (token: string) => {
    sessionStorage.setItem('adminToken', token);
    setAdminToken(token);
  };

  const adminLogout = () => {
    sessionStorage.removeItem('adminToken');
    setAdminToken(null);
  };

  return (
    <AdminContext.Provider value={{ isAdmin: !!adminToken, adminToken, adminLogin, adminLogout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within AdminProvider');
  return context;
}
