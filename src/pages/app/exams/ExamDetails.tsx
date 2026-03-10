import { useEffect, useState } from 'react';
import { 
  Title, Paper, Grid, Group, Text, LoadingOverlay, Badge, Avatar, 
  ActionIcon, ThemeIcon, Divider, Button, Alert, Card, Stack
} from '@mantine/core';
import { 
  IconArrowLeft, IconEar, IconCalculator, IconPrinter, 
  IconCalendarEvent, IconAlertCircle, IconBrain, IconStethoscope, IconActivity
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AudiogramGraph } from '../../../components/Audiogram/AudiogramGraph'; 
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import dayjs from 'dayjs';

export function ExamDetails() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [examData, setExamData] = useState<any>(null);
  const [diagnosis, setDiagnosis] = useState<any>(null); // Estado para o JSON do Cérebro
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExam = async () => {
      if (!examId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('audiometric_exams')
          .select(`
            *, 
            employee:employee_id (full_name, birth_date, gender, cpf),
            professional:professional_id (full_name)
          `)
          .eq('id', examId)
          .single();

        if (error) throw error;
        setExamData(data);

        // --- PARSE DO DIAGNÓSTICO INTELIGENTE ---
        if (data.diagnosis_text) {
          try {
            const parsed = JSON.parse(data.diagnosis_text);
            setDiagnosis(parsed);
          } catch (e) {
            console.error("Erro ao ler diagnóstico JSON", e);
          }
        }

      } catch (err: any) {
        console.error('Erro detalhado:', err);
        setError('Não foi possível carregar os detalhes deste exame.');
        toast.error('Erro ao carregar laudo');
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [examId]);

  // Helpers de Gráfico
  const toPoints = (data: Record<string, number> | null | undefined) => {
    if (!data) return [];
    try {
      return Object.entries(data).map(([freq, db]) => ({ freq: Number(freq), db: Number(db) }));
    } catch (e) { return []; }
  };

  const calculateAverage = (data: Record<string, number> | null | undefined) => {
    if (!data) return '-';
    const v500 = data['500'], v1000 = data['1000'], v2000 = data['2000'];
    if (v500 === undefined || v1000 === undefined || v2000 === undefined) return '-';
    return Math.round((v500 + v1000 + v2000) / 3);
  };

  if (loading) return <LoadingOverlay visible overlayProps={{ blur: 2 }} />;
  if (error) return <Alert color="red" title="Erro" icon={<IconAlertCircle />}>{error}</Alert>;
  if (!examData) return null;

  // Variáveis de Exibição
  const employeeName = examData.employee?.full_name || 'Paciente não identificado';
  const employeeAge = examData.employee?.birth_date ? dayjs().diff(examData.employee.birth_date, 'year') : '--';
  const professionalName = examData.professional?.full_name || 'Profissional não registrado';
  const examDate = examData.exam_date ? dayjs(examData.exam_date).format('DD/MM/YYYY') : '--';
  const isNormal = examData.result_status === 'normal';

  // Helper para exibir Badge de PAINPSE
  const renderPainpseBadge = (analise: any) => {
    if (!analise || analise.status === 'NORMAL') return <Badge color="teal" variant="light">Estável (NR-07)</Badge>;
    return (
      <Badge color="red" variant="filled" leftSection={<IconActivity size={12}/>}>
        Sugestivo de PAINPSE
      </Badge>
    );
  };

  return (
    <div className="w-full space-y-6 animate-fade-in pb-20">
      
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Group>
          <ActionIcon variant="subtle" color="gray" size="lg" radius="xl" onClick={() => navigate(-1)}>
            <IconArrowLeft size={20} />
          </ActionIcon>
          <Group gap="sm">
            <Avatar color="blue" radius="xl" size="lg">{employeeName[0]}</Avatar>
            <div>
               <Text fw={700} size="lg" className="leading-tight">{employeeName}</Text>
               <Text size="sm" c="dimmed">{employeeAge} anos • CPF: {examData.employee?.cpf}</Text>
            </div>
          </Group>
        </Group>
        <Group>
             <div className="text-right mr-4">
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Data do Exame</Text>
                <Group gap={6} justify="end"><IconCalendarEvent size={16}/><Text fw={600}>{examDate}</Text></Group>
             </div>
             <Button variant="outline" color="gray" leftSection={<IconPrinter size={16}/>}>Imprimir</Button>
        </Group>
      </div>

      {/* --- NOVO PAINEL DE DIAGNÓSTICO INTELIGENTE --- */}
      <Paper p="xl" radius="lg" className={`border ${isNormal ? 'border-teal-200 bg-teal-50/30' : 'border-amber-200 bg-amber-50/30'}`}>
         <Group mb="lg">
            <ThemeIcon size="xl" radius="md" color={isNormal ? 'teal' : 'amber'} variant="light">
               <IconBrain size={24} />
            </ThemeIcon>
            <div>
              <Text tt="uppercase" size="xs" fw={700} c="dimmed" style={{ letterSpacing: '1px' }}>Análise do G2a Brain</Text>
               <Title order={3} c="slate.8">Parecer Audiológico & Ocupacional</Title>
            </div>
         </Group>

         {diagnosis ? (
           <Grid gutter="xl">
             {/* Orelha Direita */}
             <Grid.Col span={{ base: 12, md: 6 }}>
               <Card withBorder radius="md" padding="lg" className="bg-white/80">
                 <Group justify="space-between" mb="xs">
                    <Group gap="xs">
                       <IconEar size={20} className="text-red-500" />
                       <Text fw={700} c="red.8">Orelha Direita</Text>
                    </Group>
                    {renderPainpseBadge(diagnosis.od?.analise_painpse)}
                 </Group>
                 <Divider mb="md" />
                 <Stack gap="xs">
                    <Group justify="space-between">
                       <Text size="sm" c="dimmed">Grau (OMS):</Text>
                       <Text fw={600}>{diagnosis.od?.grau_oms || 'N/A'}</Text>
                    </Group>
                    <Group justify="space-between">
                       <Text size="sm" c="dimmed">Tipo de Perda:</Text>
                       <Text fw={600}>{diagnosis.od?.tipo_perda || 'N/A'}</Text>
                    </Group>
                 </Stack>
               </Card>
             </Grid.Col>

             {/* Orelha Esquerda */}
             <Grid.Col span={{ base: 12, md: 6 }}>
               <Card withBorder radius="md" padding="lg" className="bg-white/80">
                 <Group justify="space-between" mb="xs">
                    <Group gap="xs">
                       <IconEar size={20} className="text-blue-500" />
                       <Text fw={700} c="blue.8">Orelha Esquerda</Text>
                    </Group>
                    {renderPainpseBadge(diagnosis.oe?.analise_painpse)}
                 </Group>
                 <Divider mb="md" />
                 <Stack gap="xs">
                    <Group justify="space-between">
                       <Text size="sm" c="dimmed">Grau (OMS):</Text>
                       <Text fw={600}>{diagnosis.oe?.grau_oms || 'N/A'}</Text>
                    </Group>
                    <Group justify="space-between">
                       <Text size="sm" c="dimmed">Tipo de Perda:</Text>
                       <Text fw={600}>{diagnosis.oe?.tipo_perda || 'N/A'}</Text>
                    </Group>
                 </Stack>
               </Card>
             </Grid.Col>
           </Grid>
         ) : (
           <Alert icon={<IconStethoscope />} color="gray">
             O diagnóstico detalhado não foi processado para este exame ou é um registro antigo.
           </Alert>
         )}
      </Paper>

      {/* GRÁFICOS (Mantidos iguais) */}
      <Grid gutter="xl">
        <Grid.Col span={{ base: 12, xl: 6 }}>
          <Paper p="md" radius="xl" className="border border-red-100 bg-white relative overflow-hidden">
            <Group justify="space-between" mb="md" className="border-b border-red-50 pb-2">
               <Group gap="xs">
                  <ThemeIcon color="red" variant="light" radius="md"><IconEar size={18}/></ThemeIcon>
                  <Text fw={700} c="red.8">Orelha Direita (Audiograma)</Text>
               </Group>
               <Badge color="red" variant="light">Média: {calculateAverage(examData.thresholds_od_air)} dB</Badge>
            </Group>
            <div className="flex justify-center pointer-events-none">
              <AudiogramGraph ear="right" airPoints={toPoints(examData.thresholds_od_air)} bonePoints={toPoints(examData.thresholds_od_bone)} onPlot={() => {}} readonly={true} />
            </div>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, xl: 6 }}>
          <Paper p="md" radius="xl" className="border border-blue-100 bg-white relative overflow-hidden">
            <Group justify="space-between" mb="md" className="border-b border-blue-50 pb-2">
               <Group gap="xs">
                  <ThemeIcon color="blue" variant="light" radius="md"><IconEar size={18}/></ThemeIcon>
                  <Text fw={700} c="blue.8">Orelha Esquerda (Audiograma)</Text>
               </Group>
               <Badge color="blue" variant="light">Média: {calculateAverage(examData.thresholds_oe_air)} dB</Badge>
            </Group>
            <div className="flex justify-center pointer-events-none">
              <AudiogramGraph ear="left" airPoints={toPoints(examData.thresholds_oe_air)} bonePoints={toPoints(examData.thresholds_oe_bone)} onPlot={() => {}} readonly={true} />
            </div>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* LOGOAUDIOMETRIA */}
      <Paper p="xl" radius="xl" className="bg-white border border-slate-200 shadow-sm">
        <Group mb="lg">
           <ThemeIcon size="lg" radius="md" color="gray" variant="light"><IconCalculator size={20}/></ThemeIcon>
           <Title order={4} className="text-slate-700">Logoaudiometria</Title>
        </Group>
        <Grid>
          <Grid.Col span={6} className="border-r border-slate-100 pr-8">
            <Text fw={700} c="red" mb="md" size="sm" tt="uppercase" ta="center">Orelha Direita</Text>
            <Group justify="space-between" mb="xs"><Text c="dimmed" size="sm">SRT:</Text><Text fw={700}>{examData.speech_srt_od || '-'} dB</Text></Group>
            <Divider variant="dashed" my="xs" />
            <Group justify="space-between"><Text c="dimmed" size="sm">IPRF:</Text><Text fw={700}>{examData.speech_iprf_od || '-'} %</Text></Group>
          </Grid.Col>
          <Grid.Col span={6} className="pl-8">
            <Text fw={700} c="blue" mb="md" size="sm" tt="uppercase" ta="center">Orelha Esquerda</Text>
            <Group justify="space-between" mb="xs"><Text c="dimmed" size="sm">SRT:</Text><Text fw={700}>{examData.speech_srt_oe || '-'} dB</Text></Group>
            <Divider variant="dashed" my="xs" />
            <Group justify="space-between"><Text c="dimmed" size="sm">IPRF:</Text><Text fw={700}>{examData.speech_iprf_oe || '-'} %</Text></Group>
          </Grid.Col>
        </Grid>
      </Paper>

      {/* FOOTER */}
      <div className="text-center text-slate-400 text-xs mt-8">
        <Text>Exame realizado por: <b>{professionalName}</b></Text>
        <Text>G2a Brain Analysis • Documento gerado em {dayjs().format('DD/MM/YYYY HH:mm')}</Text>
      </div>
    </div>
  );
}
