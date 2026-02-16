import React, { useEffect, useState } from 'react';
import { 
  Title, 
  Text, 
  Button, 
  Paper, 
  Group, 
  Avatar, 
  Tabs, 
  Timeline, 
  Textarea, 
  Badge, 
  Grid, 
  LoadingOverlay, 
  ThemeIcon,
  Divider,
  Container
} from '@mantine/core';
import { 
  IconArrowLeft, 
  IconActivity, 
  IconFileText, 
  IconId, 
  IconEar, 
  IconSend, 
  IconClock, 
  IconUser,
  IconBuildingFactory,
  IconBriefcase
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

// Configura o DayJS para português
dayjs.locale('pt-br');

export function PatientProfile() {
  const { companyId, patientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Estados
  const [patient, setPatient] = useState<any>(null);
  const [evolutions, setEvolutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEvolution, setNewEvolution] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 1. Função de Busca de Dados
  const fetchData = async () => {
    if (!patientId) return;
    setLoading(true);
    
    try {
      console.log('Iniciando busca para Paciente ID:', patientId);

      // A. Busca Dados do Paciente (Join com Setores, Cargos e GHE)
      const { data: pData, error: pError } = await supabase
        .from('employees')
        .select(`
          *,
          sectors (name),
          job_roles (name),
          ghe (name)
        `)
        .eq('id', patientId)
        .single();
      
      if (pError) throw pError;
      setPatient(pData);

      // B. Busca Evoluções Clínicas (Join com Profiles para pegar o nome do Fono)
      // Nota: Usamos 'profiles:professional_id' para explicitar a relação
      const { data: eData, error: eError } = await supabase
        .from('clinical_evolutions')
        .select(`
          *,
          profiles:professional_id (full_name)
        `)
        .eq('employee_id', patientId)
        .order('created_at', { ascending: false });

      if (eError) {
        console.warn('Aviso: Não foi possível carregar evoluções.', eError);
        // Não lançamos erro aqui para permitir visualizar o paciente mesmo sem evoluções
      } else {
        setEvolutions(eData || []);
      }

    } catch (err: any) {
      console.error('Erro crítico ao carregar perfil:', err);
      toast.error('Falha ao carregar dados do paciente', {
        description: 'Verifique o console para mais detalhes.'
      });
      // Importante: Removi o redirecionamento automático para você poder debugar
      // navigate(`/app/${companyId}/pacientes`); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [patientId]);

  // 2. Função para Salvar Nova Evolução
  const handleAddEvolution = async () => {
    if (!newEvolution.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('clinical_evolutions').insert([
        {
          employee_id: patientId,
          professional_id: user?.id, // ID do usuário logado
          content: newEvolution
        }
      ]);

      if (error) throw error;
      
      toast.success('Evolução registrada com sucesso');
      setNewEvolution('');
      fetchData(); // Recarrega a lista para mostrar a nova
    } catch (err: any) {
      toast.error('Erro ao salvar evolução', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingOverlay visible overlayProps={{ blur: 2 }} />;

  if (!patient && !loading) return (
    <div className="text-center p-10">
      <Text c="red">Paciente não encontrado.</Text>
      <Button mt="md" onClick={() => navigate(-1)}>Voltar</Button>
    </div>
  );

  return (
    <div className="w-full space-y-6 animate-fade-in pb-20">
      
      {/* --- HEADER NAVEGAÇÃO --- */}
      <Button 
        variant="subtle" 
        color="gray" 
        size="sm" 
        leftSection={<IconArrowLeft size={16} />}
        onClick={() => navigate(`/app/${companyId}/pacientes`)}
      >
        Voltar para Lista
      </Button>

      {/* --- HERO CARD (RESUMO DO PACIENTE) --- */}
      <Paper 
        p="xl" 
        radius="xl" 
        className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-500/20"
      >
        {/* Elementos Decorativos de Fundo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-400/20 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-center lg:items-start">
          
          {/* Avatar e Status */}
          <div className="flex flex-col items-center">
            <Avatar 
              size={120} 
              radius="100%" 
              className="border-4 border-white/30 shadow-lg bg-white/10 text-white text-4xl mb-3"
            >
              {patient.full_name.charAt(0)}
            </Avatar>
            <Badge 
              variant="filled" 
              color={patient.is_active ? 'teal' : 'red'} 
              size="lg" 
              className="shadow-sm"
            >
              {patient.is_active ? 'ATIVO' : 'INATIVO'}
            </Badge>
          </div>
          
          {/* Informações Principais */}
          <div className="flex-1 text-center lg:text-left space-y-4">
            <div>
              <Title order={2} className="text-white text-3xl font-bold tracking-tight mb-1">
                {patient.full_name}
              </Title>
              <Group justify="center" lg="start" gap="xs" className="text-blue-100/90">
                <IconId size={18} />
                <Text size="md" fw={500}>{patient.cpf}</Text>
                <Divider orientation="vertical" color="white" className="opacity-30 h-4 mx-2" />
                <Text size="md">{dayjs().diff(patient.birth_date, 'year')} anos</Text>
              </Group>
            </div>

            {/* Chips de Informação */}
            <Group justify="center" lg="start" gap="md">
              <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20 min-w-[120px]">
                <Group gap={6} mb={2} className="opacity-80">
                  <IconBuildingFactory size={14} />
                  <Text size="xs" tt="uppercase" fw={700}>Setor</Text>
                </Group>
                <Text size="sm" fw={600} className="truncate">{patient.sectors?.name || '---'}</Text>
              </div>

              <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20 min-w-[120px]">
                <Group gap={6} mb={2} className="opacity-80">
                  <IconBriefcase size={14} />
                  <Text size="xs" tt="uppercase" fw={700}>Função</Text>
                </Group>
                <Text size="sm" fw={600} className="truncate">{patient.job_roles?.name || '---'}</Text>
              </div>

              <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20 min-w-[120px]">
                <Group gap={6} mb={2} className="opacity-80">
                  <IconActivity size={14} />
                  <Text size="xs" tt="uppercase" fw={700}>GHE</Text>
                </Group>
                <Text size="sm" fw={600} className="truncate">{patient.ghe?.name || 'Padrão'}</Text>
              </div>
            </Group>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col gap-3 w-full lg:w-auto min-w-[220px]">
             <Button 
               fullWidth 
               variant="white" 
               color="blue" 
               radius="xl" 
               size="md"
               leftSection={<IconEar size={20} />}
               className="shadow-xl hover:scale-105 transition-transform font-bold text-blue-700"
               // onClick={() => navigate('audiometria/nova')} // Futuro
             >
               Nova Audiometria
             </Button>
             <Button 
               fullWidth 
               variant="outline" 
               color="white" 
               radius="xl" 
               className="border-white/40 text-white hover:bg-white/10"
             >
               Gerar Documentos
             </Button>
          </div>
        </div>
      </Paper>

      {/* --- ABAS DE CONTEÚDO (PRONTUÁRIO) --- */}
      <Tabs defaultValue="evolution" radius="lg" variant="pills" classNames={{ list: 'mb-6 space-x-2' }}>
        <Tabs.List>
          <Tabs.Tab value="evolution" leftSection={<IconActivity size={18} />}>
            Evolução Clínica
          </Tabs.Tab>
          <Tabs.Tab value="exams" leftSection={<IconFileText size={18} />}>
            Histórico de Exames
          </Tabs.Tab>
          <Tabs.Tab value="data" leftSection={<IconUser size={18} />}>
            Dados Cadastrais
          </Tabs.Tab>
        </Tabs.List>

        {/* 1. ABA EVOLUÇÃO */}
        <Tabs.Panel value="evolution">
          <Grid gutter="lg">
            {/* Coluna Esquerda: Formulário */}
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Paper p="lg" radius="xl" className="bg-white border border-slate-200 shadow-sm h-full sticky top-4">
                <Title order={5} mb="md" className="flex items-center gap-2 text-slate-700">
                  <ThemeIcon variant="light" size="md" radius="md" color="blue"><IconFileText size={16}/></ThemeIcon>
                  Nova Anotação
                </Title>
                
                <Textarea
                  placeholder="Descreva queixas, orientações ou observações do atendimento..."
                  minRows={6}
                  autosize
                  radius="md"
                  variant="filled"
                  value={newEvolution}
                  onChange={(e) => setNewEvolution(e.currentTarget.value)}
                  className="mb-4"
                />
                
                <Button 
                  fullWidth 
                  radius="xl" 
                  leftSection={<IconSend size={16} />}
                  onClick={handleAddEvolution}
                  loading={submitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Registrar no Prontuário
                </Button>
                
                <Text size="xs" c="dimmed" mt="md" ta="center" className="bg-slate-50 p-2 rounded">
                  <IconClock size={12} className="inline mr-1"/>
                  Registro com carimbo de tempo imutável.
                </Text>
              </Paper>
            </Grid.Col>

            {/* Coluna Direita: Timeline */}
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Paper p="xl" radius="xl" className="bg-white/80 backdrop-blur-md border border-slate-200 shadow-sm min-h-[500px]">
                <Title order={5} mb="xl" className="text-slate-700 flex items-center justify-between">
                  <span>Histórico Clínico</span>
                  <Badge variant="light" color="gray">{evolutions.length} registros</Badge>
                </Title>
                
                {evolutions.length > 0 ? (
                  <Timeline active={-1} bulletSize={36} lineWidth={2} color="blue">
                    {evolutions.map((ev) => (
                      <Timeline.Item 
                        key={ev.id} 
                        bullet={<IconClock size={18} />} 
                        title={
                          <Text size="sm" fw={700} className="text-slate-800">
                            {dayjs(ev.created_at).format('DD [de] MMMM, YYYY')}
                            <span className="text-slate-400 font-normal ml-2">
                              às {dayjs(ev.created_at).format('HH:mm')}
                            </span>
                          </Text>
                        }
                      >
                        <Text c="dimmed" size="xs" mb={8} fw={500} className="uppercase tracking-wide text-blue-600">
                          {ev.profiles?.full_name || 'Profissional Desconhecido'}
                        </Text>
                        
                        <Paper p="md" radius="lg" bg="gray.0" className="border border-gray-100/50 shadow-sm">
                          <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }} className="text-slate-700">
                            {ev.content}
                          </Text>
                        </Paper>
                      </Timeline.Item>
                    ))}
                  </Timeline>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
                    <IconActivity size={48} className="mb-4 opacity-20" />
                    <Text fw={500}>Nenhuma evolução registrada.</Text>
                    <Text size="sm">Utilize o formulário ao lado para iniciar o prontuário.</Text>
                  </div>
                )}
              </Paper>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        {/* 2. ABA EXAMES */}
        <Tabs.Panel value="exams">
          <Paper p={60} radius="xl" className="text-center border border-dashed border-slate-300 bg-slate-50/50">
             <div className="bg-white p-4 rounded-full inline-block shadow-sm mb-4">
                <IconEar size={48} className="text-blue-200" />
             </div>
             <Title order={4} className="text-slate-600 mb-2">Histórico de Audiometrias</Title>
             <Text c="dimmed" mb="xl" className="max-w-md mx-auto">
               Não foram encontrados exames anteriores para este paciente. Inicie uma nova avaliação para gerar dados.
             </Text>
             <Button variant="outline" radius="xl" color="blue">Importar Legado (PDF)</Button>
          </Paper>
        </Tabs.Panel>

        {/* 3. ABA DADOS CADASTRAIS */}
        <Tabs.Panel value="data">
          <Paper p="xl" radius="xl" className="bg-white border border-slate-200 shadow-sm">
             <Grid gutter="xl">
               <Grid.Col span={12}><Text size="sm" fw={700} tt="uppercase" c="dimmed">Dados Pessoais</Text></Grid.Col>
               
               <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                 <Text size="xs" c="dimmed">Nome Completo</Text>
                 <Text fw={500}>{patient?.full_name}</Text>
               </Grid.Col>
               <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                 <Text size="xs" c="dimmed">CPF</Text>
                 <Text fw={500}>{patient?.cpf}</Text>
               </Grid.Col>
               <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                 <Text size="xs" c="dimmed">RG</Text>
                 <Text fw={500}>{patient?.rg || '-'}</Text>
               </Grid.Col>
               <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                 <Text size="xs" c="dimmed">Data de Nascimento</Text>
                 <Text fw={500}>{dayjs(patient?.birth_date).format('DD/MM/YYYY')}</Text>
               </Grid.Col>
               <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                 <Text size="xs" c="dimmed">Gênero</Text>
                 <Text fw={500}>{patient?.gender === 'M' ? 'Masculino' : 'Feminino'}</Text>
               </Grid.Col>

               <Grid.Col span={12}><Divider my="xs" /></Grid.Col>
               <Grid.Col span={12}><Text size="sm" fw={700} tt="uppercase" c="dimmed">Dados Profissionais</Text></Grid.Col>

               <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                 <Text size="xs" c="dimmed">Matrícula</Text>
                 <Text fw={500}>{patient?.matricula || '-'}</Text>
               </Grid.Col>
               <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                 <Text size="xs" c="dimmed">Admissão</Text>
                 <Text fw={500}>{patient?.admission_date ? dayjs(patient.admission_date).format('DD/MM/YYYY') : '-'}</Text>
               </Grid.Col>
             </Grid>
          </Paper>
        </Tabs.Panel>

      </Tabs>
    </div>
  );
}