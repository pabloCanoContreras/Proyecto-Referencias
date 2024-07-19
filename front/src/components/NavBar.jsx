import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ButtonLink } from "./ui/ButtonLink";

export function Navbar() {
  const { isAuthenticated, logout, user } = useAuth();

  return (
    <nav className="bg-zinc-700 my-3 flex flex-col md:flex-row justify-between items-center py-5 px-6 md:px-10 rounded-lg">
      <h1 className="text-2xl font-bold mb-3 md:mb-0">
        <Link to={isAuthenticated ? "/searcher" : "/"} className="text-white">
          OPCIONES
        </Link>
      </h1>
      <ul className="flex flex-col md:flex-row gap-y-2 md:gap-x-2">
        {isAuthenticated ? (
          <>
            <li className="text-white">
              Bienvenido {user.username}
            </li>
            <li>
              <Link to="/" onClick={() => logout()} className="text-white hover:text-gray-300">
                Logout
              </Link>
            </li>
          </>
        ) : (
          <>
            <li>
              <ButtonLink to="/login" className="text-white text-sm md:text-base">Login</ButtonLink>
            </li>
            <li>
              <ButtonLink to="/register" className="text-white text-sm md:text-base">Register</ButtonLink>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}
