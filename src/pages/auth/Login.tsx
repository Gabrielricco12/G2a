import {
  Anchor,
  Button,
  LoadingOverlay,
  PasswordInput,
  Text,
  TextInput,
  Title
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconArrowRight, IconAt, IconLock, IconUserPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';

export function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email inválido'),
      password: (value) => (value.length < 6 ? 'Mínimo 6 caracteres' : null),
    },
  });

  const handleLogin = async (values: typeof form.values) => {
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (authError) throw authError;
      toast.success('Bem-vindo de volta!');
      navigate('/portal'); 
    } catch (err: any) {
      toast.error('Erro de autenticação', {
        description: 'Verifique seus dados ou se já confirmou o e-mail.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f0f4f8] relative overflow-hidden flex items-center justify-center p-4">
      {/* Elementos Líquidos de Fundo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vh] h-[40vh] bg-blue-200/50 rounded-full blur-[64px] animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[35vh] h-[35vh] bg-purple-200/40 rounded-full blur-[64px] animate-blob animation-delay-2000"></div>
      
      <div className="w-full max-w-md z-10 relative">
        <div className="backdrop-blur-xl bg-white/40 border border-white/50 shadow-2xl rounded-[2.5rem] p-8 sm:p-10">
          <LoadingOverlay visible={loading} overlayProps={{ radius: "lg", blur: 2 }} />
          
          <div className="text-center mb-8">
            <img src="/logo.png" alt="G2A Logo" className="h-20 mx-auto mb-4 object-contain" />
            <Title order={1} className="text-2xl font-bold text-slate-800">Portal G2A</Title>
            <Text c="dimmed" size="sm">Gestão Audiológica Profissional</Text>
          </div>

          <form onSubmit={form.onSubmit(handleLogin)} className="space-y-4">
            <TextInput 
              size="md"
              radius="lg"
              placeholder="E-mail" 
              required 
              leftSection={<IconAt size={18} />}
              {...form.getInputProps('email')}
            />
            
            <div className="space-y-1">
              <PasswordInput 
                size="md"
                radius="lg"
                placeholder="Senha" 
                required 
                leftSection={<IconLock size={18} />}
                {...form.getInputProps('password')}
              />
              <div className="flex justify-end">
                <Anchor 
                  component={Link} 
                  to="/forgot-password" 
                  size="xs" 
                  className="text-slate-500 hover:text-blue-600 transition-colors"
                >
                  Esqueceu a senha?
                </Anchor>
              </div>
            </div>
            
            <Button 
              fullWidth 
              size="lg" 
              radius="xl"
              type="submit" 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg mt-4"
              rightSection={<IconArrowRight size={20} />}
            >
              Entrar
            </Button>
          </form>

          {/* Divisor Suave */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-300/50"></span></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-transparent px-2 text-slate-500 font-medium">Ou</span></div>
          </div>

          {/* Botão de Registro (Outline Suave) */}
          <Button 
            fullWidth 
            variant="outline" 
            size="md" 
            radius="xl" 
            component={Link} 
            to="/register"
            leftSection={<IconUserPlus size={18} />}
            className="border-blue-400 text-blue-700 hover:bg-blue-50/50 transition-all"
          >
            Criar conta de fonoaudiólogo
          </Button>

          <Text ta="center" mt="xl" size="xs" c="dimmed" className="opacity-70">
            G2A HealthTech • 2026
          </Text>
        </div>
      </div>
    </div>
  );
}