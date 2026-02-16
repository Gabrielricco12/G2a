import { 
  Title, 
  Text, 
  Grid, 
  Paper, 
  Group, 
  ThemeIcon, 
  Stack, 
  Badge, 
  Table, 
  Avatar, 
  Progress,
  Divider,
  Button,
  ActionIcon
} from '@mantine/core';
import { 
  IconUsers, 
  IconActivity, 
  IconCalendarStats, 
  IconClipboardHeart,
  IconArrowUpRight,
  IconDotsVertical,
  IconPlayerPlay,
  IconFileDescription
} from '@tabler/icons-react';

export function Dashboard() {
  // 1. Dados dos Cards de Resumo
  const stats = [
    { title: 'Total de Vidas', value: '1.248', diff: 12, icon: IconUsers, color: 'blue' },
    { title: 'Exames (Mês)', value: '84', diff: 5, icon: IconActivity, color: 'teal' },
    { title: 'Agendados Hoje', value: '12', diff: -2, icon: IconCalendarStats, color: 'indigo' },
    { title: 'Pendentes Laudo', value: '07', diff: 0, icon: IconClipboardHeart, color: 'orange' },
  ];

  // 2. Dados de Atividade Recente (Exames feitos recentemente)
  const recentExams = [
    { id: 1, name: 'Gabriel Ricco', type: 'Admissional', status: 'Normal', time: '10:30' },
    { id: 2, name: 'Ana Oliveira', type: 'Periódico', status: 'Alterado', time: '09:15' },
    { id: 3, name: 'Marcos Souza', type: 'Demissional', status: 'Normal', time: '08:45' },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* SEÇÃO: BOAS-VINDAS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Stack gap={4}>
          <Title order={1} className="text-slate-800 tracking-tight">Painel Operacional</Title>
          <Text c="dimmed" size="lg">Resumo das atividades da G2A Health para hoje.</Text>
        </Stack>
        
        <Group>
          <Button variant="light" color="blue" radius="xl" leftSection={<IconCalendarStats size={18}/>}>
            Ver Agenda Completa
          </Button>
        </Group>
      </div>

      {/* SEÇÃO: CARDS DE ESTATÍSTICAS */}
      <Grid gutter="lg">
        {stats.map((stat) => (
          <Grid.Col key={stat.title} span={{ base: 12, sm: 6, lg: 3 }}>
            <Paper p="xl" radius="2rem" withBorder className="bg-white/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
              <Group justify="space-between">
                <ThemeIcon size="xl" radius="lg" variant="light" color={stat.color}>
                  <stat.icon size={24} />
                </ThemeIcon>
                <Badge color={stat.diff >= 0 ? 'teal' : 'red'} variant="light" radius="sm">
                  {stat.diff > 0 ? `+${stat.diff}%` : `${stat.diff}%`}
                </Badge>
              </Group>
              
              <div className="mt-4">
                <Text size="xs" c="dimmed" tt="uppercase" fw={800} tracking="wider">{stat.title}</Text>
                <Text size="2rem" fw={900} className="text-slate-800">{stat.value}</Text>
              </div>
            </Paper>
          </Grid.Col>
        ))}
      </Grid>

      {/* SEÇÃO: GRÁFICO E FILA DE HOJE */}
      <Grid gutter="xl">
        {/* Coluna 1: Status de Atendimento (Visual) */}
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Paper p="xl" radius="2rem" withBorder className="h-full bg-white/40">
            <Group justify="space-between" mb="xl">
              <Title order={4}>Meta de Atendimento do Dia</Title>
              <Text size="sm" c="dimmed" fw={500}>75% Concluído</Text>
            </Group>
            
            <Stack gap="xl">
              <div>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={600}>Exames Periódicos</Text>
                  <Text size="xs" c="dimmed">09/12 realizados</Text>
                </Group>
                <Progress value={75} size="xl" radius="xl" color="blue" animated />
              </div>

              <div>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={600}>Exames Admissionais</Text>
                  <Text size="xs" c="dimmed">04/05 realizados</Text>
                </Group>
                <Progress value={80} size="xl" radius="xl" color="teal" />
              </div>

              <Divider label="Resumo Semanal" labelPosition="center" my="lg" />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <Text size="xl" fw={800}>42</Text>
                  <Text size="xs" c="dimmed" tt="uppercase">Esta Semana</Text>
                </div>
                <div className="text-center border-l border-slate-100">
                  <Text size="xl" fw={800} c="teal">98%</Text>
                  <Text size="xs" c="dimmed" tt="uppercase">Eficiência</Text>
                </div>
                <div className="text-center border-l border-slate-100">
                  <Text size="xl" fw={800} c="orange">02</Text>
                  <Text size="xs" c="dimmed" tt="uppercase">Atrasados</Text>
                </div>
                <div className="text-center border-l border-slate-100">
                  <Text size="xl" fw={800} c="blue">15</Text>
                  <Text size="xs" c="dimmed" tt="uppercase">Novas Vidas</Text>
                </div>
              </div>
            </Stack>
          </Paper>
        </Grid.Col>

        {/* Coluna 2: Atividade Recente */}
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Paper p="xl" radius="2rem" withBorder className="h-full">
            <Title order={4} mb="lg">Últimos Atendimentos</Title>
            
            <Stack gap="md">
              {recentExams.map((exam) => (
                <Paper key={exam.id} p="md" radius="lg" withBorder className="hover:bg-slate-50 transition-colors">
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap="sm">
                      <Avatar color="blue" radius="md">{exam.name[0]}</Avatar>
                      <div>
                        <Text size="sm" fw={700}>{exam.name}</Text>
                        <Text size="xs" c="dimmed">{exam.type}</Text>
                      </div>
                    </Group>
                    <Badge color={exam.status === 'Normal' ? 'teal' : 'red'} variant="light">
                      {exam.status}
                    </Badge>
                  </Group>
                </Paper>
              ))}

              <Button variant="subtle" fullWidth color="gray" rightSection={<IconArrowUpRight size={14}/>}>
                Ver histórico completo
              </Button>
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* SEÇÃO: TABELA DE FILA (PREVIEW) */}
      <Paper p="xl" radius="2rem" withBorder>
        <Group justify="space-between" mb="xl">
          <div>
            <Title order={4}>Próximos da Fila</Title>
            <Text size="xs" c="dimmed">Pacientes aguardando na recepção</Text>
          </div>
          <ActionIcon variant="subtle" color="gray"><IconDotsVertical size={18}/></ActionIcon>
        </Group>

        <Table verticalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Paciente</Table.Th>
              <Table.Th>Horário</Table.Th>
              <Table.Th>Procedimento</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td>
                <Group gap="sm">
                  <Avatar radius="xl" size="sm" color="indigo" src={null} />
                  <Text size="sm" fw={600}>Ricardo Mendes</Text>
                </Group>
              </Table.Td>
              <Table.Td><Text size="sm">14:00</Text></Table.Td>
              <Table.Td><Badge variant="outline">Audiometria Ocupacional</Badge></Table.Td>
              <Table.Td><Badge color="blue">Aguardando</Badge></Table.Td>
              <Table.Td>
                <Button size="compact-xs" variant="light" color="blue" leftSection={<IconPlayerPlay size={12}/>}>
                  Atender
                </Button>
              </Table.Td>
            </Table.Tr>
            {/* Linha 2 */}
            <Table.Tr>
              <Table.Td>
                <Group gap="sm">
                  <Avatar radius="xl" size="sm" color="blue" src={null} />
                  <Text size="sm" fw={600}>Juliana Costa</Text>
                </Group>
              </Table.Td>
              <Table.Td><Text size="sm">14:30</Text></Table.Td>
              <Table.Td><Badge variant="outline">Audiometria Ocupacional</Badge></Table.Td>
              <Table.Td><Badge color="gray">Agendado</Badge></Table.Td>
              <Table.Td>
                <ActionIcon variant="subtle" color="gray"><IconFileDescription size={16}/></ActionIcon>
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Paper>
    </div>
  );
}
