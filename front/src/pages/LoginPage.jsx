import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const { signin, errors: loginErrors, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const onSubmit = (data) => signin(data);

  useEffect(() => {
    if (isAuthenticated) navigate("/searcher");
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300">
      <div className="w-full h-full flex items-center justify-center p-6">
        <div className="bg-white shadow-2xl rounded-lg w-full max-w-lg p-10">
          
          {/* Encabezado */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-gray-800">Bienvenido</h1>
            <p className="text-gray-600 mt-2">Inicia sesión para acceder a tu cuenta</p>
          </div>

          {/* Mensajes de Error */}
          {loginErrors.map((error, i) => (
            <p key={i} className="text-sm text-red-600 bg-red-100 p-2 rounded-md mb-2">
              {error}
            </p>
          ))}

          {/* Formulario */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Campo Email */}
            <div>
              <Label htmlFor="email">Correo Electrónico:</Label>
              <Input
                id="email"
                type="email"
                placeholder="youremail@domain.tld"
                {...register("email", { required: "El correo es obligatorio" })}
                className={`mt-1 ${errors.email ? "border-red-500" : "border-gray-300"} w-full`}
              />
              {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
            </div>

            {/* Campo Contraseña */}
            <div>
              <Label htmlFor="password">Contraseña:</Label>
              <Input
                id="password"
                type="password"
                placeholder="Escribe tu contraseña"
                {...register("password", {
                  required: "La contraseña es obligatoria",
                  minLength: { value: 6, message: "Debe tener al menos 6 caracteres" },
                })}
                className={`mt-1 ${errors.password ? "border-red-500" : "border-gray-300"} w-full`}
              />
              {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>}
            </div>

            {/* Botón de Iniciar Sesión */}
            <Button className="w-full py-3 bg-blue-600 text-white font-medium rounded-md shadow-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 transition-all">
              Iniciar sesión
            </Button>
          </form>

          {/* Pie de Página */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              ¿No tienes una cuenta?{" "}
              <Link to="/register" className="text-blue-600 hover:underline hover:text-blue-800">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
