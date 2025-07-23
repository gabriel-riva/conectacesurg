import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { User, UserCategory } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';

interface GenerateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GenerateReportModal({ isOpen, onClose }: GenerateReportModalProps) {
  const [reportType, setReportType] = useState<'all' | 'categories'>('all');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Buscar categorias disponíveis
  const { data: userCategories = [] } = useQuery<UserCategory[]>({
    queryKey: ['/api/user-categories'],
    enabled: isOpen
  });

  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      let users: User[] = [];
      let userDetails: any[] = [];

      // Buscar usuários baseado no tipo de relatório
      if (reportType === 'all') {
        users = await apiRequest("GET", "/api/users") as User[];
      } else {
        // Para relatório por categorias, buscar usuários de cada categoria selecionada
        const allCategoryUsers = new Set<User>();
        for (const categoryId of selectedCategories) {
          const categoryUsers = await apiRequest("GET", `/api/users/filter?categoryId=${categoryId}`) as User[];
          categoryUsers.forEach((user: User) => allCategoryUsers.add(user));
        }
        users = Array.from(allCategoryUsers);
      }

      if (users.length === 0) {
        toast({
          title: "Nenhum usuário encontrado",
          description: "Não há usuários para gerar o relatório.",
          variant: "destructive",
        });
        setIsGenerating(false);
        return;
      }

      // Buscar detalhes completos de cada usuário
      for (const user of users) {
        try {
          // Buscar grupos do usuário
          const userGroups = await apiRequest('GET', `/api/users/${user.id}/groups`);
          
          // Buscar categorias do usuário
          const userCategoriesData = await apiRequest('GET', `/api/user-category-assignments/user/${user.id}`);
          
          userDetails.push({
            ...user,
            groups: userGroups,
            categories: userCategoriesData
          });
        } catch (error) {
          console.error(`Erro ao buscar detalhes do usuário ${user.id}:`, error);
          // Adicionar usuário mesmo sem todos os detalhes
          userDetails.push({
            ...user,
            groups: [],
            categories: []
          });
        }
      }

      // Criar o PDF
      const pdf = new jsPDF();
      const pageHeight = pdf.internal.pageSize.height;
      const pageWidth = pdf.internal.pageSize.width;
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;

      // Configurar fonte
      pdf.setFont('helvetica');

      for (let i = 0; i < userDetails.length; i++) {
        const user = userDetails[i];
        let yPosition = margin;

        // Adicionar nova página se não for o primeiro usuário
        if (i > 0) {
          pdf.addPage();
          yPosition = margin;
        }

        // Cabeçalho do relatório
        pdf.setFontSize(16);
        pdf.setTextColor(0, 0, 0);
        pdf.text('RELATÓRIO DE USUÁRIO - CESURG', margin, yPosition);
        yPosition += 20;

        // Linha separadora
        pdf.setLineWidth(0.5);
        pdf.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 15;

        // Informações básicas do usuário
        pdf.setFontSize(14);
        pdf.setTextColor(51, 51, 51);
        pdf.text('INFORMAÇÕES PESSOAIS', margin, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        
        const personalInfo = [
          `Nome: ${user.name || 'N/A'}`,
          `Email: ${user.email || 'N/A'}`,
          `Função: ${user.role === 'admin' ? 'Administrador' : user.role === 'superadmin' ? 'Super Administrador' : 'Usuário'}`,
          `Status: ${user.isActive ? 'Ativo' : 'Inativo'}`,
          `Data de Criação: ${user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : 'N/A'}`,
          `Última Atualização: ${user.updatedAt ? new Date(user.updatedAt).toLocaleDateString('pt-BR') : 'N/A'}`
        ];

        personalInfo.forEach(info => {
          pdf.text(info, margin, yPosition);
          yPosition += 7;
        });

        yPosition += 10;

        // Categorias do usuário
        pdf.setFontSize(14);
        pdf.setTextColor(51, 51, 51);
        pdf.text('CATEGORIAS', margin, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);

        if (user.categories && user.categories.length > 0) {
          user.categories.forEach((categoryAssignment: any) => {
            pdf.text(`• ${categoryAssignment.category?.name || 'Categoria sem nome'}`, margin + 5, yPosition);
            yPosition += 7;
          });
        } else {
          pdf.text('Nenhuma categoria atribuída', margin + 5, yPosition);
          yPosition += 7;
        }

        yPosition += 10;

        // Grupos do usuário
        pdf.setFontSize(14);
        pdf.setTextColor(51, 51, 51);
        pdf.text('GRUPOS DA COMUNIDADE', margin, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);

        if (user.groups && user.groups.length > 0) {
          user.groups.forEach((group: any) => {
            pdf.text(`• ${group.name || 'Grupo sem nome'}`, margin + 5, yPosition);
            if (group.description) {
              yPosition += 5;
              const description = pdf.splitTextToSize(group.description, maxWidth - 10);
              pdf.text(description, margin + 10, yPosition);
              yPosition += description.length * 5;
            }
            yPosition += 7;
          });
        } else {
          pdf.text('Não participa de nenhum grupo', margin + 5, yPosition);
          yPosition += 7;
        }

        // Informações adicionais do perfil se existirem
        if (user.bio || user.interests || user.skills) {
          yPosition += 10;
          
          pdf.setFontSize(14);
          pdf.setTextColor(51, 51, 51);
          pdf.text('INFORMAÇÕES DO PERFIL', margin, yPosition);
          yPosition += 10;

          pdf.setFontSize(10);
          pdf.setTextColor(0, 0, 0);

          if (user.bio) {
            pdf.text('Biografia:', margin, yPosition);
            yPosition += 5;
            const bioLines = pdf.splitTextToSize(user.bio, maxWidth - 10);
            pdf.text(bioLines, margin + 5, yPosition);
            yPosition += bioLines.length * 5 + 5;
          }

          if (user.interests) {
            pdf.text(`Interesses: ${user.interests}`, margin, yPosition);
            yPosition += 7;
          }

          if (user.skills) {
            pdf.text(`Habilidades: ${user.skills}`, margin, yPosition);
            yPosition += 7;
          }
        }

        // Rodapé da página
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(`Página ${i + 1} de ${userDetails.length} - Gerado em ${new Date().toLocaleString('pt-BR')}`, 
                 margin, pageHeight - 10);
      }

      // Salvar o PDF
      const filename = reportType === 'all' 
        ? `relatorio_usuarios_completo_${new Date().toISOString().split('T')[0]}.pdf`
        : `relatorio_usuarios_categorias_${new Date().toISOString().split('T')[0]}.pdf`;
      
      pdf.save(filename);

      toast({
        title: "Relatório gerado com sucesso",
        description: `O relatório de ${userDetails.length} usuário(s) foi baixado.`,
      });

      onClose();
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: "Erro ao gerar relatório",
        description: "Ocorreu um erro ao gerar o relatório. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      setReportType('all');
      setSelectedCategories([]);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gerar Relatório de Usuários</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="all-users"
                name="report-type"
                checked={reportType === 'all'}
                onChange={() => setReportType('all')}
                className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                disabled={isGenerating}
              />
              <label htmlFor="all-users" className="text-sm font-medium text-gray-700">
                Todos os usuários
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="category-users"
                name="report-type"
                checked={reportType === 'categories'}
                onChange={() => setReportType('categories')}
                className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                disabled={isGenerating}
              />
              <label htmlFor="category-users" className="text-sm font-medium text-gray-700">
                Usuários por categorias
              </label>
            </div>
          </div>

          {reportType === 'categories' && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Selecione as categorias:</h4>
              <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-3">
                {userCategories
                  .filter(category => category.isActive)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category.id}`}
                        checked={selectedCategories.includes(category.id)}
                        onCheckedChange={() => handleCategoryToggle(category.id)}
                        disabled={isGenerating}
                      />
                      <label
                        htmlFor={`category-${category.id}`}
                        className="text-sm text-gray-700 cursor-pointer"
                      >
                        {category.name}
                      </label>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isGenerating}
          >
            Cancelar
          </Button>
          <Button
            onClick={generatePDF}
            disabled={isGenerating || (reportType === 'categories' && selectedCategories.length === 0)}
            className="btn-primary"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Gerando...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Gerar Relatório
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}