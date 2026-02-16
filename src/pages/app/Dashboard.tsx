import React from 'react';
import { 
  SimpleGrid, 
  Paper, 
  Text, 
  Group, 
  RingProgress, 
  ThemeIcon, 
  Table, 
  Badge, 
  Button, 
  Avatar,
  Title
} from '@mantine/core';
import { 
  IconAlertTriangle, 
  IconCalendarTime, 
  IconActivity, 
  IconUsers, 
  IconArrowRight, 
  IconEar
} from '@tabler/icons-react';
import { DonutChart, BarChart } from '@mantine/charts';
import { useNavigate } from 'react-router-dom';

// --- DADOS MOCKADOS (SIMULAÇÃO) ---
const stats = [
  { label: 'Exames Vencidos', value: '12', color: 'red', icon: IconAlertTriangle, diff: '+2 essa semana' },
  { label: 'Vencem em 30 dias', value: '34', color: 'yellow', icon: IconCalendarTime, diff: 'Atenção necessária' },
  { label: 'Casos PAINPSE', value: '8', color: 'blue', icon: IconEar, diff: '1 novo caso' },
  { label: 'Vidas Ativas', value: '156', color: 'teal', icon: IconUsers, diff: 'Total na empresa' },
];

const diagnosticData = [
  { name: 'Normal', value: 120, color: 'teal.6' },
  { name: 'PAINPSE', value: 8, color: 'blue.6' },
  { name: 'Não Ocupacional', value: 15, color: 'gray.5' },
  { name: 'Condutiva', value: 13, color: 'orange.6' },
];

const sectorData = [
  { sector: 'Produção', Alterados: 25, Normais: 40 },
  { sector: 'Caldeiraria', Alterados: 10, Normais: 5 },
  { sector: 'Adm.', Alterados: 2, Normais: 50 },
  { sector: 'Logística', Alterados: 5, Normais: 20 },
];

const expiringEmployees = [
  { id: 1, name: 'João Silva', sector: 'Caldeiraria', date: '15/05/2026', status: 'Vencido' },
  { id: 2, name: 'Maria Souza', sector: 'Produção', date: '20/05/2026', status: 'Vencido' },
  { id: 3, name: 'Carlos Alberto', sector: 'Logística', date: '01/06/2026', status: 'A Vencer' },
  { id: 4, name: 'Ana Pereira', sector: 'Adm.', date: '05/06/2026', status: 'A Vencer' },
];

export function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="w-full space-y-8 animate-fade-in">
      
      {/* 1. CABEÇALHO DA PÁGINA */}
      <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
        <div>
          <Title order={2} className="text-slate-800">Visão Geral</Title>
          <Text c="dimmed">Acompanhamento em tempo real do PCMSO</Text>
        </div>
        <div className="flex gap-2">
           <Text size="sm" c="dimmed" className="self-center">Última atualização: Hoje, 14:30</Text>
        </div>
      </div>

      {/* 2. CARDS DE KPI (TOP LAYER) */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
        {stats.map((stat) => (
          <Paper 
            key={stat.label} 
            p="md" 
            radius="xl" 
            className="backdrop-blur-xl bg-white/60 border border-white/60 shadow-sm hover:shadow-md transition-shadow"
          >
            <Group justify="space-between">
              <div>
                <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                  {stat.label}
                </Text>
                <Text fw={700} size="xl" className="text-slate-800 text-3xl mt-1">
                  {stat.value}
                </Text>
              </div>
              <ThemeIcon 
                color={stat.color} 
                variant="light" 
                size={48} 
                radius="md"
                className="opacity-80"
              >
                <stat.icon style={{ width: '60%', height: '60%' }} stroke={1.5} />
              </ThemeIcon>
            </Group>
            <Text c="dimmed" size="xs" mt="sm">
              <span className={`font-medium ${stat.color === 'red' ? 'text-red-600' : 'text-slate-500'}`}>
                {stat.diff}
              </span>
            </Text>
          </Paper>
        ))}
      </SimpleGrid>

      {/* 3. GRÁFICOS (MIDDLE LAYER) */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        
        {/* Gráfico de Diagnósticos (Donut) */}
        <Paper p="xl" radius="xl" className="backdrop-blur-xl bg-white/60 border border-white/60 shadow-sm flex flex-col items-center justify-center">
          <Title order={4} className="self-start mb-6 text-slate-700">Distribuição Diagnóstica</Title>
          <div className="flex items-center gap-8">
            <DonutChart 
              data={diagnosticData} 
              size={180} 
              thickness={20} 
              withLabelsLine 
              paddingAngle={5}
              tooltipDataSource="segment"
            />
            <div className="flex flex-col gap-2">
               {diagnosticData.map((item) => (
                 <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `var(--mantine-color-${item.color.split('.')[0]}-${item.color.split('.')[1] || 6})` }}></div>
                    <Text size="sm" c="dimmed">{item.name}</Text>
                 </div>
               ))}
            </div>
          </div>
        </Paper>

        {/* Gráfico de Setores (Barras) */}
        <Paper p="xl" radius="xl" className="backdrop-blur-xl bg-white/60 border border-white/60 shadow-sm">
          <Title order={4} className="mb-6 text-slate-700">Alterações Auditivas por Setor</Title>
          <BarChart
            h={250}
            data={sectorData}
            dataKey="sector"
            series={[
              { name: 'Normais', color: 'teal.6' },
              { name: 'Alterados', color: 'red.5' },
            ]}
            tickLine="y"
          />
        </Paper>
      </SimpleGrid>

      {/* 4. TABELA DE AÇÃO RÁPIDA (BOTTOM LAYER) */}
      <Paper p="xl" radius="xl" className="backdrop-blur-xl bg-white/60 border border-white/60 shadow-sm overflow-hidden">
        <Group justify="space-between" mb="lg">
          <Title order={4} className="text-slate-700">Radar de Vencimentos (Urgente)</Title>
          <Button variant="subtle" size="xs" rightSection={<IconArrowRight size={14} />}>
            Ver Todos
          </Button>
        </Group>

        <Table verticalSpacing="sm" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Funcionário</Table.Th>
              <Table.Th>Setor</Table.Th>
              <Table.Th>Vencimento</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Ação</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {expiringEmployees.map((element) => (
              <Table.Tr key={element.id}>
                <Table.Td>
                  <Group gap="sm">
                    <Avatar size={30} radius="xl" color="blue">{element.name.charAt(0)}</Avatar>
                    <Text size="sm" fw={500}>{element.name}</Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">{element.sector}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{element.date}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge 
                    color={element.status === 'Vencido' ? 'red' : 'yellow'} 
                    variant="light"
                  >
                    {element.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Button size="xs" variant="light" color="blue" radius="xl">
                    Agendar
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    </div>
  );
}