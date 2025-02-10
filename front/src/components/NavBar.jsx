import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./SideBar.css"; // Asegúrate de que los estilos del Sidebar estén incluidos.
import { ButtonLink } from "./ui/ButtonLink";

export function Navbar() {
  const { isAuthenticated, logout, user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <>
      {/* Barra de navegación */}
      <nav className="navbar bg-primary text-white d-flex justify-content-between align-items-center py-3 px-4">

        {/* Enlaces de autenticación (alineados a la derecha) */}
        <div className="auth-links d-flex align-items-center gap-3 ms-auto">
          {isAuthenticated ? (
            <>
              <span className="welcome-text fw-bold">
                Bienvenido, {user.username}
              </span>
              <Link
                to="/"
                onClick={logout}
                className="btn btn-outline-light text-white"
              >
                Logout
              </Link>
            </>
          ) : (
            <>
              <ButtonLink
                to="/login"
                className="btn btn-outline-light text-white"
              >
                Login
              </ButtonLink>
              <ButtonLink
                to="/register"
                className="btn btn-light text-primary"
              >
                Register
              </ButtonLink>
            </>
          )}
        </div>
      </nav>

      {/* Overlay */}
      {isSidebarOpen && <div className="overlay" onClick={toggleSidebar}></div>}
    </>
  );
}
