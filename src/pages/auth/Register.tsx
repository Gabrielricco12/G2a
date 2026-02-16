import {
  ActionIcon,
  Button,
  LoadingOverlay,
  PasswordInput,
  Select,
  Text,
  TextInput,
  Title
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconArrowLeft, IconAt, IconIdBadge, IconLock, IconUser } from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';

export function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
      fullName: '',
      crfa: '',
      regiao: '',
    },
    validate: {
      email: (val) => (/^\S+@\S+$/.test(val) ? null : 'Email inválido'),
      password: (val) => (val.length < 6 ? 'Mínimo 6 caracteres' : null),
      fullName: (val) => (val.length < 3 ? 'Nome muito curto' : null),
      crfa: (val) => (val ? null : 'Obrigatório'),
      regiao: (val) => (val ? null : 'Selecione a região'),
    },
  });

  const handleRegister = async (values: typeof form.values) => {
    setLoading(true);
    try {
      // 1. Criar usuário no Auth da Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
      });

      if (authError) throw authError;

      // 2. Inserir dados complementares no Profile
      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').insert([
          {
            id: authData.user.id,
            full_name: values.fullName,
            crfa_numero: values.crfa,
            crfa_regiao: values.regiao,
          },
        ]);
        if (profileError) throw profileError;
      }

      toast.success('Cadastro realizado!', { 
        description: 'Verifique seu e-mail para confirmar a conta antes de logar.' 
      });
      navigate('/login');
    } catch (err: any) {
      toast.error('Erro no cadastro', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f0f4f8] relative overflow-hidden flex items-center justify-center p-4">
      {/* Background Animado (Efeito Liquid) */}
      <div className="absolute top-[-10%] right-[-10%] w-[50vh] h-[50vh] bg-blue-200/40 rounded-full blur-[80px] animate-blob"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40vh] h-[40vh] bg-indigo-200/30 rounded-full blur-[80px] animate-blob animation-delay-2000"></div>
      
      <div className="w-full max-w-md z-10 relative">
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 shadow-2xl rounded-[2rem] p-8 sm:p-10">
          <LoadingOverlay visible={loading} overlayProps={{ radius: "xl", blur: 2 }} />
          
          <div className="flex justify-start mb-4">
             <Link to="/login">
                <ActionIcon variant="subtle" color="gray" radius="xl">
                    <IconArrowLeft size={20} />
                </ActionIcon>
             </Link>
          </div>

          <Title order={2} className="text-2xl font-bold text-slate-800 text-center">
            Começar agora
          </Title>
          <Text c="dimmed" size="sm" ta="center" mb="xl">
            Crie sua conta de fonoaudiólogo
          </Text>

          <form onSubmit={form.onSubmit(handleRegister)} className="space-y-4">
            <TextInput 
              label="Nome Completo" 
              placeholder="Como quer ser chamado?" 
              radius="md"
              leftSection={<IconUser size={18} />}
              {...form.getInputProps('fullName')} 
            />
            
            <div className="grid grid-cols-2 gap-4">
              <TextInput 
                label="Nº CRFa" 
                placeholder="0000" 
                radius="md"
                leftSection={<IconIdBadge size={18} />}
                {...form.getInputProps('crfa')} 
              />
              <Select 
                label="Região" 
                placeholder="Selecione" 
                radius="md"
                data={['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']}
                {...form.getInputProps('regiao')} 
              />
            </div>

            <TextInput 
              label="E-mail Profissional" 
              placeholder="seu@email.com" 
              radius="md"
              leftSection={<IconAt size={18} />}
              {...form.getInputProps('email')} 
            />

            <PasswordInput 
              label="Crie uma Senha" 
              placeholder="Mínimo 6 caracteres" 
              radius="md"
              leftSection={<IconLock size={18} />}
              {...form.getInputProps('password')} 
            />

            <Button 
              fullWidth 
              mt="xl" 
              size="lg" 
              radius="xl" 
              type="submit" 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl shadow-blue-500/20"
            >
              Finalizar Cadastro
            </Button>
          </form>

          <Text ta="center" mt="xl" size="sm" className="text-slate-600">
            Já possui acesso? <Link to="/login" className="text-blue-600 font-bold hover:underline">Entrar</Link>
          </Text>
        </div>
      </div>
    </div>
  );
}