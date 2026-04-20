import { useCallback, useEffect, useState } from 'react';
import {
  Paper, Grid, Button, Group, SegmentedControl, Text,
  LoadingOverlay, Badge, Avatar, ActionIcon, ThemeIcon,
  Modal, Textarea, Stack, Alert
} from '@mantine/core';
import {
  IconDeviceFloppy, IconArrowLeft, IconCalculator, IconKeyboard,
  IconAlertTriangle, IconPencil, IconHistory
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AudiogramGraph } from '../../../components/Audiogram/AudiogramGraph';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

const FREQUENCIES = [250, 500, 750, 1000, 1500, 2000, 3000, 4000, 6000, 8000];

const G2A_BRAIN_API_URL = "https://g2a-brain-api-575936240892.us-central1.run.app/api/v1/exams";

type GridRow = 'od-air' | 'od-bone' | 'oe-air' | 'oe-bone';
const GRID_ROWS: GridRow[] = ['od-air', 'od-bone', 'oe-air', 'oe-bone'];
const cellId = (row: GridRow, freqIdx: number) => `cell-${row}-${freqIdx}`;

export function NewExam() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [examData, setExamData] = useState<any>(null);
  
  // 🔹 NOVO ESTADO: Guarda o exame de referência do paciente
  const [refExam, setRefExam] = useState<any>(null);

  const [odAir, setOdAir] = useState<Record<string, number>>({});
  const [oeAir, setOeAir] = useState<Record<string, number>>({});
  const [odBone, setOdBone] = useState<Record<string, number>>({});
  const [oeBone, setOeBone] = useState<Record<string, number>>({});

  const [modeOD, setModeOD] = useState('air');
  const [modeOE, setModeOE] = useState('air');

  const [activeRow, setActiveRow] = useState(0);
  const [activeCol, setActiveCol] = useState(0);

  // --- CONTROLE DE EDIÇÃO ---
  const [isEditing, setIsEditing] = useState(false); 
  const [editReasonModal, setEditReasonModal] = useState(false);
  const [editReason, setEditReason] = useState('');

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

        const hadData = data.thresholds_od_air && Object.keys(data.thresholds_od_air).length > 0;
        setIsEditing(hadData);

        if (data.thresholds_od_air) setOdAir(data.thresholds_od_air);
        if (data.thresholds_oe_air) setOeAir(data.thresholds_oe_air);
        if (data.thresholds_od_bone) setOdBone(data.thresholds_od_bone);
        if (data.thresholds_oe_bone) setOeBone(data.thresholds_oe_bone);

        // 🔹 BUSCA O EXAME DE REFERÊNCIA (BASELINE) 🔹
        if (data.employee_id) {
          const { data: refData } = await supabase
            .from('audiometric_exams')
            .select('*')
            .eq('employee_id', data.employee_id)
            .eq('is_reference', true)
            .neq('id', examId) // Ignora se ele mesmo for a referência (caso de edição)
            .order('exam_date', { ascending: false })
            .limit(1);

          if (refData && refData.length > 0) {
            setRefExam(refData[0]);
          }
        }

      } catch (err) {
        toast.error('Erro ao carregar avaliação base');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [examId, navigate]);

  const handlePlot = (ear: 'right' | 'left', freq: number, db: number) => {
    if (ear === 'right') {
      if (modeOD === 'air') setOdAir(prev => ({ ...prev, [freq]: db }));
      else setOdBone(prev => ({ ...prev, [freq]: db }));
    } else {
      if (modeOE === 'air') setOeAir(prev => ({ ...prev, [freq]: db }));
      else setOeBone(prev => ({ ...prev, [freq]: db }));
    }
  };

  const toPoints = (data: Record<string, number>) =>
    Object.entries(data).map(([freq, db]) => ({ freq: Number(freq), db }));

  // --- SALVAR ---
  const executeSave = async (reason?: string) => {
    if (!examData || !user?.id) {
      toast.error('Dados insuficientes para salvar.');
      return;
    }
    setSaving(true);
    const toastId = toast.loading('G2A está analisando e salvando no banco...');
    try {
      const payload = {
        exam_id: examData.id,
        employee_id: examData.employee_id,
        company_id: examData.company_id,
        professional_id: user.id,
        exam_date: examData.exam_date,
        exam_type: examData.exam_type,
        rest_hours: 14,
        thresholds_od_air: odAir,
        thresholds_oe_air: oeAir,
        thresholds_od_bone: Object.keys(odBone).length > 0 ? odBone : null,
        thresholds_oe_bone: Object.keys(oeBone).length > 0 ? oeBone : null,
      };
      const brainResponse = await fetch(G2A_BRAIN_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!brainResponse.ok) {
        const errorData = await brainResponse.json();
        throw new Error(errorData.detail || 'Falha no processamento pelo Cérebro G2A');
      }
      const brainResult = await brainResponse.json();

      const updateData: Record<string, any> = {
        thresholds_od_air: Object.keys(odAir).length > 0 ? odAir : null,
        thresholds_oe_air: Object.keys(oeAir).length > 0 ? oeAir : null,
        thresholds_od_bone: Object.keys(odBone).length > 0 ? odBone : null,
        thresholds_oe_bone: Object.keys(oeBone).length > 0 ? oeBone : null,
        is_reference: brainResult.is_reference,
        result_status: brainResult.result_status,
        diagnosis_text: brainResult.diagnosis_text,
        professional_id: user.id,
        rest_hours_ok: true,
      };

      if (isEditing && reason) {
        updateData.last_edited_at = new Date().toISOString();
        updateData.last_edited_by = user.id;
        updateData.edit_reason = reason;
      }

      const { error: dbError } = await supabase
        .from('audiometric_exams')
        .update(updateData)
        .eq('id', examData.id);
      if (dbError) throw dbError;

      toast.success(
        isEditing ? 'Laudo editado e salvo com sucesso!' : 'Laudo gerado e salvo com sucesso!',
        {
          id: toastId,
          description: isEditing ? 'A edição foi registrada com motivo e autor.' : 'O diagnóstico inteligente já está disponível.',
        }
      );
      navigate(-1);
    } catch (err: any) {
      toast.error('Erro ao processar exame', { id: toastId, description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (isEditing) {
      setEditReasonModal(true);
    } else {
      executeSave();
    }
  };

  const handleConfirmEdit = () => {
    if (!editReason.trim()) {
      toast.error('Informe o motivo da edição.');
      return;
    }
    setEditReasonModal(false);
    executeSave(editReason.trim());
  };

  // --- GRID HELPERS ---
  const getSetterForRow = (row: GridRow) => {
    switch (row) {
      case 'od-air': return setOdAir;
      case 'od-bone': return setOdBone;
      case 'oe-air': return setOeAir;
      case 'oe-bone': return setOeBone;
    }
  };

  const focusCell = useCallback((rowIdx: number, colIdx: number) => {
    const id = cellId(GRID_ROWS[rowIdx], colIdx);
    setTimeout(() => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) { el.focus(); el.select(); }
    }, 0);
  }, []);

  const fmtFreq = (f: number) => (f >= 1000 ? `${f / 1000}k` : `${f}`);

  const handleCellCommit = (row: GridRow, colIdx: number, raw: string) => {
    const freq = FREQUENCIES[colIdx];
    const setter = getSetterForRow(row);
    if (raw.trim() === '') {
      setter(prev => { const n = { ...prev }; delete n[freq]; return n; });
      return;
    }
    const num = parseInt(raw, 10);
    if (isNaN(num)) return;
    const snapped = Math.round(num / 5) * 5;
    const clamped = Math.max(-10, Math.min(120, snapped));
    setter(prev => ({ ...prev, [freq]: clamped }));
  };

  const handleGridKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number) => {
    const lastCol = FREQUENCIES.length - 1;
    switch (e.key) {
      case 'ArrowRight': e.preventDefault(); if (colIdx < lastCol) focusCell(rowIdx, colIdx + 1); break;
      case 'ArrowLeft': e.preventDefault(); if (colIdx > 0) focusCell(rowIdx, colIdx - 1); break;
      case 'ArrowDown': e.preventDefault(); if (rowIdx < 3) focusCell(rowIdx + 1, colIdx); break;
      case 'ArrowUp': e.preventDefault(); if (rowIdx > 0) focusCell(rowIdx - 1, colIdx); break;
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          if (colIdx > 0) focusCell(rowIdx, colIdx - 1);
          else if (rowIdx > 0) focusCell(rowIdx - 1, lastCol);
        } else {
          if (colIdx < lastCol) focusCell(rowIdx, colIdx + 1);
          else if (rowIdx < 3) focusCell(rowIdx + 1, 0);
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (colIdx < lastCol) focusCell(rowIdx, colIdx + 1);
        else if (rowIdx < 3) focusCell(rowIdx + 1, 0);
        break;
      case 'Delete':
        e.preventDefault();
        getSetterForRow(GRID_ROWS[rowIdx])(prev => {
          const n = { ...prev }; delete n[FREQUENCIES[colIdx]]; return n;
        });
        break;
      case 'Backspace':
        if (e.currentTarget.value === '') {
          e.preventDefault();
          if (colIdx > 0) focusCell(rowIdx, colIdx - 1);
        }
        break;
    }
  };

  const countPoints = (d: Record<string, number>) => Object.keys(d).length;
  const totalOD = countPoints(odAir) + countPoints(odBone);
  const totalOE = countPoints(oeAir) + countPoints(oeBone);

  // --- RENDER CELL DE ENTRADA (MANTIDO) ---
  const renderCell = (
    row: GridRow, rowIdx: number, colIdx: number,
    data: Record<string, number>, earColor: string,
  ) => {
    const freq = FREQUENCIES[colIdx];
    const value = data[freq];
    const hasValue = value !== undefined;
    const isActive = activeRow === rowIdx && activeCol === colIdx;

    return (
      <input
        key={`${row}-${freq}`}
        id={cellId(row, colIdx)}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={hasValue ? `${value}` : ''}
        placeholder=""
        onFocus={() => { setActiveRow(rowIdx); setActiveCol(colIdx); }}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '' || v === '-' || /^-?\d{0,3}$/.test(v)) {
            const setter = getSetterForRow(row);
            if (v === '' || v === '-') {
              setter(prev => { const n = { ...prev }; delete n[freq]; return n; });
            } else {
              const num = parseInt(v, 10);
              if (!isNaN(num)) setter(prev => ({ ...prev, [freq]: num }));
            }
          }
        }}
        onBlur={(e) => handleCellCommit(row, colIdx, e.target.value)}
        onKeyDown={(e) => handleGridKeyDown(e, rowIdx, colIdx)}
        className="audiometer-cell"
        style={{
          width: '100%', height: 34, border: 'none',
          borderRight: colIdx < FREQUENCIES.length - 1 ? '1px solid #e2e8f0' : 'none',
          textAlign: 'center', fontSize: 14, fontWeight: hasValue ? 700 : 400,
          fontVariantNumeric: 'tabular-nums', fontFamily: "'SF Mono', 'Cascadia Code', 'Consolas', monospace",
          color: hasValue ? '#111' : '#d1d5db',
          backgroundColor: isActive ? earColor + '14' : 'transparent',
          outline: 'none', caretColor: earColor, padding: 0, boxSizing: 'border-box',
        }}
      />
    );
  };

  const renderEarGrid = (
    label: string, earColor: string,
    airData: Record<string, number>, boneData: Record<string, number>,
    airRowIdx: number, boneRowIdx: number,
  ) => {
    const airRow = GRID_ROWS[airRowIdx];
    const boneRow = GRID_ROWS[boneRowIdx];
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(${FREQUENCIES.length}, 1fr)` }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 13, color: earColor, backgroundColor: earColor + '0A',
            borderBottom: `2px solid ${earColor}`, padding: '6px 0',
          }}>{label}</div>
          {FREQUENCIES.map((freq) => (
            <div key={freq} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600, color: '#64748b',
              backgroundColor: '#f8fafc', borderLeft: '1px solid #e2e8f0',
              borderBottom: `2px solid ${earColor}`, padding: '6px 0',
              fontFamily: "'SF Mono', 'Cascadia Code', 'Consolas', monospace",
            }}>{fmtFreq(freq)}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(${FREQUENCIES.length}, 1fr)`, borderBottom: '1px solid #f1f5f9' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: earColor, backgroundColor: earColor + '06', 
            letterSpacing: '0.05em', borderRight: '1px solid #e2e8f0',
          }}>VA</div>
          {FREQUENCIES.map((_, colIdx) => renderCell(airRow, airRowIdx, colIdx, airData, earColor))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(${FREQUENCIES.length}, 1fr)`, borderBottom: '1px solid #e2e8f0' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: earColor, backgroundColor: earColor + '06', 
            letterSpacing: '0.05em', borderRight: '1px solid #e2e8f0',
          }}>VO</div>
          {FREQUENCIES.map((_, colIdx) => renderCell(boneRow, boneRowIdx, colIdx, boneData, earColor))}
        </div>
      </>
    );
  };

  // 🔹 RENDERIZADORES PARA O GRID DE REFERÊNCIA (APENAS LEITURA) 🔹
  const renderRefCell = (colIdx: number, data: Record<string, number> | null | undefined) => {
    const freq = FREQUENCIES[colIdx];
    const value = data ? data[freq] : undefined;
    const hasValue = value !== undefined;
    return (
      <div
        key={freq}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: 34, borderRight: colIdx < FREQUENCIES.length - 1 ? '1px dashed #e2e8f0' : 'none',
          fontSize: 13, fontWeight: hasValue ? 700 : 400,
          color: hasValue ? '#334155' : '#cbd5e1',
          backgroundColor: 'transparent',
          fontFamily: "'SF Mono', 'Cascadia Code', 'Consolas', monospace",
        }}
      >
        {hasValue ? value : '--'}
      </div>
    );
  };

  const renderRefEarGrid = (
    label: string, earColor: string,
    airData: Record<string, number> | null | undefined,
    boneData: Record<string, number> | null | undefined
  ) => {
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(${FREQUENCIES.length}, 1fr)` }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 12, color: earColor, backgroundColor: earColor + '0A',
            borderBottom: `2px dashed ${earColor}`, padding: '4px 0', opacity: 0.8
          }}>{label}</div>
          {FREQUENCIES.map((freq) => (
            <div key={freq} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 600, color: '#94a3b8',
              backgroundColor: '#f8fafc', borderLeft: '1px dashed #e2e8f0',
              borderBottom: `2px dashed ${earColor}`, padding: '4px 0',
              fontFamily: "'SF Mono', 'Cascadia Code', 'Consolas', monospace",
            }}>{fmtFreq(freq)}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(${FREQUENCIES.length}, 1fr)`, borderBottom: '1px dashed #f1f5f9', backgroundColor: '#f8fafc' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: earColor, backgroundColor: earColor + '06',
            letterSpacing: '0.05em', borderRight: '1px dashed #e2e8f0', opacity: 0.8
          }}>VA</div>
          {FREQUENCIES.map((_, colIdx) => renderRefCell(colIdx, airData))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(${FREQUENCIES.length}, 1fr)`, borderBottom: '1px dashed #e2e8f0', backgroundColor: '#f8fafc' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: earColor, backgroundColor: earColor + '06',
            letterSpacing: '0.05em', borderRight: '1px dashed #e2e8f0', opacity: 0.8
          }}>VO</div>
          {FREQUENCIES.map((_, colIdx) => renderRefCell(colIdx, boneData))}
        </div>
      </>
    );
  };


  if (loading) return <LoadingOverlay visible overlayProps={{ blur: 2 }} />;

  return (
    <div className="w-full max-w-[1440px] mx-auto space-y-4 animate-fade-in pb-16">

      {/* ══════════ HEADER ══════════ */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 -mx-4 px-6 py-3 flex justify-between items-center">
        <Group gap="md">
          <ActionIcon variant="subtle" color="gray" size="lg" radius="xl" onClick={() => navigate(-1)}>
            <IconArrowLeft size={18} />
          </ActionIcon>
          <div className="h-8 w-px bg-slate-200" />
          <Group gap="sm">
            <Avatar color={examData?.employee?.gender === 'F' ? 'pink' : 'blue'} radius="xl" size="sm">
              {examData?.employee?.full_name?.[0] || 'P'}
            </Avatar>
            <div className="leading-none">
              <Text fw={700} size="sm" lh={1.2}>
                {examData?.employee?.full_name || 'Paciente'}
              </Text>
              <Text size="xs" c="dimmed" lh={1.2}>
                {examData?.employee?.birth_date
                  ? `${dayjs().diff(examData.employee.birth_date, 'year')} anos`
                  : '—'}{' '}
                · {examData?.exam_type || 'Exame'} ·{' '}
                {examData?.exam_date ? dayjs(examData.exam_date).format('DD/MM/YYYY') : '—'}
              </Text>
            </div>
          </Group>
        </Group>
        <Group gap="sm">
          {isEditing && (
            <Badge variant="light" color="orange" size="sm" radius="sm" leftSection={<IconPencil size={12} />}
              styles={{ label: { textTransform: 'none', fontWeight: 600 } }}>
              Modo Edição
            </Badge>
          )}
          <Badge variant="light" color="teal" size="sm" radius="sm"
            styles={{ label: { textTransform: 'none', fontWeight: 500 } }}>
            G2a Brain conectado
          </Badge>
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            radius="md" size="sm" color={isEditing ? 'orange' : 'blue'}
            loading={saving} onClick={handleSave}
            styles={{ root: { fontWeight: 600 } }}
          >
            {isEditing ? 'Salvar Edição' : 'Processar e Salvar'}
          </Button>
        </Group>
      </div>

      {/* Alerta de edição */}
      {isEditing && (
        <Alert variant="light" color="orange" icon={<IconAlertTriangle size={18} />} radius="lg">
          <Text size="sm" fw={500}>
            Você está editando um laudo já finalizado. Ao salvar, será solicitado o motivo da alteração.
            A edição ficará registrada com seu nome, data/hora e justificativa.
          </Text>
        </Alert>
      )}

      {/* ══════════ AUDIOGRAMAS ══════════ */}
      <Grid gutter="md" align="stretch">
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Paper p="sm" radius="lg" className="border border-slate-200 bg-white h-full">
            <div className="flex items-center justify-between mb-3 px-1">
              <Group gap={8}>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#CC0000' }} />
                <Text fw={700} size="sm" c="dark">Orelha Direita</Text>
                <Badge size="xs" variant="light" color="gray" radius="sm"
                  styles={{ label: { textTransform: 'none' } }}>
                  {totalOD} pt{totalOD !== 1 ? 's' : ''}
                </Badge>
              </Group>
              <SegmentedControl size="xs" radius="md" color="red"
                data={[{ label: 'Aérea', value: 'air' }, { label: 'Óssea', value: 'bone' }]}
                value={modeOD} onChange={setModeOD}
                styles={{ root: { backgroundColor: '#fef2f2' } }}
              />
            </div>
            <div className="bg-white rounded-xl flex justify-center">
              <AudiogramGraph ear="right" airPoints={toPoints(odAir)} bonePoints={toPoints(odBone)}
                onPlot={(f, d) => handlePlot('right', f, d)} />
            </div>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Paper p="sm" radius="lg" className="border border-slate-200 bg-white h-full">
            <div className="flex items-center justify-between mb-3 px-1">
              <Group gap={8}>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#0044CC' }} />
                <Text fw={700} size="sm" c="dark">Orelha Esquerda</Text>
                <Badge size="xs" variant="light" color="gray" radius="sm"
                  styles={{ label: { textTransform: 'none' } }}>
                  {totalOE} pt{totalOE !== 1 ? 's' : ''}
                </Badge>
              </Group>
              <SegmentedControl size="xs" radius="md" color="blue"
                data={[{ label: 'Aérea', value: 'air' }, { label: 'Óssea', value: 'bone' }]}
                value={modeOE} onChange={setModeOE}
                styles={{ root: { backgroundColor: '#eff6ff' } }}
              />
            </div>
            <div className="bg-white rounded-xl flex justify-center">
              <AudiogramGraph ear="left" airPoints={toPoints(oeAir)} bonePoints={toPoints(oeBone)}
                onPlot={(f, d) => handlePlot('left', f, d)} />
            </div>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* ══════════ GRID ESTILO AUDIÔMETRO (DIGITAÇÃO) ══════════ */}
      <Paper p="md" radius="lg" withBorder className="bg-white">
        <Group mb="sm" justify="space-between">
          <Group gap={8}>
            <ThemeIcon size="md" radius="md" color="gray" variant="light">
              <IconCalculator size={16} />
            </ThemeIcon>
            <Text fw={700} size="sm" c="dark">Limiares Atuais (dB HL)</Text>
          </Group>
          <Group gap={6}>
            <IconKeyboard size={14} className="text-slate-400" />
            <Text size="xs" c="dimmed">← → ↑ ↓ para navegar · Enter avança · Delete limpa</Text>
          </Group>
        </Group>
        <div className="overflow-x-auto rounded-lg border border-slate-200" style={{ minWidth: 0 }}>
          {renderEarGrid('OD', '#CC0000', odAir, odBone, 0, 1)}
          {renderEarGrid('OE', '#0044CC', oeAir, oeBone, 2, 3)}
        </div>
      </Paper>

      {/* ══════════ EXAME DE REFERÊNCIA (BASELINE) ══════════ */}
      {refExam && (
        <Paper p="md" radius="lg" withBorder className="bg-slate-50 border-dashed border-slate-300">
          <Group mb="sm" justify="space-between">
            <Group gap={8}>
              <ThemeIcon size="md" radius="md" color="teal" variant="light">
                <IconHistory size={16} />
              </ThemeIcon>
              <Text fw={700} size="sm" c="dark">Exame de Referência (Baseline)</Text>
              <Badge size="xs" color="teal" variant="light" styles={{ label: { textTransform: 'none' } }}>
                Realizado em {dayjs(refExam.exam_date).format('DD/MM/YYYY')}
              </Badge>
            </Group>
            <Text size="xs" c="dimmed">Apenas visualização</Text>
          </Group>
          <div className="overflow-x-auto rounded-lg border border-slate-200 opacity-85" style={{ minWidth: 0 }}>
            {renderRefEarGrid('OD', '#CC0000', refExam.thresholds_od_air, refExam.thresholds_od_bone)}
            {renderRefEarGrid('OE', '#0044CC', refExam.thresholds_oe_air, refExam.thresholds_oe_bone)}
          </div>
        </Paper>
      )}

      {/* ══════════ MODAL DE MOTIVO DA EDIÇÃO ══════════ */}
      <Modal
        opened={editReasonModal}
        onClose={() => setEditReasonModal(false)}
        title={
          <Group>
            <IconPencil size={20} className="text-orange-500" />
            <Text fw={700}>Motivo da Edição</Text>
          </Group>
        }
        centered radius="lg"
      >
        <Stack>
          <Alert color="orange" variant="light" icon={<IconAlertTriangle />}>
            Este laudo já foi finalizado. Registre o motivo da alteração para manter a rastreabilidade.
            Seu nome e a data/hora serão registrados automaticamente.
          </Alert>
          <Textarea
            label="Justificativa"
            placeholder="Ex: Correção de limiar na frequência 4000Hz OD — valor digitado incorretamente."
            value={editReason}
            onChange={(e) => setEditReason(e.target.value)}
            minRows={3}
            autoFocus
          />
          <Group justify="end" mt="md">
            <Button variant="default" onClick={() => setEditReasonModal(false)}>Cancelar</Button>
            <Button color="orange" onClick={handleConfirmEdit} loading={saving}
              leftSection={<IconDeviceFloppy size={16} />}>
              Confirmar e Salvar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
