import { Button, Modal, Text, Title } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';

// Importando os componentes isolados
import { PatientForm } from './PatientForm';
import { PatientList } from './PatientList';

export function PatientsPage() {
  const { companyId } = useParams();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Função para buscar dados (READ)
  const fetchPatients = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`*, sectors(name), job_roles(name)`)
        .eq('company_id', companyId)
        .order('full_name');

      if (error) throw error;
      setPatients(data || []);
    } catch (err) {
      toast.error('Erro ao carregar lista de pacientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [companyId]);

  return (
    <div className="w-full space-y-6 animate-fade-in">
      
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
        <div>
          <Title order={2} className="text-slate-800">Gestão de Vidas</Title>
          <Text c="dimmed">Cadastro de funcionários para exames ocupacionais</Text>
        </div>
        <Button 
          leftSection={<IconPlus size={20} />} 
          size="md" 
          radius="xl" 
          className="bg-blue-600 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
          onClick={() => setModalOpen(true)}
        >
          Novo Funcionário
        </Button>
      </div>

      {/* LISTAGEM */}
      <PatientList 
        data={patients} 
        loading={loading} 
        onEdit={(p) => console.log('Editar:', p)} 
      />

      {/* MODAL COM O FORMULÁRIO */}
      <Modal 
        opened={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={<Text fw={700} size="lg">Novo Funcionário</Text>}
        centered
        radius="lg"
        size="lg"
        overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
      >
        <PatientForm 
          companyId={companyId!} 
          onSuccess={() => {
            setModalOpen(false);
            fetchPatients(); // Recarrega a lista após salvar
          }}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

    </div>
  );
}
