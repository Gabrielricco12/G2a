import React, { useState } from 'react';
import { 
  AppShell, 
  Burger, 
  Group, 
  UnstyledButton, 
  Tooltip, 
  ActionIcon,
  Text,
  ScrollArea,
  rem
} from '@mantine/core';
import { 
  IconDashboard, 
  IconUsers, 
  IconFileText, 
  IconSettings, 
  IconChevronLeft, 
  IconChevronRight,
  IconLogout,
  IconBuilding
} from '@tabler/icons-react';
import { Outlet, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Itens de Navegação
const navData = [
  { link: 'dashboard', label: 'Dashboard', icon: IconDashboard },
  { link: 'pacientes', label: 'Pacientes', icon: IconUsers },
  { link: 'exames', label: 'Exames', icon: IconFileText },
  { link: 'configuracoes', label: 'Configurações', icon: IconSettings },
];

export function AppLayout() {
  const [opened, setOpened] = useState(false); // Mobile
  const [collapsed, setCollapsed] = useState(false); // Desktop Retraction
  const { companyId } = useParams();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const activeLink = location.pathname.split('/').pop();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: collapsed ? 80 : 260,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
      className="bg-[#f0f4f8]"
    >
      {/* HEADER */}
      <AppShell.Header className="backdrop-blur-md bg-white/70 border-white/50 border-b flex items-center px-md">
        <Group justify="space-between" className="w-full px-4">
          <Group>
            <Burger opened={opened} onClick={() => setOpened(!opened)} hiddenFrom="sm" size="sm" />
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">G</div>
               <Text fw={800} size="xl" className="tracking-tight text-slate-800 hidden sm:block">G2A</Text>
            </div>
          </Group>

          <Group>
            <ActionIcon variant="subtle" color="gray" radius="xl" onClick={() => navigate('/portal')}>
               <IconBuilding size={20} />
            </ActionIcon>
          </Group>
        </Group>
      </AppShell.Header>

      {/* SIDEBAR (NAVBAR) */}
      <AppShell.Navbar p="md" className="backdrop-blur-xl bg-white/40 border-r border-white/50 transition-all duration-300">
        <AppShell.Section grow component={ScrollArea}>
          <div className="space-y-2">
            {navData.map((item) => (
              <Tooltip 
                key={item.label} 
                label={item.label} 
                position="right" 
                disabled={!collapsed}
              >
                <UnstyledButton
                  onClick={() => navigate(`/app/${companyId}/${item.link}`)}
                  className={`
                    w-full flex items-center h-12 rounded-xl px-3 transition-all
                    ${activeLink === item.link 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                      : 'text-slate-600 hover:bg-white/60 hover:text-blue-600'}
                  `}
                >
                  <item.icon style={{ width: rem(24), height: rem(24) }} stroke={1.5} />
                  {!collapsed && (
                    <Text ml="md" fw={600} size="sm">{item.label}</Text>
                  )}
                </UnstyledButton>
              </Tooltip>
            ))}
          </div>
        </AppShell.Section>

        {/* BOTÃO RETRAIR (Apenas Desktop) */}
        <AppShell.Section className="border-t border-slate-200/50 pt-4">
          <UnstyledButton 
            hiddenFrom="xs"
            className="w-full flex items-center h-12 text-slate-500 hover:text-red-600 px-3 transition-colors"
            onClick={handleLogout}
          >
            <IconLogout size={24} stroke={1.5} />
            {!collapsed && <Text ml="md" fw={600} size="sm">Sair</Text>}
          </UnstyledButton>

          <ActionIcon 
            onClick={() => setCollapsed(!collapsed)} 
            variant="default" 
            size="xl" 
            radius="md"
            className="hidden sm:flex mx-auto border-none bg-white/40 hover:bg-white/80"
          >
            {collapsed ? <IconChevronRight size={18} /> : <IconChevronLeft size={18} />}
          </ActionIcon>
        </AppShell.Section>
      </AppShell.Navbar>

      {/* CONTEÚDO PRINCIPAL */}
      <AppShell.Main>
        <div className="max-w-[1600px] mx-auto">
          <Outlet /> {/* Aqui serão renderizadas as páginas internas */}
        </div>
      </AppShell.Main>
    </AppShell>
  );
}