
import { MantineProvider } from '@mantine/core';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

// Contextos e Proteção
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Estilos Globais
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';

// Páginas de Autenticação
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';

// Páginas do Sistema Principal
import { CompanySelection } from './pages/portal/CompanySelection';
import { AppLayout } from './components/Layout/AppLayout';
import { Dashboard } from './pages/app/Dashboard';

// Módulo de Pacientes
import { PatientsPage } from './pages/app/patients'; // Carrega o index.tsx
import { PatientProfile } from './pages/app/patients/PatientProfile'; // Nova página de Detalhes
import { ExamHub } from './pages/app/exams/Examhub';
import { NewExam } from './pages/app/exams/NewExam';
// Configuração do React Query
const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider defaultColorScheme="light">
        <AuthProvider>
          {/* Sistema de Notificações (Toasts) */}
          <Toaster richColors position="top-right" closeButton />
          
          <BrowserRouter>
            <Routes>
              {/* --- ROTAS PÚBLICAS --- */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              
              {/* Redirecionamento da Raiz */}
              <Route path="/" element={<Navigate to="/login" replace />} />

              {/* --- ROTAS PROTEGIDAS (ÁREA LOGADA) --- */}
              <Route element={<ProtectedRoute />}>
                
                {/* 1. Portal de Seleção de Empresas (Lobby) */}
                <Route path="/portal" element={<CompanySelection />} />

                {/* 2. Aplicação Principal (Com Sidebar) */}
                <Route path="/app/:companyId" element={<AppLayout />}>
                  
                  {/* Dashboard é a home da empresa */}
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />

                  {/* Gestão de Pacientes */}
                  <Route path="pacientes" element={<PatientsPage />} />
                  <Route path="pacientes/:patientId" element={<PatientProfile />} />

                  {/* Placeholders para módulos futuros */}
                 <Route path="exames" element={<ExamHub />} /> 
                 <Route path="exames/:examId/realizar" element={<NewExam />} /> 
                  <Route path="configuracoes" element={<div className="p-8 text-slate-500">Módulo de Configurações (Em breve)</div>} />
                
                </Route>

              </Route>

              {/* Rota 404 (Catch-all) */}
              <Route path="*" element={<Navigate to="/login" replace />} />

            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
}
