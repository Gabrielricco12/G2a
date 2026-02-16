import {
  ActionIcon,
  Avatar, Badge,
  Button,
  Group,
  LoadingOverlay,
  Menu,
  Modal,
  Paper,
  Progress,
  Select,
  Text,
  Title,
  Tooltip
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
  IconCalendarEvent,
  IconCheck,
  IconClock,
  IconDotsVertical,
  IconFileCheck,
  IconPlayerPlay,
  IconPlus, IconRefresh,
  IconSearch,
  IconTrash,
  IconUserCheck
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../../contexts/AuthContext'; // <--- 1. IMPORT NOVO
import { supabase } from '../../../lib/supabase';

dayjs.locale('pt-br');

export function ExamHub() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth(); // <--- 2. PEGAR O USUÁRIO LOGADO
  
  // --- ESTADOS ---
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [examType, setExamType] = useState<string>('periodico');
  const [checkInLoading, setCheckInLoading] = useState(false);

  // 1. BUSCAR AGENDA DO DIA
  const fetchDailyExams = async () => {
    if (!selectedDate) return;
    setLoading(true);

    const dateStr = dayjs(selectedDate).format('YYYY-MM-DD');
    const startOfDay = `${dateStr}T00:00:00`;
    const endOfDay = `${dateStr}T23:59:59`;

    try {
      const { data, error } = await supabase
        .from('audiometric_exams')
        .select(`
          id,
          exam_type,
          result_status,
          exam_date,
          created_at,
          thresholds_od_air,
          employee:employee_id (
            id, 
            full_name, 
            sector:sector_id(name), 
            job:job_role_id(name)
          )
        `)
        .eq('company_id', companyId)
        .gte('exam_date', startOfDay)
        .lte('exam_date', endOfDay)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setExams(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar exames:', err);
      toast.error('Erro ao carregar agenda.');
    } finally {
      setLoading(false);
    }
  };

  // 2. BUSCAR PACIENTES
  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, cpf')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('full_name');
      
      if (error) throw error;

      if (data) {
        setPatientsList(data.map(p => ({ 
          value: p.id, 
          label: `${p.full_name} (${p.cpf ? p.cpf.slice(0,3) + '...' : 'S/CPF'})` 
        })));
      }
    } catch (err) {
      toast.error('Erro ao carregar lista de pacientes.');
    }
  };

  useEffect(() => {
    if (companyId) fetchDailyExams();
  }, [selectedDate, companyId]);

  // 3. REALIZAR CHECK-IN (CORRIGIDO)
  const handleCheckIn = async () => {
    if (!selectedPatientId || !companyId) return;
    
    // Validação de Segurança
    if (!user?.id) {
      toast.error('Erro de sessão. Faça login novamente.');
      return;
    }

    setCheckInLoading(true);

    try {
      const formattedDate = selectedDate 
        ? dayjs(selectedDate).format('YYYY-MM-DD') 
        : dayjs().format('YYYY-MM-DD');

      const payload = {
        company_id: companyId,
        employee_id: selectedPatientId,
        professional_id: user.id, // <--- 3. CAMPO OBRIGATÓRIO ADICIONADO
        exam_type: examType,
        exam_date: formattedDate,
        result_status: 'normal'
      };

      console.log('Enviando Payload:', payload);

      const { error } = await supabase
        .from('audiometric_exams')
        .insert([payload]);

      if (error) throw error;
      
      toast.success('Check-in realizado!', { description: 'Paciente adicionado à fila.' });
      setModalOpen(false);
      setSelectedPatientId(null);
      fetchDailyExams(); 
    } catch (err: any) {
      console.error('Erro no Check-in:', err);
      toast.error('Falha ao realizar check-in', { 
        description: err.message
      });
    } finally {
      setCheckInLoading(false);
    }
  };

  // 4. CANCELAR EXAME
  const handleCancelExam = async (examId: string) => {
    if (!confirm('Tem certeza que deseja remover este paciente da fila?')) return;
    try {
      const { error } = await supabase
        .from('audiometric_exams')
        .delete()
        .eq('id', examId);
      
      if (error) throw error;
      toast.success('Removido da fila.');
      fetchDailyExams();
    } catch (err) {
      toast.error('Erro ao remover.');
    }
  };

  // --- LÓGICA VISUAL ---
  const getStatusInfo = (exam: any) => {
    const hasData = exam.thresholds_od_air && Object.keys(exam.thresholds_od_air).length > 0;
    
    if (!hasData) return { label: 'Aguardando', color: 'gray', icon: IconClock };
    if (exam.result_status === 'normal') return { label: 'Normal', color: 'teal', icon: IconCheck };
    return { label: 'Alterado', color: 'red', icon: IconFileCheck };
  };

  const total = exams.length;
  const done = exams.filter(e => e.thresholds_od_air && Object.keys(e.thresholds_od_air).length > 0).length;
  const progress = total === 0 ? 0 : (done / total) * 100;

  return (
    <div className="w-full space-y-6 animate-fade-in pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
        <div>
          <Title order={2} className="text-slate-800 flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><IconCalendarEvent size={28}/></div>
            Hub de Exames
          </Title>
          <Text c="dimmed" size="sm" mt={4}>Gerencie a fila de atendimento diária</Text>
          
          <Group mt="md">
            <DateInput 
  value={selectedDate} 
  onChange={(val: any) => setSelectedDate(val)} // O 'any' resolve o conflito de tipos do Mantine no build
  placeholder="Selecionar Data"
  valueFormat="DD/MM/YYYY"
  radius="xl"
  leftSection={<IconCalendarEvent size={16} />}
  className="w-44"
/>
            <Button 
              variant="subtle" 
              color="gray" 
              radius="xl"
              onClick={fetchDailyExams} 
              leftSection={<IconRefresh size={16}/>}
            >
              Atualizar
            </Button>
          </Group>
        </div>

        <Paper p="md" radius="xl" className="bg-slate-50 border border-slate-100 min-w-[250px] hidden sm:block">
          <Group justify="space-between" mb="xs">
            <Text size="xs" fw={700} tt="uppercase" c="dimmed">Progresso do Dia</Text>
            <Text fw={700} size="sm" c="blue">{done}/{total} Concluídos</Text>
          </Group>
          <Progress value={progress} size="lg" radius="xl" color="blue" striped animated={progress < 100 && progress > 0} />
        </Paper>

        <Button 
          size="lg" 
          radius="xl" 
          className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
          leftSection={<IconPlus size={20} />}
          onClick={() => {
            fetchPatients();
            setModalOpen(true);
          }}
        >
          Check-in Paciente
        </Button>
      </div>

      {/* TIMELINE */}
      <Paper p="xl" radius="xl" className="bg-white/60 backdrop-blur-md border border-slate-200/60 shadow-sm min-h-[500px] relative">
        <LoadingOverlay visible={loading} overlayProps={{ blur: 2, radius: 'xl' }} />
        
        {exams.length > 0 ? (
          <div className="space-y-4">
            {exams.map((exam) => {
              const status = getStatusInfo(exam);
              const isWaiting = status.label === 'Aguardando';

              return (
                <div 
                  key={exam.id} 
                  className={`
                    relative flex flex-col md:flex-row items-center gap-4 p-4 rounded-2xl border transition-all duration-200
                    ${isWaiting 
                      ? 'bg-white border-l-4 border-l-blue-400 border-slate-200 shadow-sm hover:shadow-md' 
                      : 'bg-slate-50 border-slate-100 opacity-90 hover:opacity-100'}
                  `}
                >
                  <div className="flex flex-col items-center justify-center min-w-[60px]">
                    <IconClock size={20} className="text-slate-400 mb-1" />
                    <Text fw={700} size="sm" c="dimmed">{dayjs(exam.created_at).format('HH:mm')}</Text>
                  </div>

                  <div className="flex-1 w-full text-center md:text-left">
                    <Group className="justify-center md:justify-start">
                      <Avatar color="blue" radius="xl" size="md">{exam.employee?.full_name?.[0]}</Avatar>
                      <div>
                        <Text fw={600} size="lg" className="text-slate-800 leading-tight">
                          {exam.employee?.full_name || 'Paciente Removido'}
                        </Text>
                        <Group gap="xs" justify="center" className="md:justify-start" mt={4}>
                          <Badge variant="dot" color="gray" size="sm" className="font-normal">
                            {exam.employee?.sector?.name || 'Setor N/A'}
                          </Badge>
                          <Badge variant="outline" color="blue" size="sm" tt="uppercase">
                            {exam.exam_type?.replace('_', ' ')}
                          </Badge>
                        </Group>
                      </div>
                    </Group>
                  </div>

                  <div className="min-w-[140px] flex justify-center">
                    <Badge 
                      color={status.color} 
                      variant="light" 
                      size="lg"
                      className="capitalize"
                      leftSection={<status.icon size={14} />}
                    >
                      {status.label}
                    </Badge>
                  </div>

                  <div className="flex gap-2 min-w-[160px] justify-end">
                    {isWaiting ? (
                      <>
                        <Button 
                          radius="xl" 
                          color="blue" 
                          leftSection={<IconPlayerPlay size={18} />}
                          className="shadow-md hover:shadow-lg transition-shadow bg-blue-600 hover:bg-blue-700"
                          onClick={() => navigate(`/app/${companyId}/exames/${exam.id}/realizar`)}
                        >
                          Iniciar
                        </Button>
                        <Menu position="bottom-end" shadow="md">
                          <Menu.Target>
                            <ActionIcon variant="subtle" color="gray" size="lg" radius="xl"><IconDotsVertical size={18}/></ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item color="red" leftSection={<IconTrash size={14}/>} onClick={() => handleCancelExam(exam.id)}>
                              Cancelar Check-in
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </>
                    ) : (
                      <Group gap="xs">
                         <Tooltip label="Visualizar / Editar">
                            <ActionIcon 
                              variant="light" 
                              color="blue" 
                              radius="xl" 
                              size="lg"
                              onClick={() => navigate(`/app/${companyId}/exames/${exam.id}/realizar`)}
                            >
                              <IconSearch size={20} />
                            </ActionIcon>
                         </Tooltip>
                      </Group>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[400px] text-slate-400">
            <div className="bg-slate-100 p-6 rounded-full mb-4">
               <IconCalendarEvent size={64} className="opacity-30" />
            </div>
            <Title order={3} c="dimmed" className="font-normal">Agenda Livre</Title>
            <Text size="sm">Nenhum atendimento registrado para {dayjs(selectedDate).format('DD/MM')}.</Text>
            <Button 
              mt="lg" 
              variant="outline" 
              radius="xl" 
              onClick={() => { fetchPatients(); setModalOpen(true); }}
            >
              Fazer Check-in Manual
            </Button>
          </div>
        )}
      </Paper>

      {/* MODAL */}
      <Modal 
        opened={modalOpen} 
        onClose={() => setModalOpen(false)}
        title={<Text fw={700} size="lg">Novo Atendimento</Text>}
        centered
        radius="lg"
        overlayProps={{ blur: 4 }}
      >
        <div className="space-y-4">
          <Select
            label="Paciente"
            placeholder="Buscar por nome..."
            searchable
            data={patientsList}
            value={selectedPatientId}
            onChange={setSelectedPatientId}
            nothingFoundMessage="Nenhum paciente encontrado"
            maxDropdownHeight={200}
            leftSection={<IconUserCheck size={16} />}
            required
          />
          
          <Select
            label="Tipo de Exame"
            data={[
              { value: 'admissional', label: 'Admissional' },
              { value: 'periodico', label: 'Periódico' },
              { value: 'demissional', label: 'Demissional' },
              { value: 'mudanca_risco', label: 'Mudança de Risco' },
              { value: 'retorno_trabalho', label: 'Retorno ao Trabalho' },
            ]}
            value={examType}
            onChange={(val) => setExamType(val || 'periodico')}
            required
          />

          <Button 
            fullWidth 
            mt="md" 
            radius="xl" 
            size="md"
            onClick={handleCheckIn} 
            loading={checkInLoading}
            disabled={!selectedPatientId}
            className="bg-blue-600"
          >
            Confirmar Check-in
          </Button>
        </div>
      </Modal>
    </div>
  );
}