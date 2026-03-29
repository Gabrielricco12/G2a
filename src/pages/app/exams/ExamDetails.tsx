import { useEffect, useState } from 'react';
import { 
  Title, Paper, Grid, Group, Text, LoadingOverlay, Badge, Avatar, 
  ActionIcon, ThemeIcon, Divider, Button, Alert, Card, Stack
} from '@mantine/core';
import { 
  IconArrowLeft, IconEar, IconPrinter, IconCalendarEvent, 
  IconAlertCircle, IconBrain, IconStethoscope, IconFileDescription
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown'; 
import { AudiogramGraph } from '../../../components/Audiogram/AudiogramGraph'; 
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import dayjs from 'dayjs';

export function ExamDetails() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [examData, setExamData] = useState<any>(null);
  const [diagnosis, setDiagnosis] = useState<any>(null); 
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExam = async () => {
      if (!examId) return;
      setLoading(true);
      try {
        // Buscando dados do exame + Paciente + Profissional (incluindo Conselho)
        const { data, error: fetchError } = await supabase
          .from('audiometric_exams')
          .select(`
            *, 
            employee:employee_id (full_name, birth_date, gender, cpf),
            professional:professional_id (full_name, crfa_numero, crfa_regiao)
          `)
          .eq('id', examId)
          .single();

        if (fetchError) throw fetchError;
        setExamData(data);

        if (data.diagnosis_text) {
          try {
            let parsed = JSON.parse(data.diagnosis_text);
            if (typeof parsed === 'string') parsed = JSON.parse(parsed);
            setDiagnosis(parsed);
          } catch (e) {
            console.error("Erro no Parse do JSON:", e);
          }
        }
      } catch (err: any) {
        setError('Erro ao carregar os dados. Verifique a conexão.');
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [examId]);

  // Lógica de Impressão (Geração de PDF via Browser com layout de documento)
  const handlePrint = () => {
    window.print();
  };

  if (loading) return <LoadingOverlay visible overlayProps={{ blur: 2 }} />;
  if (error) return <Alert color="red" icon={<IconAlertCircle />}>{error}</Alert>;
  if (!examData) return null;

  // Variáveis de Exibição
  const employeeName = examData.employee?.full_name || '---';
  const employeeCpf = examData.employee?.cpf || '---';
  const employeeAge = examData.employee?.birth_date ? dayjs().diff(examData.employee.birth_date, 'year') : '--';
  const examDate = examData.exam_date ? dayjs(examData.exam_date).format('DD/MM/YYYY') : '--';
  
  // Dados do Profissional (Fonoaudiólogo)
  const fonoName = examData.professional?.full_name || 'Profissional não identificado';
  const fonoCRFa = examData.professional?.crfa_numero ? `CRFa: ${examData.professional.crfa_numero}` : 'CRFa: ---';
  const fonoRegiao = examData.professional?.crfa_regiao ? ` - ${examData.professional.crfa_regiao}ª Região` : '';

  const clinico = diagnosis?.clinico || {};
  const aiInsights = diagnosis?.ai_insights || "Processando análise...";
  const isNormal = examData.result_status === 'normal';

  const toPoints = (data: any) => data ? Object.entries(data).map(([f, d]) => ({ freq: Number(f), db: Number(d) })) : [];

  return (
    <div className="w-full space-y-6 animate-fade-in pb-20">
      
      {/* 1. BARRA DE AÇÕES (OCULTA NO PDF) */}
      <div className="print:hidden bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
        <Button variant="subtle" color="gray" leftSection={<IconArrowLeft size={18}/>} onClick={() => navigate(-1)}>
          Voltar
        </Button>
        <Group>
          <Badge size="lg" color={isNormal ? 'teal' : 'orange'}>
            Status: {examData.result_status?.toUpperCase()}
          </Badge>
          <Button color="blue" leftSection={<IconPrinter size={18}/>} onClick={handlePrint}>
            Gerar PDF do Laudo
          </Button>
        </Group>
      </div>

      {/* 2. O LAUDO PARA IMPRESSÃO (ESTRUTURA DE DOCUMENTO) */}
      <Paper id="printable-laudo" p="xl" radius="md" withBorder className="bg-white shadow-sm print:border-none print:shadow-none print:p-0">
        
        {/* Cabeçalho do Laudo */}
        <div className="text-center mb-8">
          <Title order={2} className="text-slate-800 uppercase tracking-tight">Relatório de Avaliação Audiométrica</Title>
          <Text size="sm" c="dimmed">Documento Gerado via G2a Brain AI</Text>
        </div>

        <Divider mb="xl" label="Identificação do Paciente" labelPosition="center" />

        <Grid mb="xl">
          <Grid.Col span={6}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Nome do Colaborador</Text>
            <Text fw={600} size="md">{employeeName}</Text>
          </Grid.Col>
          <Grid.Col span={3}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>CPF</Text>
            <Text fw={600}>{employeeCpf}</Text>
          </Grid.Col>
          <Grid.Col span={3}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Data do Exame</Text>
            <Text fw={600}>{examDate}</Text>
          </Grid.Col>
        </Grid>

        {/* Análise da IA (Ocupacional e Clínica) */}
        <div className="mb-10 bg-slate-50 p-6 rounded-xl border border-slate-100 print:bg-transparent print:border-slate-200">
          <Group mb="md">
            <IconBrain className="text-blue-600 print:hidden" size={24} />
            <Title order={4}>Parecer Fonoaudiológico (AI Insights)</Title>
          </Group>
          <article className="prose prose-sm max-w-none text-slate-700 leading-relaxed">
            <ReactMarkdown>{aiInsights}</ReactMarkdown>
          </article>
        </div>

        <Title order={4} mb="md" className="flex items-center gap-2">
          <IconStethoscope size={20} className="text-slate-400" /> Resultados Quantitativos
        </Title>

        <Grid mb="xl">
          <Grid.Col span={6}>
            <Card withBorder radius="md">
              <Text fw={700} c="red.8" mb="xs">Orelha Direita (OD)</Text>
              <Text size="sm">Média Tritonal: <b>{clinico.od?.media_oms} dB</b></Text>
              <Text size="sm">Grau: <b>{clinico.od?.grau_oms}</b></Text>
              <Text size="sm">Configuração: <b>{clinico.od?.tipo_perda}</b></Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={6}>
            <Card withBorder radius="md">
              <Text fw={700} c="blue.8" mb="xs">Orelha Esquerda (OE)</Text>
              <Text size="sm">Média Tritonal: <b>{clinico.oe?.media_oms} dB</b></Text>
              <Text size="sm">Grau: <b>{clinico.oe?.grau_oms}</b></Text>
              <Text size="sm">Configuração: <b>{clinico.oe?.tipo_perda}</b></Text>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Gráficos em tamanho reduzido para o PDF */}
        <Grid mb={50}>
          <Grid.Col span={6}>
             <Paper withBorder p="xs" radius="md">
                <Text size="xs" fw={700} ta="center" mb={5}>AUDIOGRAMA OD</Text>
                <AudiogramGraph ear="right" airPoints={toPoints(examData.thresholds_od_air)} bonePoints={toPoints(examData.thresholds_od_bone)} readonly />
             </Paper>
          </Grid.Col>
          <Grid.Col span={6}>
             <Paper withBorder p="xs" radius="md">
                <Text size="xs" fw={700} ta="center" mb={5}>AUDIOGRAMA OE</Text>
                <AudiogramGraph ear="left" airPoints={toPoints(examData.thresholds_oe_air)} bonePoints={toPoints(examData.thresholds_oe_bone)} readonly />
             </Paper>
          </Grid.Col>
        </Grid>

        {/* RODAPÉ DE ASSINATURA (Onde sai o CRFa) */}
        <div className="mt-20 flex flex-col items-center">
          <div className="w-64 border-t border-slate-400 mb-2"></div>
          <Text fw={700} size="md">{fonoName}</Text>
          <Text size="sm" c="dimmed">{fonoCRFa}{fonoRegiao}</Text>
          <Text size="xs" c="dimmed" mt={4}>Fonoaudiólogo(a) Responsável</Text>
        </div>

      </Paper>

      {/* Estilos para garantir que o PDF saia perfeito */}
      <style>{`
        @media print {
          body { background: white !important; }
          .mantine-AppShell-main { padding: 0 !important; }
          nav, header, footer, .print\\:hidden { display: none !important; }
          #printable-laudo { border: none !important; margin: 0 !important; padding: 0 !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>

    </div>
  );
}