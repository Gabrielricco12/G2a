import { useEffect, useState } from 'react';
import { 
  Paper,
  Title, 
  Grid, 
  Button, 
  Group, 
  SegmentedControl, 
  Text, 
  TextInput, 
  LoadingOverlay, 
  Badge, 
  Avatar, 
  ActionIcon,
  ThemeIcon 
} from '@mantine/core';
import { 
  IconDeviceFloppy, 
  IconArrowLeft, 
  IconEar, 
  IconCalculator,
  IconBrain
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AudiogramGraph } from '../../../components/Audiogram/AudiogramGraph';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import dayjs from 'dayjs';

// URL DO SEU BACKEND PYTHON (Ajuste se não estiver rodando local)
const BRAIN_API_URL = 'http://localhost:8000/api/v1/exams';

export function NewExam() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [examData, setExamData] = useState<any>(null);

  // --- ESTADOS DOS GRÁFICOS ---
  const [odAir, setOdAir] = useState<Record<string, number>>({});
  const [oeAir, setOeAir] = useState<Record<string, number>>({});
  const [odBone, setOdBone] = useState<Record<string, number>>({});
  const [oeBone, setOeBone] = useState<Record<string, number>>({});

  // Controle de Via
  const [modeOD, setModeOD] = useState('air'); 
  const [modeOE, setModeOE] = useState('air'); 

  // --- LOGOAUDIOMETRIA ---
  const [logo, setLogo] = useState({
    srt_od: '', srt_oe: '',
    iprf_od: '', iprf_oe: ''
  });

  useEffect(() => {
    const fetchExam = async () => {
      if (!examId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('audiometric_exams')
          .select(`*, employee:employee_id (full_name, birth_date, gender, cpf)`)
          .eq('id', examId)
          .single();

        if (error) throw error;
        setExamData(data);

        if (data.thresholds_od_air) setOdAir(data.thresholds_od_air);
        if (data.thresholds_oe_air) setOeAir(data.thresholds_oe_air);
        if (data.thresholds_od_bone) setOdBone(data.thresholds_od_bone);
        if (data.thresholds_oe_bone) setOeBone(data.thresholds_oe_bone);
        
        setLogo({
          srt_od: data.speech_srt_od || '',
          srt_oe: data.speech_srt_oe || '',
          iprf_od: data.speech_iprf_od || '',
          iprf_oe: data.speech_iprf_oe || ''
        });

      } catch (err) {
        toast.error('Erro ao carregar exame');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [examId]);

  // Função unificada de plotagem
  const handlePlot = (ear: 'right' | 'left', freq: number, db: number) => {
    if (ear === 'right') {
      if (modeOD === 'air') setOdAir(prev => ({ ...prev, [freq]: db }));
      else setOdBone(prev => ({ ...prev, [freq]: db }));
    } else {
      if (modeOE === 'air') setOeAir(prev => ({ ...prev, [freq]: db }));
      else setOeBone(prev => ({ ...prev, [freq]: db }));
    }
  };

  const toPoints = (data: Record<string, number>) => {
    return Object.entries(data).map(([freq, db]) => ({ freq: Number(freq), db }));
  };

  const calculateAverage = (data: Record<string, number>) => {
    const v500 = data['500'];
    const v1000 = data['1000'];
    const v2000 = data['2000'];
    if (v500 === undefined || v1000 === undefined || v2000 === undefined) return '-';
    return Math.round((v500 + v1000 + v2000) / 3);
  };

  // --- NOVA FUNÇÃO DE SALVAMENTO VIA G2A BRAIN ---
  const handleSave = async () => {
    if (!examData) return;
    setSaving(true);

    try {
      // 1. Montar Payload conforme schemas.py do Backend
      const payload = {
        exam_id: examId,
        employee_id: examData.employee_id,
        company_id: examData.company_id,
        professional_id: examData.professional_id,
        exam_date: examData.exam_date || new Date().toISOString().split('T')[0],
        // Fallback para admissional se não tiver definido, para não quebrar o teste
        exam_type: examData.exam_type || "periodico", 
        // Fallback para 14h (regra NR-07) se não estiver no form
        rest_hours: examData.rest_hours ? Number(examData.rest_hours) : 14, 
        thresholds_od_air: odAir,
        thresholds_oe_air: oeAir,
        thresholds_od_bone: Object.keys(odBone).length > 0 ? odBone : null,
        thresholds_oe_bone: Object.keys(oeBone).length > 0 ? oeBone : null
      };

      console.log("Enviando para o Cérebro:", payload);

      // 2. Enviar para API Python
      const response = await fetch(BRAIN_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erro no processamento do G2a Brain');
      }

      const result = await response.json();
      
      // 3. Feedback do Processamento Inteligente
      const statusOD = result.analysis.od.status === 'ALTERADO' ? '⚠️ OD Alterada' : '✅ OD Normal';
      const statusOE = result.analysis.oe.status === 'ALTERADO' ? '⚠️ OE Alterada' : '✅ OE Normal';

      toast.success('Processado pelo G2a Brain!', {
        description: `${statusOD} | ${statusOE}`
      });

      // Se deu certo, voltamos. 
      // Nota: O backend criou um NOVO registro. Se a intenção era editar o rascunho,
      // depois precisaremos deletar o rascunho antigo ou ajustar o backend para UPDATE.
      navigate(-1);

    } catch (err: any) {
      console.error(err);
      toast.error('Falha no Processamento', {
        description: err.message
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingOverlay visible overlayProps={{ blur: 2 }} />;

  return (
    <div className="w-full space-y-6 animate-fade-in pb-20">
      
      {/* HEADER FIXO */}
      <div className="sticky top-2 z-50 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-slate-200 flex justify-between items-center">
        <Group>
          <ActionIcon variant="light" color="gray" size="lg" radius="xl" onClick={() => navigate(-1)}>
            <IconArrowLeft size={20} />
          </ActionIcon>
          
          <Group gap="sm">
            <Avatar color="blue" radius="xl">{examData?.employee?.full_name[0]}</Avatar>
            <div>
               <Text fw={700} size="sm" className="leading-tight">{examData?.employee?.full_name}</Text>
               <Text size="xs" c="dimmed">
                 {dayjs().diff(examData?.employee?.birth_date, 'year')} anos • {examData?.employee?.cpf}
               </Text>
            </div>
          </Group>
        </Group>

        <Group>
          <Badge variant="gradient" gradient={{ from: 'indigo', to: 'cyan' }} size="lg">
             G2a Brain Conectado
          </Badge>
          <Button 
            leftSection={<IconBrain size={18} />} 
            radius="xl" 
            color="blue"
            loading={saving}
            onClick={handleSave}
            className="shadow-md transition-transform active:scale-95"
          >
            Processar & Salvar
          </Button>
        </Group>
      </div>

      <Grid gutter="xl">
        
        {/* === COLUNA ESQUERDA: ORELHA DIREITA (VERMELHA) === */}
        <Grid.Col span={{ base: 12, xl: 6 }}>
          <Paper p="md" radius="xl" className="border border-red-100 bg-red-50/20 relative overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <Group gap="xs">
                <ThemeIcon color="red" variant="light" size="lg" radius="md"><IconEar size={20}/></ThemeIcon>
                <div>
                   <Text fw={800} c="red" size="lg">Orelha Direita</Text>
                   <Text size="xs" c="red.6">Média Tritonal: <b>{calculateAverage(odAir)} dB</b></Text>
                </div>
              </Group>
              
              <SegmentedControl 
                size="xs"
                radius="xl"
                color="red"
                data={[
                  { label: 'Via Aérea', value: 'air' },
                  { label: 'Via Óssea', value: 'bone' }
                ]} 
                value={modeOD}
                onChange={setModeOD}
              />
            </div>

            <div className="bg-white rounded-2xl p-2 shadow-sm border border-red-100/50 flex justify-center">
              <AudiogramGraph 
                ear="right"
                airPoints={toPoints(odAir)}
                bonePoints={toPoints(odBone)}
                onPlot={(f, d) => handlePlot('right', f, d)}
              />
            </div>
            
            <Group mt="md" justify="center">
               <Text size="xs" c="dimmed">Mascaramento:</Text>
               <TextInput placeholder="dB" size="xs" w={60} radius="md" />
            </Group>
          </Paper>
        </Grid.Col>

        {/* === COLUNA DIREITA: ORELHA ESQUERDA (AZUL) === */}
        <Grid.Col span={{ base: 12, xl: 6 }}>
          <Paper p="md" radius="xl" className="border border-blue-100 bg-blue-50/20 relative overflow-hidden">
             <div className="flex justify-between items-center mb-4">
              <Group gap="xs">
                <ThemeIcon color="blue" variant="light" size="lg" radius="md"><IconEar size={20}/></ThemeIcon>
                <div>
                   <Text fw={800} c="blue" size="lg">Orelha Esquerda</Text>
                   <Text size="xs" c="blue.6">Média Tritonal: <b>{calculateAverage(oeAir)} dB</b></Text>
                </div>
              </Group>
              
              <SegmentedControl 
                size="xs"
                radius="xl"
                color="blue"
                data={[
                  { label: 'Via Aérea', value: 'air' },
                  { label: 'Via Óssea', value: 'bone' }
                ]} 
                value={modeOE}
                onChange={setModeOE}
              />
            </div>

            <div className="bg-white rounded-2xl p-2 shadow-sm border border-blue-100/50 flex justify-center">
              <AudiogramGraph 
                ear="left" 
                airPoints={toPoints(oeAir)}
                bonePoints={toPoints(oeBone)}
                onPlot={(f, d) => handlePlot('left', f, d)}
              />
            </div>

             <Group mt="md" justify="center">
               <Text size="xs" c="dimmed">Mascaramento:</Text>
               <TextInput placeholder="dB" size="xs" w={60} radius="md" />
            </Group>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* --- SEÇÃO DE LOGOAUDIOMETRIA --- */}
      <Paper p="xl" radius="xl" className="bg-white border border-slate-200 shadow-sm mt-6">
        <Group mb="lg">
           <ThemeIcon size="lg" radius="md" color="gray" variant="light"><IconCalculator size={20}/></ThemeIcon>
           <Title order={4} className="text-slate-700">Logoaudiometria (SRT / IPRF)</Title>
        </Group>
        
        <Grid gutter="xl">
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Text fw={700} c="red" mb="sm" tt="uppercase" size="xs">Orelha Direita</Text>
            <Group grow>
              <TextInput 
                label="SRT (Limiar)" 
                rightSection="dB" 
                radius="md"
                placeholder="Ex: 15" 
                value={logo.srt_od}
                onChange={(e) => setLogo({...logo, srt_od: e.target.value})}
              />
              <TextInput 
                label="IPRF (Discriminação)" 
                rightSection="%" 
                radius="md"
                placeholder="Ex: 100" 
                value={logo.iprf_od}
                onChange={(e) => setLogo({...logo, iprf_od: e.target.value})}
              />
            </Group>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Text fw={700} c="blue" mb="sm" tt="uppercase" size="xs">Orelha Esquerda</Text>
            <Group grow>
              <TextInput 
                label="SRT (Limiar)" 
                rightSection="dB" 
                radius="md"
                placeholder="Ex: 15" 
                value={logo.srt_oe}
                onChange={(e) => setLogo({...logo, srt_oe: e.target.value})}
              />
              <TextInput 
                label="IPRF (Discriminação)" 
                rightSection="%" 
                radius="md"
                placeholder="Ex: 100" 
                value={logo.iprf_oe}
                onChange={(e) => setLogo({...logo, iprf_oe: e.target.value})}
              />
            </Group>
          </Grid.Col>
        </Grid>
      </Paper>
    </div>
  );
}