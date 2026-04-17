import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("inv_token"));
  const [user,  setUser]  = useState(() => localStorage.getItem("inv_user"));

  const login = (tok, username) => {
    localStorage.setItem("inv_token", tok);
    localStorage.setItem("inv_user",  username);
    setToken(tok);
    setUser(username);
  };

  const logout = () => {
    localStorage.removeItem("inv_token");
    localStorage.removeItem("inv_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuth: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);