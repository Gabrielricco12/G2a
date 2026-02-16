import {
  ActionIcon,
  AppShell,
  Burger,
  Group,
  rem,
  ScrollArea,
  Text,
  Tooltip,
  UnstyledButton
} from '@mantine/core';
import {
  IconBuilding,
  IconDashboard,
  IconFileText,
  IconLogout,
  IconMenu2 // Novo ícone para reabrir
  ,
  IconSettings,
  IconUsers
} from '@tabler/icons-react';
import { useState } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Configuração dos links
const navData = [
  { link: 'dashboard', label: 'Dashboard', icon: IconDashboard },
  { link: 'pacientes', label: 'Pacientes', icon: IconUsers },
  { link: 'exames', label: 'Exames', icon: IconFileText },
  { link: 'configuracoes', label: 'Configurações', icon: IconSettings },
];

export function AppLayout() {
  // Controle Mobile
  const [mobileOpened, setMobileOpened] = useState(false);
  // Controle Desktop (Começa aberto, mas pode fechar TOTALMENTE)
  const [desktopOpened, setDesktopOpened] = useState(true);

  const { companyId } = useParams();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Verifica qual aba está ativa para pintar de azul
  const getActiveState = (link: string) => location.pathname.includes(link);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const toggleDesktop = () => setDesktopOpened((o) => !o);
  const toggleMobile = () => setMobileOpened((o) => !o);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 260, // Largura fixa quando aberto
        breakpoint: 'sm',
        // AQUI ESTÁ A MÁGICA: Fecha totalmente no desktop se !desktopOpened
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      padding="md"
      className="bg-[#f0f4f8] transition-all duration-300"
    >
      {/* HEADER FIXO */}
      <AppShell.Header className="backdrop-blur-md bg-white/70 border-white/50 border-b flex items-center px-4 shadow-sm z-50">
        <Group justify="space-between" className="w-full">
          
          <Group>
            {/* Botão Mobile */}
            <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
            
            {/* Botão Desktop: Alterna entre Aberto e FECHADO TOTALMENTE */}
            <ActionIcon 
              variant="subtle" 
              color="gray" 
              size="lg" 
              visibleFrom="sm" 
              onClick={toggleDesktop}
              title={desktopOpened ? "Fechar Menu" : "Abrir Menu"}
            >
              <IconMenu2 />
            </ActionIcon>

            {/* Logo / Nome do Sistema */}
            <div className="flex items-center gap-3 select-none cursor-pointer" onClick={() => navigate('/portal')}>
               <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-lg flex items-center justify-center text-white font-bold shadow-blue-500/30 shadow-lg">
                 G
               </div>
               <Text fw={800} size="xl" className="tracking-tight text-slate-800 hidden sm:block">
                 Gerenciador Inteligente de Informações Audiológicas <span className="text-blue-600 font-light"></span>
               </Text>
            </div>
          </Group>

          {/* Ações do Usuário */}
          <Group>
            <Tooltip label="Voltar para Seleção de Empresas">
              <ActionIcon variant="light" color="blue" radius="xl" size="lg" onClick={() => navigate('/portal')}>
                 <IconBuilding size={20} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </AppShell.Header>

      {/* SIDEBAR (NAVBAR) */}
      <AppShell.Navbar p="md" className="backdrop-blur-xl bg-white/60 border-r border-white/50">
        <AppShell.Section grow component={ScrollArea}>
          <div className="space-y-2 mt-2">
            {navData.map((item) => (
              <UnstyledButton
                key={item.label}
                onClick={() => {
                  navigate(item.link); // Navegação relativa (dashboard, pacientes...)
                  if (window.innerWidth < 768) setMobileOpened(false); // Fecha mobile ao clicar
                }}
                className={`
                  w-full flex items-center h-12 rounded-xl px-4 transition-all duration-200 group
                  ${getActiveState(item.link)
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 font-semibold' 
                    : 'text-slate-600 hover:bg-white/80 hover:text-blue-600 hover:pl-6'}
                `}
              >
                <item.icon style={{ width: rem(22), height: rem(22) }} stroke={1.5} />
                <Text ml="md" size="sm">{item.label}</Text>
              </UnstyledButton>
            ))}
          </div>
        </AppShell.Section>

        {/* Rodapé da Sidebar */}
        <AppShell.Section className="border-t border-slate-200/50 pt-4 mt-4">
          <UnstyledButton 
            className="w-full flex items-center h-12 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl px-4 transition-all"
            onClick={handleLogout}
          >
            <IconLogout size={22} stroke={1.5} />
            <Text ml="md" size="sm" fw={500}>Sair do Sistema</Text>
          </UnstyledButton>
        </AppShell.Section>
      </AppShell.Navbar>

      {/* CONTEÚDO PRINCIPAL (Main) */}
      <AppShell.Main className="relative">
        {/* Container que centraliza o conteúdo e dá limite de largura em telas gigantes */}
        <div className="w-full max-w-[1920px] mx-auto min-h-[calc(100vh-80px)] p-2 sm:p-4 fade-in">
          <Outlet /> {/* Aqui renderizam as páginas internas */}
        </div>
      </AppShell.Main>

    </AppShell>
  );
}