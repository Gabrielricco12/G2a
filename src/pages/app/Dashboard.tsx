import { useEffect, useState } from 'react';
import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Grid,
  Group,
  Paper,
  Progress,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
  LoadingOverlay,
  Tooltip
} from '@mantine/core';
import {
  IconActivity,
  IconArrowUpRight,
  IconCalendarStats,
  IconDotsVertical,
  IconPlayerPlay,
  IconUsers,
  IconClock,
  IconAlertTriangle,
  IconStethoscope,
  IconClipboardHeart // Garantindo que não falte
} from '@tabler/icons-react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase'; 
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

export function Dashboard() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // --- ESTADOS DE DADOS ---
  const [stats, setStats] = useState({
    totalLives: 0,
    examsMonth: 0,
    examsMonthDiff: 0, 
    scheduledToday: 0,
    alteredMonth: 0
  });

  const [todayMetrics, setTodayMetrics] = useState({
    periodico: { total: 0, done: 0 },
    admissional: { total: 0, done: 0 },
    demissional: { total: 0, done: 0 }
  });

  const [recentExams, setRecentExams] = useState<any[]>([]);
  const [queueToday, setQueueToday] = useState<any[]>([]);

  // --- BUSCA DE DADOS ---
  useEffect(() => {
    if (companyId) fetchDashboardData();
  }, [companyId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
      const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD');
      const startOfLastMonth = dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
      const endOfLastMonth = dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD');
      const todayDate = dayjs().format('YYYY-MM-DD');

      // 1. STATS: Total de Vidas (Funcionários Ativos)
      const { count: totalLives } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_active', true);

      // 2. STATS: Exames Mês Atual (Busca os dados para filtrar status no front)
      const { data: monthExams } = await supabase
        .from('audiometric_exams')
        .select('result_status') // Trazemos o status para contar
        .eq('company_id', companyId)
        .gte('exam_date', startOfMonth)
        .lte('exam_date', endOfMonth);
      
      const examsMonthCount = monthExams?.length || 0;

      // Lógica de Filtro Robusta (Case Insensitive)
      const alteredCount = monthExams?.filter(e => 
        e.result_status && e.result_status.toLowerCase().includes('alterado')
      ).length || 0;

      // 3. Comparativo Mês Passado
      const { count: examsLastMonth } = await supabase
        .from('audiometric_exams')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('exam_date', startOfLastMonth)
        .lte('exam_date', endOfLastMonth);

      let diffPercent = 0;
      if (examsLastMonth && examsLastMonth > 0) {
        diffPercent = Math.round(((examsMonthCount - examsLastMonth) / examsLastMonth) * 100);
      } else if (examsMonthCount > 0) {
        diffPercent = 100;
      }

      // 4. QUERY DO DIA (Agenda e Fila)
      const { data: todayData } = await supabase
        .from('audiometric_exams')
        .select(`*, employee:employee_id (full_name)`)
        .eq('company_id', companyId)
        .eq('exam_date', todayDate)
        .order('created_at', { ascending: true });

      const todayList = todayData || [];
      const scheduledCount = todayList.length;
      
      // Pendentes: Exames sem limiares preenchidos
      const pendingList = todayList.filter(e => !e.thresholds_od_air || Object.keys(e.thresholds_od_air).length === 0);
      const doneList = todayList.filter(e => e.thresholds_od_air && Object.keys(e.thresholds_od_air).length > 0);
      
      // Métricas detalhadas por tipo
      const metrics = {
        periodico: { 
          total: todayList.filter(e => e.exam_type === 'periodico').length,
          done: doneList.filter(e => e.exam_type === 'periodico').length
        },
        admissional: { 
          total: todayList.filter(e => e.exam_type === 'admissional').length,
          done: doneList.filter(e => e.exam_type === 'admissional').length
        },
        demissional: { 
          total: todayList.filter(e => e.exam_type === 'demissional').length,
          done: doneList.filter(e => e.exam_type === 'demissional').length
        }
      };

      // 5. ATIVIDADE RECENTE (Últimos finalizados)
      const { data: recentData } = await supabase
        .from('audiometric_exams')
        .select(`*, employee:employee_id (full_name)`)
        .eq('company_id', companyId)
        .not('thresholds_od_air', 'is', null) // Garante que foi realizado
        .order('updated_at', { ascending: false })
        .limit(5);

      // Atualiza Estados
      setStats({
        totalLives: totalLives || 0,
        examsMonth: examsMonthCount,
        examsMonthDiff: diffPercent,
        scheduledToday: scheduledCount,
        alteredMonth: alteredCount
      });

      setTodayMetrics(metrics);
      setQueueToday(pendingList);
      setRecentExams(recentData || []);

    } catch (err) {
      console.error('Erro crítico no dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const calcProgress = (current: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((current / total) * 100);
  };

  const handleExamAction = (examId: string) => {
    navigate(`/app/${companyId}/exames/${examId}/realizar`);
  };

  const alterationRate = stats.examsMonth > 0 
    ? Math.round((stats.alteredMonth / stats.examsMonth) * 100) 
    : 0;

  return (
    <div className="space-y-8 animate-fade-in pb-10 relative">
      <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Stack gap={4}>
          <Title order={1} className="text-slate-800 tracking-tight">Painel Operacional</Title>
          <Text c="dimmed" size="lg">
            Resumo de <b>{dayjs().format('DD [de] MMMM')}</b> na G2A Health.
          </Text>
        </Stack>
        
        <Group>
          <Button 
            variant="light" 
            color="blue" 
            radius="xl" 
            leftSection={<IconCalendarStats size={18}/>}
            onClick={() => navigate(`/app/${companyId}/exames`)}
          >
            Ver Agenda Completa
          </Button>
        </Group>
      </div>

      {/* CARDS DE ESTATÍSTICAS */}
      <Grid gutter="lg">
        {/* Total de Vidas */}
        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <Paper p="xl" radius="2rem" withBorder className="bg-white/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
            <Group justify="space-between">
              <ThemeIcon size="xl" radius="lg" variant="light" color="blue"><IconUsers size={24} /></ThemeIcon>
              <Badge color="gray" variant="light">Ativos</Badge>
            </Group>
            <div className="mt-4">
              <Text size="xs" c="dimmed" tt="uppercase" fw={800}>Total de Vidas</Text>
              <Text size="2rem" fw={900} className="text-slate-800">{stats.totalLives}</Text>
            </div>
          </Paper>
        </Grid.Col>

        {/* Exames no Mês */}
        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <Paper p="xl" radius="2rem" withBorder className="bg-white/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
            <Group justify="space-between">
              <ThemeIcon size="xl" radius="lg" variant="light" color="teal"><IconActivity size={24} /></ThemeIcon>
              <Tooltip label="Comparativo com o mês anterior">
                <Badge color={stats.examsMonthDiff >= 0 ? 'teal' : 'red'} variant="light" style={{ cursor: 'help' }}>
                  {stats.examsMonthDiff > 0 ? `+${stats.examsMonthDiff}%` : `${stats.examsMonthDiff}%`}
                </Badge>
              </Tooltip>
            </Group>
            <div className="mt-4">
              <Text size="xs" c="dimmed" tt="uppercase" fw={800}>Exames (Mês)</Text>
              <Text size="2rem" fw={900} className="text-slate-800">{stats.examsMonth}</Text>
            </div>
          </Paper>
        </Grid.Col>

        {/* Agendados Hoje */}
        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <Paper p="xl" radius="2rem" withBorder className="bg-white/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
            <Group justify="space-between">
              <ThemeIcon size="xl" radius="lg" variant="light" color="indigo"><IconCalendarStats size={24} /></ThemeIcon>
              <Badge color="indigo" variant="light">Hoje</Badge>
            </Group>
            <div className="mt-4">
              <Text size="xs" c="dimmed" tt="uppercase" fw={800}>Agendados Hoje</Text>
              <Text size="2rem" fw={900} className="text-slate-800">{stats.scheduledToday}</Text>
            </div>
          </Paper>
        </Grid.Col>

        {/* Exames Alterados (Card Vermelho) */}
        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <Paper p="xl" radius="2rem" withBorder className="bg-red-50/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all border-red-100">
            <Group justify="space-between">
              <ThemeIcon size="xl" radius="lg" variant="light" color="red"><IconAlertTriangle size={24} /></ThemeIcon>
              <Tooltip label="Porcentagem de exames alterados no mês">
                <Badge color="red" variant="filled">
                  {alterationRate}% Taxa
                </Badge>
              </Tooltip>
            </Group>
            <div className="mt-4">
              <Text size="xs" c="red.8" tt="uppercase" fw={800}>Exames Alterados</Text>
              <Text size="2rem" fw={900} className="text-red-900">{stats.alteredMonth}</Text>
            </div>
          </Paper>
        </Grid.Col>
      </Grid>

      <Grid gutter="xl">
        {/* METAS DO DIA */}
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Paper p="xl" radius="2rem" withBorder className="h-full bg-white/40">
            <Group justify="space-between" mb="xl">
              <Title order={4}>Meta de Atendimento do Dia</Title>
              <Text size="sm" c="dimmed" fw={500}>
                {calcProgress(stats.scheduledToday - queueToday.length, stats.scheduledToday)}% Concluído
              </Text>
            </Group>
            
            <Stack gap="xl">
              {/* Periódicos */}
              <div>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={600}>Exames Periódicos</Text>
                  <Text size="xs" c="dimmed">{todayMetrics.periodico.done}/{todayMetrics.periodico.total} realizados</Text>
                </Group>
                <Progress value={calcProgress(todayMetrics.periodico.done, todayMetrics.periodico.total)} size="xl" radius="xl" color="blue" animated />
              </div>

              {/* Admissionais */}
              <div>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={600}>Exames Admissionais</Text>
                  <Text size="xs" c="dimmed">{todayMetrics.admissional.done}/{todayMetrics.admissional.total} realizados</Text>
                </Group>
                <Progress value={calcProgress(todayMetrics.admissional.done, todayMetrics.admissional.total)} size="xl" radius="xl" color="teal" />
              </div>

              {/* Demissionais */}
              <div>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={600}>Exames Demissionais</Text>
                  <Text size="xs" c="dimmed">{todayMetrics.demissional.done}/{todayMetrics.demissional.total} realizados</Text>
                </Group>
                <Progress value={calcProgress(todayMetrics.demissional.done, todayMetrics.demissional.total)} size="xl" radius="xl" color="red" />
              </div>
            </Stack>
          </Paper>
        </Grid.Col>

        {/* ÚLTIMOS ATENDIMENTOS */}
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Paper p="xl" radius="2rem" withBorder className="h-full">
            <Title order={4} mb="lg">Últimos Finalizados</Title>
            
            <Stack gap="md">
              {recentExams.length > 0 ? recentExams.map((exam) => (
                <Paper key={exam.id} p="md" radius="lg" withBorder className="hover:bg-slate-50 transition-colors">
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap="sm">
                      <Avatar color="blue" radius="md">{exam.employee?.full_name[0]}</Avatar>
                      <div>
                        <Text size="sm" fw={700} className="line-clamp-1">{exam.employee?.full_name}</Text>
                        <Text size="xs" c="dimmed" tt="capitalize">{exam.exam_type}</Text>
                      </div>
                    </Group>
                    <Badge color={exam.result_status === 'normal' ? 'teal' : 'red'} variant="light">
                      {exam.result_status === 'normal' ? 'Normal' : 'Alterado'}
                    </Badge>
                  </Group>
                </Paper>
              )) : (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <IconStethoscope size={32} className="opacity-20 mb-2"/>
                  <Text size="sm">Nenhum exame finalizado.</Text>
                </div>
              )}

              <Button variant="subtle" fullWidth color="gray" rightSection={<IconArrowUpRight size={14}/>} onClick={() => navigate(`/app/${companyId}/exames`)}>
                Ver histórico completo
              </Button>
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* FILA DE ESPERA */}
      <Paper p="xl" radius="2rem" withBorder>
        <Group justify="space-between" mb="xl">
          <div>
            <Title order={4}>Fila de Atendimento</Title>
            <Text size="xs" c="dimmed">Pacientes aguardando na recepção agora.</Text>
          </div>
          <ActionIcon variant="subtle" color="gray"><IconDotsVertical size={18}/></ActionIcon>
        </Group>

        {queueToday.length > 0 ? (
          <Table verticalSpacing="md" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Horário</Table.Th>
                <Table.Th>Paciente</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {queueToday.map((exam) => (
                <Table.Tr key={exam.id}>
                  <Table.Td>
                    <Group gap="xs" c="dimmed">
                       <IconClock size={14} />
                       <Text size="sm">{dayjs(exam.created_at).format('HH:mm')}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="sm">
                      <Avatar radius="xl" size="sm" color="indigo">{exam.employee?.full_name[0]}</Avatar>
                      <Text size="sm" fw={600}>{exam.employee?.full_name}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="outline" tt="capitalize">{exam.exam_type.replace('_', ' ')}</Badge>
                  </Table.Td>
                  <Table.Td><Badge color="blue">Aguardando</Badge></Table.Td>
                  <Table.Td>
                    <Button size="compact-xs" variant="light" color="blue" leftSection={<IconPlayerPlay size={12}/>} onClick={() => handleExamAction(exam.id)}>
                      Chamar
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <div className="text-center py-10 text-slate-400">
             <IconClipboardHeart size={48} className="opacity-20 mx-auto mb-2" />
             <Text>Fila zerada! Aproveite para um café ☕</Text>
          </div>
        )}
      </Paper>
    </div>
  );
}