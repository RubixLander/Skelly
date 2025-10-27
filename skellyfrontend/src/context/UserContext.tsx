import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

// Define el tipo de datos del usuario
interface User {
  name?: string;
  accessToken: any;
  user_id: string;
  display_email: string;
  nickname: string;
  bio?: string | null; // ✅ añadido
  custom_profile_image_url?: string | null; // ✅ añadido
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Proveedor del contexto
export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Recuperar el usuario del localStorage al cargar la página
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Establecer el usuario y guardarlo en el localStorage
  const handleSetUser = (user: User | null) => {
    setUser(user);
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser: handleSetUser }}>
      {children}
    </UserContext.Provider>
  );
};

// Hook para usar el contexto
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser debe ser usado dentro de un UserProvider');
  }
  return context;
};
