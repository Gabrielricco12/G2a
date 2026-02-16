import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Grid,
  Group,
  LoadingOverlay,
  Paper,
  SegmentedControl,
  Text, TextInput,
  ThemeIcon // <--- ADDED HERE
  ,
  Title
} from '@mantine/core';
import {
  IconArrowLeft,
  IconCalculator,
  IconDeviceFloppy,
  IconEar
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AudiogramGraph } from '../../../components/Audiogram/AudiogramGraph';
import { supabase } from '../../../lib/supabase';

export function NewExam() {
  const { companyId, examId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Exam and Patient Data
  const [examData, setExamData] = useState<any>(null);

  // --- THRESHOLDS STATE ---
  const [odAir, setOdAir] = useState<Record<string, number>>({});
  const [oeAir, setOeAir] = useState<Record<string, number>>({});
  const [odBone, setOdBone] = useState<Record<string, number>>({});
  const [oeBone, setOeBone] = useState<Record<string, number>>({});

  // Conductive Mode (Interface)
  const [modeOD, setModeOD] = useState('air'); // 'air' | 'bone'
  const [modeOE, setModeOE] = useState('air'); // 'air' | 'bone'

  // --- SPEECH AUDIOMETRY ---
  const [logo, setLogo] = useState({
    srt_od: '', srt_oe: '',
    iprf_od: '', iprf_oe: ''
  });

  // 1. LOAD INITIAL DATA
  useEffect(() => {
    const fetchExam = async () => {
      if (!examId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('audiometric_exams')
          .select(`
            *,
            employee:employee_id (full_name, birth_date, gender, cpf)
          `)
          .eq('id', examId)
          .single();

        if (error) throw error;
        setExamData(data);

        // Populate state if data exists (Recovery)
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
        toast.error('Error loading exam');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [examId]);

  // 2. PLOT ON GRAPH
  const handlePlot = (ear: 'right' | 'left', freq: number, db: number) => {
    // Determine which state to update based on ear and current mode
    if (ear === 'right') {
      if (modeOD === 'air') setOdAir(prev => ({ ...prev, [freq]: db }));
      else setOdBone(prev => ({ ...prev, [freq]: db }));
    } else {
      if (modeOE === 'air') setOeAir(prev => ({ ...prev, [freq]: db }));
      else setOeBone(prev => ({ ...prev, [freq]: db }));
    }
  };

  // Helper: Convert Object to Array [{freq, db}] for graph component
  const toPoints = (data: Record<string, number>) => {
    return Object.entries(data).map(([freq, db]) => ({ freq: Number(freq), db }));
  };

  // 3. CALCULATE AVERAGES (Tritonal: 500, 1k, 2k)
  const calculateAverage = (data: Record<string, number>) => {
    const v500 = data['500'];
    const v1000 = data['1000'];
    const v2000 = data['2000'];
    if (v500 === undefined || v1000 === undefined || v2000 === undefined) return '-';
    return Math.round((v500 + v1000 + v2000) / 3);
  };

  // 4. SAVE TO SUPABASE
  const handleSave = async () => {
    setSaving(true);
    try {
      // Simple Diagnosis Logic (Automatic Suggestion)
      const avgOD = calculateAverage(odAir);
      const avgOE = calculateAverage(oeAir);
      let status = 'normal';
      if ((avgOD !== '-' && Number(avgOD) > 25) || (avgOE !== '-' && Number(avgOE) > 25)) {
        status = 'alterado'; // Simplified status
      }

      const { error } = await supabase
        .from('audiometric_exams')
        .update({
          thresholds_od_air: odAir,
          thresholds_oe_air: oeAir,
          thresholds_od_bone: odBone,
          thresholds_oe_bone: oeBone,
          speech_srt_od: logo.srt_od || null,
          speech_srt_oe: logo.srt_oe || null,
          speech_iprf_od: logo.iprf_od || null,
          speech_iprf_oe: logo.iprf_oe || null,
          result_status: status,
        })
        .eq('id', examId);

      if (error) throw error;

      toast.success('Exam saved successfully!');
      navigate(-1); // Return to Hub
    } catch (err) {
      toast.error('Error saving');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingOverlay visible overlayProps={{ blur: 2 }} />;

  return (
    <div className="w-full space-y-6 animate-fade-in pb-20">
      
      {/* FIXED EXAM HEADER */}
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
                 {dayjs().diff(examData?.employee?.birth_date, 'year')} years • {examData?.employee?.cpf}
               </Text>
            </div>
          </Group>
        </Group>

        <Group>
          <Badge variant="dot" color="gray" size="lg">In Progress</Badge>
          <Button 
            leftSection={<IconDeviceFloppy size={18} />} 
            radius="xl" 
            color="blue"
            loading={saving}
            onClick={handleSave}
            className="shadow-md"
          >
            Save Exam
          </Button>
        </Group>
      </div>

      <Grid gutter="xl">
        
        {/* === LEFT COLUMN: RIGHT EAR (RED) === */}
        <Grid.Col span={{ base: 12, xl: 6 }}>
          <Paper p="md" radius="xl" className="border border-red-100 bg-red-50/20 relative overflow-hidden">
            {/* Ear Header */}
            <div className="flex justify-between items-center mb-4">
              <Group gap="xs">
                <ThemeIcon color="red" variant="light" size="lg" radius="md"><IconEar size={20}/></ThemeIcon>
                <div>
                   <Text fw={800} c="red" size="lg">Orelha Direita</Text>
                   <Text size="xs" c="red.6">Tritonal Avg: <b>{calculateAverage(odAir)} dB</b></Text>
                </div>
              </Group>
              
              <SegmentedControl 
                size="xs"
                radius="xl"
                color="red"
                data={[
                  { label: 'Air', value: 'air' },
                  { label: 'Bone', value: 'bone' }
                ]} 
                value={modeOD}
                onChange={setModeOD}
              />
            </div>

            {/* THE GRAPH (REUSABLE) */}
            <div className="bg-white rounded-2xl p-2 shadow-sm border border-red-100/50 flex justify-center">
              <AudiogramGraph 
                ear="right" 
                conduction={modeOD as 'air' | 'bone'} 
                points={modeOD === 'air' ? toPoints(odAir) : toPoints(odBone)} 
                onPlot={(f, d) => handlePlot('right', f, d)}
              />
            </div>
            
            {/* Quick Masking Input (Optional) */}
            <Group mt="md" justify="center">
               <Text size="xs" c="dimmed">Masking:</Text>
               <TextInput placeholder="dB" size="xs" w={60} radius="md" />
            </Group>
          </Paper>
        </Grid.Col>

        {/* === RIGHT COLUMN: LEFT EAR (BLUE) === */}
        <Grid.Col span={{ base: 12, xl: 6 }}>
          <Paper p="md" radius="xl" className="border border-blue-100 bg-blue-50/20 relative overflow-hidden">
             {/* Ear Header */}
             <div className="flex justify-between items-center mb-4">
              <Group gap="xs">
                <ThemeIcon color="blue" variant="light" size="lg" radius="md"><IconEar size={20}/></ThemeIcon>
                <div>
                   <Text fw={800} c="blue" size="lg">Orelha Esquerda</Text>
                   <Text size="xs" c="blue.6">Tritonal Avg: <b>{calculateAverage(oeAir)} dB</b></Text>
                </div>
              </Group>
              
              <SegmentedControl 
                size="xs"
                radius="xl"
                color="blue"
                data={[
                  { label: 'Air', value: 'air' },
                  { label: 'Bone', value: 'bone' }
                ]} 
                value={modeOE}
                onChange={setModeOE}
              />
            </div>

            {/* THE GRAPH */}
            <div className="bg-white rounded-2xl p-2 shadow-sm border border-blue-100/50 flex justify-center">
              <AudiogramGraph 
                ear="left" 
                conduction={modeOE as 'air' | 'bone'} 
                points={modeOE === 'air' ? toPoints(oeAir) : toPoints(oeBone)} 
                onPlot={(f, d) => handlePlot('left', f, d)}
              />
            </div>

             <Group mt="md" justify="center">
               <Text size="xs" c="dimmed">Masking:</Text>
               <TextInput placeholder="dB" size="xs" w={60} radius="md" />
            </Group>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* --- SPEECH AUDIOMETRY SECTION --- */}
      <Paper p="xl" radius="xl" className="bg-white border border-slate-200 shadow-sm mt-6">
        <Group mb="lg">
           <ThemeIcon size="lg" radius="md" color="gray" variant="light"><IconCalculator size={20}/></ThemeIcon>
           <Title order={4} className="text-slate-700">Speech Audiometry (SRT / WRS)</Title>
        </Group>
        
        <Grid gutter="xl">
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Text fw={700} c="red" mb="sm" tt="uppercase" size="xs">Right Ear</Text>
            <Group grow>
              <TextInput 
                label="SRT" 
                rightSection="dB" 
                radius="md"
                placeholder="Ex: 15" 
                value={logo.srt_od}
                onChange={(e) => setLogo({...logo, srt_od: e.target.value})}
              />
              <TextInput 
                label="WRS (Discrim)" 
                rightSection="%" 
                radius="md"
                placeholder="Ex: 100" 
                value={logo.iprf_od}
                onChange={(e) => setLogo({...logo, iprf_od: e.target.value})}
              />
            </Group>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Text fw={700} c="blue" mb="sm" tt="uppercase" size="xs">Left Ear</Text>
            <Group grow>
              <TextInput 
                label="SRT" 
                rightSection="dB" 
                radius="md"
                placeholder="Ex: 15" 
                value={logo.srt_oe}
                onChange={(e) => setLogo({...logo, srt_oe: e.target.value})}
              />
              <TextInput 
                label="WRS (Discrim)" 
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