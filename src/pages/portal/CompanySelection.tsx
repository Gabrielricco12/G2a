import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Container,
  Loader,
  LoadingOverlay,
  Modal,
  Paper,
  SimpleGrid,
  Text,
  TextInput,
  Title
} from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  IconArrowRight,
  IconBriefcase,
  IconBuilding,
  IconLogout,
  IconMapPin,
  IconPlus,
  IconSearch
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export function CompanySelection() {
  const { profile, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchingCnpj, setSearchingCnpj] = useState(false);

  // 1. Configuração do Formulário
  const form = useForm({
    initialValues: {
      razaoSocial: '',
      nomeFantasia: '',
      cnpj: '',
      cep: '',
      logradouro: '',
      cidade: '',
      estado: '',
    },
    validate: {
      razaoSocial: (val) => (val.length < 3 ? 'Nome muito curto' : null),
      cnpj: (val) => (val.replace(/\D/g, '').length !== 14 ? 'CNPJ deve ter 14 dígitos' : null),
    },
  });

  // 2. Busca automática via Brasil API
  const fetchCnpjData = async (value: string) => {
    const cleanCnpj = value.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) return;

    setSearchingCnpj(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (!response.ok) throw new Error();
      
      const data = await response.json();
      
      form.setFieldValue('razaoSocial', data.razao_social || '');
      form.setFieldValue('nomeFantasia', data.nome_fantasia || data.razao_social || '');
      form.setFieldValue('cep', data.cep || '');
      form.setFieldValue('logradouro', data.logradouro || '');
      form.setFieldValue('cidade', data.municipio || '');
      form.setFieldValue('estado', data.uf || '');
      
      toast.success('Dados da empresa localizados!');
    } catch (error) {
      toast.error('CNPJ não encontrado ou API indisponível', {
        description: 'Por favor, preencha os dados manualmente.'
      });
    } finally {
      setSearchingCnpj(false);
    }
  };

  // 3. Busca inicial das empresas no Supabase
  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('nome_fantasia');

      if (error) throw error;
      setCompanies(data || []);
    } catch (err: any) {
      toast.error('Erro ao carregar lista de empresas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // 4. Salvar Empresa no Banco
  const handleCreateCompany = async (values: typeof form.values) => {
    setCreating(true);
    try {
      const { error } = await supabase.from('companies').insert([
        {
          owner_id: user?.id,
          razao_social: values.razaoSocial,
          nome_fantasia: values.nomeFantasia,
          cnpj: values.cnpj.replace(/\D/g, ''),
          cep: values.cep,
          logradouro: values.logradouro,
          cidade: values.cidade,
          estado: values.estado,
        }
      ]);

      if (error) throw error;

      toast.success('Empresa cadastrada com sucesso!');
      setModalOpen(false);
      form.reset();
      fetchCompanies();
    } catch (err: any) {
      toast.error('Falha ao salvar no banco de dados');
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen w-full bg-[#f0f4f8] relative overflow-hidden flex flex-col p-4 sm:p-12">
      
      {/* Background Liquid Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vh] h-[50vh] bg-blue-200/30 rounded-full blur-[80px] animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vh] h-[40vh] bg-indigo-200/30 rounded-full blur-[80px] animate-blob animation-delay-2000"></div>

      <Container size="lg" className="z-10 w-full">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-12 gap-6">
          <div className="text-center sm:text-left">
            <Title order={1} className="text-3xl font-bold text-slate-800 tracking-tight">
              Olá, Fono. {profile?.full_name?.split(' ')[0]}
            </Title>
            <Text c="dimmed" size="lg" className="font-medium">
              Escolha uma unidade de atendimento
            </Text>
          </div>
          
          <div className="flex gap-4">
            <Button 
              leftSection={<IconPlus size={20} />} 
              radius="xl" 
              size="md"
              onClick={() => setModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
            >
              Nova Empresa
            </Button>
            <ActionIcon variant="white" color="red" size="xl" radius="xl" onClick={handleLogout} className="shadow-md border border-red-100">
              <IconLogout size={22} />
            </ActionIcon>
          </div>
        </div>

        <Box className="relative">
          <LoadingOverlay visible={loading} overlayProps={{ radius: "xl", blur: 2 }} />

          {companies.length > 0 ? (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
              {companies.map((company) => (
                <Paper 
                  key={company.id}
                  p="xl" 
                  radius="2rem" 
                  className="
                    backdrop-blur-xl bg-white/50 border border-white/60
                    hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer group
                    flex flex-col h-full
                  "
                  onClick={() => navigate(`/app/${company.id}/dashboard`)}
                >
                  <div className="flex justify-between items-start mb-6">
                    <Avatar size="lg" radius="1rem" className="bg-blue-500/10 text-blue-600">
                      <IconBuilding size={28} />
                    </Avatar>
                    <Badge variant="dot" color="blue" size="lg" radius="sm" className="bg-white/50">Ativo</Badge>
                  </div>
                  
                  <Title order={3} className="text-xl mb-1 text-slate-800 truncate group-hover:text-blue-700 transition-colors">
                    {company.nome_fantasia}
                  </Title>
                  <Text size="sm" c="dimmed" className="flex items-center gap-1 mb-6">
                    <IconMapPin size={14} /> {company.cidade ? `${company.cidade} - ${company.estado}` : 'Local não informado'}
                  </Text>

                  <div className="mt-auto pt-4 border-t border-slate-200/50 flex justify-between items-center">
                    <Text size="xs" fw={800} className="uppercase text-blue-600 tracking-widest">Gerenciar</Text>
                    <IconArrowRight size={18} className="text-blue-500 group-hover:translate-x-2 transition-transform" />
                  </div>
                </Paper>
              ))}
            </SimpleGrid>
          ) : !loading && (
            <Paper radius="3rem" p={60} className="bg-white/30 backdrop-blur-md border border-dashed border-slate-300 text-center">
              <IconBriefcase size={60} className="mx-auto text-slate-300 mb-6" />
              <Title order={3} c="slate.7" mb="xs">Nenhuma empresa cadastrada</Title>
              <Text c="dimmed" mb="xl">Comece agora adicionando seu primeiro cliente para gerenciar audiometrias.</Text>
              <Button variant="light" radius="xl" onClick={() => setModalOpen(true)}>Cadastrar Empresa</Button>
            </Paper>
          )}
        </Box>
      </Container>

      {/* Modal Liquid Glass de Cadastro */}
      <Modal 
        opened={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={<Text fw={800} size="xl" className="text-slate-800">Cadastrar Cliente</Text>}
        radius="2rem"
        size="md"
        centered
        overlayProps={{ backgroundOpacity: 0.4, blur: 8 }}
        classNames={{ content: 'backdrop-blur-2xl bg-white/80 border border-white' }}
      >
        <form onSubmit={form.onSubmit(handleCreateCompany)} className="space-y-4">
          <LoadingOverlay visible={creating} overlayProps={{ radius: "xl", blur: 2 }} />
          
          <TextInput 
            label="CNPJ" 
            placeholder="00.000.000/0000-00" 
            radius="md"
            required 
            {...form.getInputProps('cnpj')}
            onBlur={(e) => fetchCnpjData(e.target.value)}
            rightSection={searchingCnpj ? <Loader size="xs" /> : <IconSearch size={16} className="text-slate-400" />}
          />

          <TextInput 
            label="Razão Social" 
            placeholder="Preenchido automaticamente" 
            radius="md"
            required 
            {...form.getInputProps('razaoSocial')} 
          />

          <TextInput 
            label="Nome Fantasia" 
            placeholder="Como quer ver no sistema" 
            radius="md"
            required 
            {...form.getInputProps('nomeFantasia')} 
          />

          <div className="grid grid-cols-2 gap-4">
            <TextInput label="Cidade" disabled radius="md" {...form.getInputProps('cidade')} />
            <TextInput label="Estado (UF)" disabled radius="md" {...form.getInputProps('estado')} />
          </div>

          <Button 
            fullWidth 
            mt="xl" 
            size="lg" 
            radius="xl" 
            type="submit" 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/20"
          >
            Confirmar e Cadastrar
          </Button>
        </form>
      </Modal>
    </div>
  );
}