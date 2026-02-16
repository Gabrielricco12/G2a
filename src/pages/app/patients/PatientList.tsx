import React, { useState } from 'react';
import { 
  Paper, 
  Group, 
  TextInput, 
  Table, 
  Avatar, 
  Text, 
  Badge, 
  ActionIcon, 
  Menu,
  LoadingOverlay,
  Tooltip
} from '@mantine/core';
import { 
  IconSearch, 
  IconDotsVertical, 
  IconEdit, 
  IconBriefcase, 
  IconTrash,
  IconUser,
  IconEye
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';

interface PatientListProps {
  data: any[];
  loading: boolean;
  onEdit: (patient: any) => void;
}

export function PatientList({ data, loading, onEdit }: PatientListProps) {
  const navigate = useNavigate();
  const { companyId } = useParams(); // Necessário para montar a URL correta
  const [search, setSearch] = useState('');

  // Lógica de filtro local (Nome ou CPF)
  const filteredPatients = data.filter(p => 
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.cpf.includes(search)
  );

  // Formata CPF visualmente
  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  return (
    <div className="space-y-4">
      {/* BARRA DE PESQUISA */}
      <Paper p="md" radius="xl" className="backdrop-blur-xl bg-white/60 border border-white/60 shadow-sm transition-all hover:shadow-md">
        <TextInput 
          placeholder="Buscar funcionário por nome ou CPF..." 
          leftSection={<IconSearch size={18} className="text-slate-400" />}
          radius="md"
          size="md"
          variant="filled"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          classNames={{ input: 'bg-white/50 focus:bg-white transition-colors' }}
        />
      </Paper>

      {/* TABELA DE DADOS */}
      <Paper p="md" radius="xl" className="backdrop-blur-xl bg-white/60 border border-white/60 shadow-sm overflow-hidden relative min-h-[400px]">
        <LoadingOverlay visible={loading} overlayProps={{ blur: 2, radius: "xl" }} />
        
        {filteredPatients.length > 0 ? (
          <Table verticalSpacing="md" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Funcionário</Table.Th>
                <Table.Th>Identificação</Table.Th>
                <Table.Th>Vínculo</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th style={{ width: 50 }}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredPatients.map((patient) => (
                <Table.Tr key={patient.id} className="group transition-colors hover:bg-white/40">
                  
                  {/* Célula do Nome (Clicável para ir ao Perfil) */}
                  <Table.Td>
                    <Group 
                      gap="sm" 
                      className="cursor-pointer"
                      onClick={() => navigate(`/app/${companyId}/pacientes/${patient.id}`)}
                    >
                      <Avatar 
                        color="blue" 
                        radius="xl" 
                        size="md" 
                        className="shadow-sm border border-white"
                      >
                        {patient.full_name.charAt(0)}
                      </Avatar>
                      <div>
                        <Text size="sm" fw={600} className="text-slate-700 group-hover:text-blue-600 transition-colors">
                          {patient.full_name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {dayjs().diff(patient.birth_date, 'year')} anos • {patient.gender === 'M' ? 'Masc' : 'Fem'}
                        </Text>
                      </div>
                    </Group>
                  </Table.Td>

                  {/* CPF e Matrícula */}
                  <Table.Td>
                    <div className="flex flex-col">
                      <Text size="sm" fw={500} className="text-slate-600 font-mono">{formatCPF(patient.cpf)}</Text>
                      <Text size="xs" c="dimmed">Mat: {patient.matricula || 'N/A'}</Text>
                    </div>
                  </Table.Td>

                  {/* Setor e Cargo */}
                  <Table.Td>
                    <div className="flex flex-col gap-1 items-start">
                      <Badge variant="light" color="blue" size="sm" radius="sm">
                        {patient.sectors?.name || 'Setor Pendente'}
                      </Badge>
                      <Text size="xs" c="dimmed" className="truncate max-w-[150px]" title={patient.job_roles?.name}>
                        {patient.job_roles?.name || 'Cargo Pendente'}
                      </Text>
                    </div>
                  </Table.Td>

                  {/* Status */}
                  <Table.Td>
                    <Badge 
                      color={patient.is_active ? 'teal' : 'red'} 
                      variant="dot" 
                      size="md"
                      className="bg-white/50"
                    >
                      {patient.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </Table.Td>

                  {/* Menu de Ações */}
                  <Table.Td>
                    <Menu shadow="md" width={200} position="bottom-end" radius="md">
                      <Menu.Target>
                        <ActionIcon variant="subtle" color="gray" radius="xl">
                          <IconDotsVertical size={18} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Label>Ações Rápidas</Menu.Label>
                        <Menu.Item 
                          leftSection={<IconEye size={16} />}
                          onClick={() => navigate(`/app/${companyId}/pacientes/${patient.id}`)}
                        >
                          Ver Prontuário
                        </Menu.Item>
                        <Menu.Item 
                          leftSection={<IconEdit size={16} />} 
                          onClick={() => onEdit(patient)}
                        >
                          Editar Cadastro
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item color="red" leftSection={<IconTrash size={16} />}>
                          Desativar Funcionário
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          !loading && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="bg-slate-100 p-4 rounded-full mb-4">
                <IconUser size={48} className="opacity-40" />
              </div>
              <Text size="lg" fw={500} c="dimmed">Nenhum funcionário encontrado</Text>
              <Text size="sm" c="dimmed">Verifique o filtro ou cadastre um novo colaborador.</Text>
            </div>
          )
        )}
      </Paper>
    </div>
  );
}