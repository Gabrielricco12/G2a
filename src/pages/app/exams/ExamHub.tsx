import React, { useState, useEffect } from 'react';
import { 
  Title, Text, Button, Paper, Group, Avatar, Badge, 
  ActionIcon, Select, Modal, LoadingOverlay, 
  Progress, Tooltip, Menu, PasswordInput, Stack, Alert
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { 
  IconCalendarEvent, IconClock, IconUserCheck, IconPlayerPlay, 
  IconCheck, IconFileCheck, IconSearch, IconPlus, IconRefresh,
  IconTrash, IconDotsVertical, IconLock, IconAlertTriangle, IconPencil
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { toast } from 'sonner';

dayjs.locale('pt-br');

export function ExamHub() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [examType, setExamType] = useState<string>('periodico');
  const [checkInLoading, setCheckInLoading] = useState(false);

  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [examToEdit, setExamToEdit] = useState<any>(null); 
  const [verifying, setVerifying] = useState(false);

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
          id, exam_type, result_status, exam_date, created_at, thresholds_od_air,
          last_edited_at, last_edited_by, edit_reason,
          employee:employee_id (id, full_name, sector:sector_id(name), job:job_role_id(name)),
          editor:last_edited_by (full_name)
        `)
        .eq('company_id', companyId)
        .gte('exam_date', startOfDay)
        .lte('exam_date', endOfDay)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setExams(data || []);
    } catch (err: any) {
      toast.error('Erro ao carregar agenda.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const { data } = await supabase
        .from('employees')
        .select('id, full_name, cpf')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('full_name');
      if (data) {
        setPatientsList(data.map(p => ({ 
          value: p.id, 
          label: `${p.full_name} (${p.cpf ? p.cpf.slice(0,3) + '...' : 'S/CPF'})` 
        })));
      }
    } catch (err) {
      toast.error('Erro ao carregar pacientes.');
    }
  };

  useEffect(() => {
    if (companyId) fetchDailyExams();
  }, [selectedDate, companyId]);

  const handleCheckIn = async () => {
    if (!selectedPatientId || !companyId || !user?.id) return;
    setCheckInLoading(true);
    try {
      const formattedDate = dayjs(selectedDate).format('YYYY-MM-DD');
      const { error } = await supabase.from('audiometric_exams').insert([{
        company_id: companyId,
        employee_id: selectedPatientId,
        professional_id: user.id,
        exam_type: examType,
        exam_date: formattedDate,
        result_status: 'normal' 
      }]);
      if (error) throw error;
      toast.success('Check-in realizado!');
      setCheckInModalOpen(false);
      fetchDailyExams(); 
    } catch (err: any) {
      toast.error('Falha ao realizar check-in');
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleExamClick = (exam: any) => {
    const hasData = exam.thresholds_od_air && Object.keys(exam.thresholds_od_air).length > 0;
    if (!hasData) {
      navigate(`/app/${companyId}/exames/${exam.id}/realizar`);
    } else {
      setExamToEdit(exam);
      setSecurityModalOpen(true);
    }
  };

  const handleVerifyPassword = async () => {
    if (!password || !user?.email || !examToEdit) return;
    setVerifying(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password
      });
      if (error) throw new Error('Senha incorreta');
      toast.success('Acesso Liberado', { description: 'Edição de laudo autorizada.' });
      setSecurityModalOpen(false);
      setPassword('');
      navigate(`/app/${companyId}/exames/${examToEdit.id}/realizar`);
    } catch (err) {
      toast.error('Acesso Negado', { description: 'Senha incorreta.' });
    } finally {
      setVerifying(false);
    }
  };

  const getStatusInfo = (exam: any) => {
    const hasData = exam.thresholds_od_air && Object.keys(exam.thresholds_od_air).length > 0;
    if (!hasData) return { label: 'Aguardando', color: 'gray', icon: IconClock };
    const dbStatus = exam.result_status?.toLowerCase();
    if (dbStatus === 'normal') return { label: 'Normal', color: 'teal', icon: IconCheck };
    if (dbStatus === 'alterado') return { label: 'Alterado', color: 'orange', icon: IconAlertTriangle };
    if (dbStatus === 'sugestivo_painpse') return { label: 'Sugestivo PAIR', color: 'red', icon: IconAlertTriangle };
    if (dbStatus === 'alterado_preexistente') return { label: 'Pré-existente', color: 'orange', icon: IconAlertTriangle };
    return { label: 'Concluído', color: 'blue', icon: IconFileCheck };
  };

  const total = exams.length;
  const done = exams.filter(e => e.thresholds_od_air && Object.keys(e.thresholds_od_air).length > 0).length;
  const progress = total === 0 ? 0 : (done / total) * 100;

  return (
    <div className="w-full space-y-6 animate-fade-in pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
        <div>
          <Title order={2} className="text-slate-800 flex items-center gap-2">Hub de Exames</Title>
          <Group mt="md">
            <DateInput 
              value={selectedDate} 
              onChange={(val: any) => setSelectedDate(val)}
              placeholder="Selecionar Data"
              valueFormat="DD/MM/YYYY"
              radius="xl"
              leftSection={<IconCalendarEvent size={16} />}
              className="w-44"
            />
            <Button variant="subtle" color="gray" radius="xl" onClick={fetchDailyExams} leftSection={<IconRefresh size={16}/>}>Atualizar</Button>
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
          size="lg" radius="xl" className="bg-blue-600 shadow-lg" 
          leftSection={<IconPlus size={20} />} 
          onClick={() => { fetchPatients(); setCheckInModalOpen(true); }}
        >
          Check-in
        </Button>
      </div>

      {/* LISTA DE EXAMES */}
      <Paper p="xl" radius="xl" className="bg-white/60 backdrop-blur-md border border-slate-200 min-h-[400px] relative">
        <LoadingOverlay visible={loading} overlayProps={{ blur: 2, radius: 'xl' }} />
        
        {exams.length > 0 ? (
          <div className="space-y-4">
            {exams.map((exam) => {
              const status = getStatusInfo(exam);
              const isWaiting = status.label === 'Aguardando';
              const wasEdited = !!exam.last_edited_at;
              const editorName = exam.editor?.full_name || 'Profissional';
              const editedAt = exam.last_edited_at ? dayjs(exam.last_edited_at).format('DD/MM/YYYY [às] HH:mm') : '';

              return (
                <div 
                  key={exam.id} 
                  className={`
                    relative flex flex-col md:flex-row items-center gap-4 p-4 rounded-2xl border transition-all duration-200
                    ${isWaiting 
                      ? 'bg-white border-l-4 border-l-blue-400 border-slate-200 shadow-sm hover:shadow-md' 
                      : 'bg-slate-50 border-slate-100 opacity-90'}
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

                  <div className="min-w-[140px] flex flex-col items-center gap-1">
                    <Badge color={status.color} variant="light" size="lg" leftSection={<status.icon size={14} />}>
                      {status.label}
                    </Badge>
                    
                    {/* Badge de edição */}
                    {wasEdited && (
                      <Tooltip
                        multiline
                        w={280}
                        position="bottom"
                        withArrow
                        label={
                          <div>
                            <Text size="xs" fw={700} mb={2}>Laudo editado</Text>
                            <Text size="xs">Por: {editorName}</Text>
                            <Text size="xs">Em: {editedAt}</Text>
                            {exam.edit_reason && (
                              <Text size="xs" mt={4} fs="italic">Motivo: {exam.edit_reason}</Text>
                            )}
                          </div>
                        }
                      >
                        <Badge
                          size="xs"
                          variant="light"
                          color="orange"
                          leftSection={<IconPencil size={10} />}
                          style={{ cursor: 'help' }}
                          styles={{ label: { textTransform: 'none' } }}
                        >
                          Editado em {dayjs(exam.last_edited_at).format('DD/MM HH:mm')}
                        </Badge>
                      </Tooltip>
                    )}
                  </div>

                  <div className="flex gap-2 min-w-[160px] justify-end">
                    {isWaiting ? (
                      <Button 
                        radius="xl" color="blue" 
                        leftSection={<IconPlayerPlay size={18} />}
                        onClick={() => handleExamClick(exam)} 
                      >
                        Iniciar
                      </Button>
                    ) : (
                      <>
                        <Tooltip label="Visualizar Laudo">
                          <Button 
                            variant="light" color="blue" radius="xl" 
                            leftSection={<IconFileCheck size={16} />}
                            onClick={() => navigate(`/app/${companyId}/exames/${exam.id}/visualizar`)}
                          >
                            Ver Laudo
                          </Button>
                        </Tooltip>
                        
                        <Tooltip label="Editar Gráfico (Requer Senha)">
                          <ActionIcon 
                            variant="light" color="gray" size="lg" radius="xl" 
                            onClick={() => handleExamClick(exam)}
                          >
                            <IconLock size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[400px] text-slate-400">
             <IconCalendarEvent size={64} className="opacity-30 mb-4" />
             <Text>Nenhum atendimento na agenda para esta data.</Text>
          </div>
        )}
      </Paper>

      {/* MODAL CHECK-IN */}
      <Modal 
        opened={checkInModalOpen} onClose={() => setCheckInModalOpen(false)}
        title={<Text fw={700} size="lg">Novo Atendimento</Text>}
        centered radius="lg"
      >
        <Stack>
          <Select label="Paciente" searchable data={patientsList} value={selectedPatientId} onChange={setSelectedPatientId} />
          <Select label="Tipo" data={['admissional', 'periodico', 'demissional']} value={examType} onChange={(v) => setExamType(v || 'periodico')} />
          <Button fullWidth mt="md" radius="xl" onClick={handleCheckIn} loading={checkInLoading}>Confirmar</Button>
        </Stack>
      </Modal>

      {/* MODAL DE SEGURANÇA */}
      <Modal
        opened={securityModalOpen}
        onClose={() => { setSecurityModalOpen(false); setPassword(''); }}
        title={<Group><IconLock size={20} className="text-red-500"/><Text fw={700} c="red">Edição Protegida</Text></Group>}
        centered radius="lg"
      >
        <Stack>
          <Alert color="red" variant="light" icon={<IconAlertTriangle />}>
            Você está tentando alterar um exame já finalizado. Esta ação requer autenticação do profissional.
          </Alert>
          <PasswordInput
            label="Senha do Profissional"
            placeholder="Digite sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <Group justify="end" mt="md">
            <Button variant="default" onClick={() => setSecurityModalOpen(false)}>Cancelar</Button>
            <Button color="red" onClick={handleVerifyPassword} loading={verifying}>Liberar Acesso</Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
