import React, { useEffect, useState } from 'react';
import { 
  TextInput, 
  Button, 
  Group, 
  SegmentedControl, 
  Text,
  LoadingOverlay,
  Select,
  Divider
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { IconUser, IconId, IconBuildingFactory, IconBriefcase } from '@tabler/icons-react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'sonner';

interface PatientFormProps {
  companyId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PatientForm({ companyId, onSuccess, onCancel }: PatientFormProps) {
  const [loading, setLoading] = useState(false);
  
  // Listas para os Selects
  const [sectors, setSectors] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [ghes, setGhes] = useState<any[]>([]);

  const form = useForm({
    initialValues: {
      fullName: '',
      cpf: '',
      rg: '', // ADICIONADO
      matricula: '',
      birthDate: null as Date | null,
      gender: 'M',
      admissionDate: new Date(),
      sectorId: null as string | null, // ADICIONADO
      jobRoleId: null as string | null, // ADICIONADO
      gheId: null as string | null, // ADICIONADO
    },
    validate: {
      fullName: (val) => (val.length < 3 ? 'Nome muito curto' : null),
      cpf: (val) => (val.replace(/\D/g, '').length !== 11 ? 'CPF incompleto' : null),
      birthDate: (val) => (val === null ? 'Data obrigatória' : null),
      // Setor e Cargo são cruciais, mas deixaremos opcional caso a empresa ainda não tenha cadastrado
    },
  });

  // 1. Buscar Dados Auxiliares (Setores, Cargos, GHE)
  useEffect(() => {
    const fetchData = async () => {
      // Busca Setores
      const { data: sData } = await supabase
        .from('sectors')
        .select('id, name')
        .eq('company_id', companyId);
      if (sData) setSectors(sData.map(s => ({ value: s.id, label: s.name })));

      // Busca Cargos
      const { data: rData } = await supabase
        .from('job_roles')
        .select('id, name')
        .eq('company_id', companyId);
      if (rData) setRoles(rData.map(r => ({ value: r.id, label: r.name })));

      // Busca GHE
      const { data: gData } = await supabase
        .from('ghe')
        .select('id, name')
        .eq('company_id', companyId);
      if (gData) setGhes(gData.map(g => ({ value: g.id, label: g.name })));
    };

    fetchData();
  }, [companyId]);

  const maskCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('employees').insert([
        {
          company_id: companyId,
          full_name: values.fullName,
          cpf: values.cpf.replace(/\D/g, ''),
          rg: values.rg, // Salvando RG
          matricula: values.matricula,
          birth_date: values.birthDate,
          gender: values.gender,
          admission_date: values.admissionDate,
          
          // Vínculos Ocupacionais (IDs reais)
          sector_id: values.sectorId,
          job_role_id: values.jobRoleId,
          ghe_id: values.gheId
        }
      ]);

      if (error) throw error;

      toast.success('Funcionário cadastrado com sucesso!');
      onSuccess();
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)} className="space-y-4 relative">
      <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />
      
      {/* SEÇÃO 1: DADOS PESSOAIS */}
      <Text size="xs" fw={700} c="dimmed" tt="uppercase">Identificação Pessoal</Text>
      
      <TextInput 
        label="Nome Completo" 
        placeholder="Nome conforme documento" 
        required 
        leftSection={<IconUser size={16} />}
        {...form.getInputProps('fullName')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TextInput 
          label="CPF" 
          placeholder="000.000.000-00" 
          required 
          maxLength={14}
          leftSection={<IconId size={16} />}
          {...form.getInputProps('cpf')}
          onChange={(event) => form.setFieldValue('cpf', maskCPF(event.currentTarget.value))}
        />
        
        <TextInput 
          label="RG" 
          placeholder="Número do RG" 
          {...form.getInputProps('rg')}
        />

        <DateInput 
          label="Data de Nascimento" 
          placeholder="DD/MM/AAAA"
          required
          valueFormat="DD/MM/YYYY"
          {...form.getInputProps('birthDate')}
        />
      </div>

      <div>
        <Text size="sm" fw={500} mb={4}>Gênero Biológico</Text>
        <SegmentedControl 
          fullWidth
          size="xs"
          data={[
            { label: 'Masculino', value: 'M' },
            { label: 'Feminino', value: 'F' }
          ]}
          {...form.getInputProps('gender')}
        />
      </div>

      <Divider my="sm" />

      {/* SEÇÃO 2: DADOS OCUPACIONAIS */}
      <Text size="xs" fw={700} c="dimmed" tt="uppercase">Vínculo Empresarial</Text>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextInput 
          label="Matrícula / RE" 
          placeholder="Código interno" 
          {...form.getInputProps('matricula')}
        />
        
        <DateInput 
          label="Data de Admissão" 
          placeholder="DD/MM/AAAA"
          valueFormat="DD/MM/YYYY"
          {...form.getInputProps('admissionDate')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select 
          label="Setor"
          placeholder={sectors.length > 0 ? "Selecione o setor" : "Nenhum setor cadastrado"}
          data={sectors}
          leftSection={<IconBuildingFactory size={16} />}
          searchable
          clearable
          nothingFoundMessage="Nada encontrado"
          disabled={sectors.length === 0}
          {...form.getInputProps('sectorId')}
        />

        <Select 
          label="Cargo / Função"
          placeholder={roles.length > 0 ? "Selecione o cargo" : "Nenhum cargo cadastrado"}
          data={roles}
          leftSection={<IconBriefcase size={16} />}
          searchable
          clearable
          nothingFoundMessage="Nada encontrado"
          disabled={roles.length === 0}
          {...form.getInputProps('jobRoleId')}
        />
      </div>

      <Select 
        label="GHE (Grupo de Exposição)"
        description="Define os riscos auditivos associados"
        placeholder={ghes.length > 0 ? "Selecione o GHE" : "Nenhum GHE cadastrado"}
        data={ghes}
        searchable
        clearable
        disabled={ghes.length === 0}
        {...form.getInputProps('gheId')}
      />

      {/* Alerta se não houver configurações */}
      {sectors.length === 0 && (
        <div className="bg-orange-50 text-orange-800 text-xs p-2 rounded border border-orange-100 mt-2">
          <strong>Atenção:</strong> Configure Setores e Cargos no menu "Configurações" para vincular corretamente.
        </div>
      )}

      <Group justify="flex-end" mt="xl">
        <Button variant="subtle" color="gray" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" color="blue" loading={loading}>Salvar Ficha</Button>
      </Group>
    </form>
  );
}