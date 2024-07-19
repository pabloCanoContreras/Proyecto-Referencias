import { useEffect } from "react";
import { useForm } from 'react-hook-form';
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { useAuth } from "../context/AuthContext";


function LoginPage() {
    const { register, handleSubmit, formState: { errors }, } = useForm();
    const { signin, errors: loginErrors, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const onSubmit = (data) => signin(data);
    useEffect(() => {
      if (isAuthenticated) {
        navigate("/searcher");
      }
    }, [isAuthenticated]);


    return (
        <div className="h-[calc(100vh-100px)] flex items-center justify-center">
          <Card>
            {loginErrors.map((error, i) => (
              <Message message={error} key={i} />
            ))}
            <h1 className="text-2xl font-bold">Login</h1>
    
            <form onSubmit={handleSubmit(onSubmit)}>
              <Label htmlFor="email">Email:</Label>
              <Input
                label="Write your email"
                type="email"
                name="email"
                placeholder="youremail@domain.tld"
                {...register("email", { required: true })}
              />
              <p>{errors.email?.message}</p>
    
              <Label htmlFor="password">Password:</Label>
              <Input
                type="password"
                name="password"
                placeholder="Write your password"
                {...register("password", { required: true, minLength: 6 })}
              />
              <p>{errors.password?.message}</p>
    
              <Button>Login</Button>
            </form>
          </Card>
        </div>
      );
}

export default LoginPage;