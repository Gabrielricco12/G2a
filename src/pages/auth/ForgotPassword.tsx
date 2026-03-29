import { Button, LoadingOverlay, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconArrowLeft, IconAt } from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';

export function ForgotPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: { email: '' },
    validate: {
      email: (val) => (/^\S+@\S+$/.test(val) ? null : 'Email inválido'),
    },
  });

  const handleReset = async (values: typeof form.values) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success('E-mail enviado!', {
        description: 'Verifique sua caixa de entrada para redefinir a senha.'
      });
      navigate('/login');
    } catch (err: any) {
      toast.error('Erro ao processar', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f0f4f8] relative overflow-hidden flex items-center justify-center p-4">
      {/* Blobs de fundo dinâmicos */}
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vh] h-[40vh] bg-purple-200/40 rounded-full blur-[80px] animate-blob"></div>
      
      <div className="w-full max-w-md z-10 relative">
        <div className="backdrop-blur-xl bg-white/40 border border-white/50 shadow-2xl rounded-3xl p-8 sm:p-10">
          <LoadingOverlay visible={loading} overlayProps={{ radius: "lg", blur: 2 }} />
          
          <div className="text-center mb-8">
            <Title order={2} className="text-2xl font-bold text-slate-800">Recuperar Senha</Title>
            <Text c="dimmed" size="sm" mt="sm">
              Enviaremos um link de recuperação para o seu e-mail cadastrado.
            </Text>
          </div>

          <form onSubmit={form.onSubmit(handleReset)} className="space-y-6">
            <TextInput 
              label="E-mail"
              placeholder="seu@email.com" 
              required 
              size="md"
              leftSection={<IconAt size={18} />}
              {...form.getInputProps('email')}
            />

            <Button 
              fullWidth 
              size="lg" 
              radius="xl" 
              type="submit" 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg"
            >
              Enviar Link
            </Button>
          </form>

          <div className="mt-8 text-center">
            <Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
              <IconArrowLeft size={16} />
              Voltar para o Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}