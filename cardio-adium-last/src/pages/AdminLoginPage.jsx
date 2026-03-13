import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../components/ui/form';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { useToast } from '../hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useAuthContext } from '../contexts/auth.context';
import { adminLoginSchema } from '../lib/auth-schemas';
import { authenticateAdmin } from '../services/auth.service';
import { LogoHead } from '../components/logo';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthContext();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const form = useForm({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      identifier: '',
      password: '',
      terms: false,
    },
  });

  async function onSubmit(data) {
    if (!data.terms) {
      setFormError('Debe aceptar los términos y condiciones para poder iniciar sesión.');
      toast({
        title: 'Términos y Condiciones',
        description: 'Debe aceptar los términos y condiciones para poder iniciar sesión.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const result = await authenticateAdmin(data.identifier, data.password);

      if (result.success && result.user) {
        if (!result.user.isAdmin) {
          setFormError('Acceso denegado. Se requieren privilegios de administrador.');
          toast({
            title: 'Error de Acceso',
            description: 'Acceso denegado. Se requieren privilegios de administrador.',
            variant: 'destructive',
          });
          return;
        }

        login(result.user);

        toast({
          title: '¡Inicio de Sesión Exitoso!',
          description: 'Redirigiendo al panel de administración...',
        });

        navigate('/admin');
      } else {
        const errorMessage = result.error || 'Error al iniciar sesión.';
        setFormError(errorMessage);
        toast({
          title: 'Error de Inicio de Sesión',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
      setFormError(errorMessage);
      toast({
        title: 'Error de Inicio de Sesión',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col">
      <header className="w-full px-6 sm:px-8 py-4 flex items-center justify-between relative z-10">
        <LogoHead className="w-[88px] h-[88px]" />
        <Link to="/" className="text-sm text-gray-600 hover:text-gray-800">
          Volver al inicio
        </Link>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 py-8 relative z-10">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Panel de Administración</h1>
            <p className="text-sm text-gray-600 mb-6">Inicie sesión con sus credenciales de administrador</p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {formError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}
                <FormField
                  control={form.control}
                  name="identifier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo Electrónico</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="admin@ejemplo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="********" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="terms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="cursor-pointer">Acepto los términos y condiciones</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          He leído y acepto la{' '}
                          <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-[#2E61FA] hover:underline font-medium">
                            Política de Privacidad
                          </Link>
                          .
                        </p>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-16 sm:h-20 text-lg sm:text-xl font-bold rounded-xl bg-[#2E61FA] hover:bg-[#365899] text-white shadow-md"
                >
                  {isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </main>
    </div>
  );
}
