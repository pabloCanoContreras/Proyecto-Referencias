import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { Message } from "../components/ui/Message";
import { useAuth } from "../context/AuthContext";

function RegisterPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const { signup, isAuthenticated, errors: registerErrors } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate("/");
  }, [isAuthenticated, navigate]);

  const onSubmit = handleSubmit(async (values) => {
    signup(values);
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300">
      <div className="w-full h-full flex items-center justify-center p-6">
        <div className="bg-white shadow-2xl rounded-lg w-full max-w-lg p-10">
          {/* Encabezado */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-gray-800">
              Crear Cuenta
            </h1>
            <p className="text-gray-600 mt-2">
              Regístrate para empezar a usar nuestra plataforma
            </p>
          </div>

          {/* Mensajes de Error */}
          {registerErrors.length > 0 && (
            <div className="mb-4">
              {registerErrors.map((error, i) => (
                <Message message={error} key={i} />
              ))}
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={onSubmit} className="space-y-6">
            {/* Campo Username */}
            <div>
              <Label htmlFor="username">Nombre de Usuario:</Label>
              <Input
                id="username"
                type="text"
                name="username"
                placeholder="Escribe tu nombre"
                {...register("username", {
                  required: "El nombre de usuario es obligatorio",
                })}
              />
              {errors.username && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* Campo Email */}
            <div>
              <Label htmlFor="email">Correo Electrónico:</Label>
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="youremail@domain.tld"
                {...register("email", {
                  required: "El correo es obligatorio",
                })}
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Campo Password */}
            <div>
              <Label htmlFor="password">Contraseña:</Label>
              <Input
                id="password"
                type="password"
                name="password"
                placeholder="********"
                {...register("password", {
                  required: "La contraseña es obligatoria",
                  minLength: {
                    value: 6,
                    message: "La contraseña debe tener al menos 6 caracteres",
                  },
                })}
              />
              {errors.password && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Campo Confirmar Password */}
            <div>
              <Label htmlFor="confirmPassword">Confirmar Contraseña:</Label>
              <Input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                placeholder="********"
                {...register("confirmPassword", {
                  required: "Debes confirmar tu contraseña",
                  validate: (value) =>
                    value === watch("password") ||
                    "Las contraseñas no coinciden",
                })}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Botón de Registro */}
            <Button className="w-full py-3 bg-blue-600 text-white font-medium rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all">
              Crear Cuenta
            </Button>
          </form>

          {/* Pie de Página */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              ¿Ya tienes una cuenta?{" "}
              <a
                href="/login"
                className="text-blue-600 hover:underline hover:text-blue-800"
              >
                Inicia sesión aquí
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
