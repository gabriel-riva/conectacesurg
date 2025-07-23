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
          // Buscar categorias do usuário
          const userCategoriesData = await apiRequest('GET', `/api/user-category-assignments/user/${user.id}`);
          
          userDetails.push({
            ...user,
            categories: userCategoriesData
          });
        } catch (error) {
          console.error(`Erro ao buscar detalhes do usuário ${user.id}:`, error);
          // Adicionar usuário mesmo sem todos os detalhes
          userDetails.push({
            ...user,
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
      const bottomMargin = 30; // Espaço para o rodapé

      // Configurar fonte
      pdf.setFont('helvetica');

      // Função para verificar se precisa de nova página
      const checkPageBreak = (currentY: number, neededSpace: number = 20) => {
        if (currentY + neededSpace > pageHeight - bottomMargin) {
          pdf.addPage();
          return margin;
        }
        return currentY;
      };

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

        // Espaço reservado para foto do usuário
        pdf.setFontSize(14);
        pdf.setTextColor(51, 51, 51);
        pdf.text('FOTO DO USUÁRIO', margin, yPosition);
        yPosition += 10;

        // Desenhar retângulo para a área da foto
        const photoWidth = 40;
        const photoHeight = 50;
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(1);
        pdf.rect(margin, yPosition, photoWidth, photoHeight);
        
        if (user.photoUrl) {
          pdf.setFontSize(8);
          pdf.setTextColor(100, 100, 100);
          pdf.text('Foto disponível no sistema', margin, yPosition + photoHeight + 5);
        } else {
          pdf.setFontSize(8);
          pdf.setTextColor(100, 100, 100);
          pdf.text('Nenhuma foto cadastrada', margin, yPosition + photoHeight + 5);
        }
        yPosition += photoHeight + 15;

        // Informações básicas do usuário
        pdf.setFontSize(14);
        pdf.setTextColor(51, 51, 51);
        pdf.text('INFORMAÇÕES PESSOAIS', margin, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        
        const personalInfo = [
          `Nome Completo: ${user.name || 'Não informado'}`,
          `Email Principal: ${user.email || 'Não informado'}`,
          `Email Secundário: ${user.secondaryEmail || 'Não informado'}`,
          `Função/Cargo: ${user.role === 'admin' ? 'Administrador' : user.role === 'superadmin' ? 'Super Administrador' : 'Usuário'}`,
          `Status: ${user.isActive ? 'Ativo' : 'Inativo'}`,
          `Data de Ingresso: ${user.joinDate ? new Date(user.joinDate).toLocaleDateString('pt-BR') : 'Não informado'}`,
          `Data de Criação no Sistema: ${user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : 'N/A'}`,
          `Última Atualização: ${user.updatedAt ? new Date(user.updatedAt).toLocaleDateString('pt-BR') : 'N/A'}`
        ];

        personalInfo.forEach(info => {
          pdf.text(info, margin, yPosition);
          yPosition += 7;
        });

        yPosition += 10;

        // Verificar se precisa de nova página
        yPosition = checkPageBreak(yPosition, 80);

        // Informações de contato e endereço
        pdf.setFontSize(14);
        pdf.setTextColor(51, 51, 51);
        pdf.text('CONTATOS E ENDEREÇO', margin, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        
        const contactInfo = [
          `Telefones: ${user.phoneNumbers && user.phoneNumbers.length > 0 ? user.phoneNumbers.join(', ') : 'Não informado'}`,
          `Endereço: ${user.address || 'Não informado'}`,
          `Cidade: ${user.city || 'Não informado'}`,
          `Estado: ${user.state || 'Não informado'}`,
          `CEP: ${user.zipCode || 'Não informado'}`
        ];

        contactInfo.forEach(info => {
          pdf.text(info, margin, yPosition);
          yPosition += 7;
        });

        yPosition += 10;

        // Verificar se precisa de nova página
        yPosition = checkPageBreak(yPosition, 60);

        // Contato de emergência
        pdf.setFontSize(14);
        pdf.setTextColor(51, 51, 51);
        pdf.text('CONTATO DE EMERGÊNCIA', margin, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);

        if (user.emergencyContact) {
          const emergencyInfo = [
            `Nome: ${user.emergencyContact.name || 'Não informado'}`,
            `Telefone: ${user.emergencyContact.phone || 'Não informado'}`,
            `Parentesco: ${user.emergencyContact.relationship || 'Não informado'}`
          ];
          
          emergencyInfo.forEach(info => {
            pdf.text(info, margin, yPosition);
            yPosition += 7;
          });
        } else {
          pdf.text('Não informado', margin, yPosition);
          yPosition += 7;
        }

        yPosition += 10;

        // Verificar se precisa de nova página
        yPosition = checkPageBreak(yPosition, 50);

        // Biografia
        pdf.setFontSize(14);
        pdf.setTextColor(51, 51, 51);
        pdf.text('BIOGRAFIA', margin, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);

        if (user.biografia) {
          const bioLines = pdf.splitTextToSize(user.biografia, maxWidth);
          pdf.text(bioLines, margin, yPosition);
          yPosition += bioLines.length * 5 + 5;
        } else {
          pdf.text('Não informado', margin, yPosition);
          yPosition += 7;
        }

        yPosition += 10;

        // Verificar se precisa de nova página
        yPosition = checkPageBreak(yPosition, 40);

        // Categorias do usuário
        pdf.setFontSize(14);
        pdf.setTextColor(51, 51, 51);
        pdf.text('CATEGORIAS DE USUÁRIO', margin, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);

        if (user.categories && user.categories.length > 0) {
          user.categories.forEach((categoryAssignment: any) => {
            const categoryName = categoryAssignment.category?.name || categoryAssignment.name || 'Categoria sem nome';
            pdf.text(`• ${categoryName}`, margin + 5, yPosition);
            yPosition += 7;
          });
        } else {
          pdf.text('Nenhuma categoria atribuída', margin + 5, yPosition);
          yPosition += 7;
        }

        yPosition += 10;

        // Verificar se precisa de nova página
        yPosition = checkPageBreak(yPosition, 60);

        // Documentos
        pdf.setFontSize(14);
        pdf.setTextColor(51, 51, 51);
        pdf.text('DOCUMENTOS', margin, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);

        if (user.documents && user.documents.length > 0) {
          user.documents.forEach((document: any) => {
            pdf.text(`• ${document.name || 'Documento sem nome'}`, margin + 5, yPosition);
            yPosition += 5;
            if (document.description) {
              pdf.text(`  Descrição: ${document.description}`, margin + 10, yPosition);
              yPosition += 5;
            }
            pdf.text(`  Tipo: ${document.type || 'Não especificado'}`, margin + 10, yPosition);
            yPosition += 7;
          });
        } else {
          pdf.text('Nenhum documento cadastrado', margin + 5, yPosition);
          yPosition += 7;
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