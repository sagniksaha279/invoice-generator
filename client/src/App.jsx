import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import InvoiceForm from "./pages/InvoiceForm";

function PrivateRoute({ children }) {
  const { isAuth } = useAuth();
  return isAuth ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { isAuth } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={isAuth ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<PrivateRoute><InvoiceForm /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: "'Lato', sans-serif",
              borderRadius: "12px",
              background: "#fffdf8",
              color: "#1c1610",
              border: "1px solid rgba(160,130,80,0.30)",
              boxShadow: "0 8px 32px rgba(80,50,10,0.14)",
            },
            success: { iconTheme: { primary: "#2e7d5e", secondary: "#fff" } },
            error:   { iconTheme: { primary: "#c0392b", secondary: "#fff" } },
          }}
        />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}