import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { User, UserCategory } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

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

  const generateExcel = async () => {
    setIsGenerating(true);
    
    try {
      let users: User[] = [];
      
      if (reportType === 'all') {
        users = await apiRequest('/api/users');
      } else {
        if (selectedCategories.length === 0) {
          toast({
            title: "Erro",
            description: "Selecione pelo menos uma categoria.",
            variant: "destructive",
          });
          setIsGenerating(false);
          return;
        }
        
        users = await apiRequest(`/api/users/by-categories?categories=${selectedCategories.join(',')}`);
      }

      // Buscar detalhes de cada usuário
      const userDetails = await Promise.all(
        users.map(async (user) => {
          const [categories, groups, documents] = await Promise.all([
            apiRequest(`/api/user-category-assignments/user/${user.id}`).catch(() => []),
            apiRequest(`/api/users/${user.id}/groups`).catch(() => []),
            apiRequest(`/api/users/${user.id}/documents`).catch(() => [])
          ]);
          
          return {
            ...user,
            categories,
            groups,
            documents
          };
        })
      );

      // Preparar dados para Excel
      const excelData = userDetails.map(user => ({
        'Nome': user.name || '',
        'Email': user.email || '',
        'Telefone': user.phoneNumbers && Array.isArray(user.phoneNumbers) ? user.phoneNumbers.join('; ') : '',
        'Endereço': user.address || '',
        'Cidade': user.city || '',
        'Estado': user.state || '',
        'CEP': user.zipCode || '',
        'Data de Nascimento': user.birthDate ? new Date(user.birthDate).toLocaleDateString('pt-BR') : '',
        'Data de Ingresso na CESURG': user.joinDate ? new Date(user.joinDate).toLocaleDateString('pt-BR') : '',
        'Cadastrado no Portal em': user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : '',
        'Categorias': Array.isArray(user.categories) ? user.categories.map((cat: any) => cat.name).join('; ') : '',
        'Grupos': Array.isArray(user.groups) ? user.groups.map((group: any) => group.name).join('; ') : '',
        'Nome do Pai': user.fatherName || '',
        'Nome da Mãe': user.motherName || '',
        'Contato de Emergência': user.emergencyContact?.name || '',
        'Telefone de Emergência': user.emergencyContact?.phone || '',
        'Parentesco': user.emergencyContact?.relationship || '',
        'Profissão': user.profession || '',
        'Local de Trabalho': user.workplace || '',
        'Estado Civil': user.maritalStatus || '',
        'Biografia': user.biografia || '',
        'Observações': user.observations || '',
        'Tem Foto': user.photoUrl ? 'Sim' : 'Não',
        'Documentos': Array.isArray(user.documents) && user.documents.length > 0 ? user.documents.map((doc: any) => {
          const name = doc.originalName || doc.name || 'Documento sem nome';
          const url = doc.filePath ? `${window.location.origin}${doc.filePath}` : '';
          return url ? `${name} (${url})` : name;
        }).join('; ') : 'Nenhum documento'
      }));

      // Criar workbook e worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Adicionar hyperlinks para os documentos
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      const documentColIndex = Object.keys(excelData[0] || {}).indexOf('Documentos');
      
      if (documentColIndex >= 0) {
        for (let row = 1; row <= range.e.r; row++) {
          const user = userDetails[row - 1];
          if (user && Array.isArray(user.documents) && user.documents.length > 0) {
            const cellAddress = XLSX.utils.encode_cell({ c: documentColIndex, r: row });
            
            // Criar links clicáveis para cada documento
            const docLinks = user.documents.map((doc: any) => {
              const name = doc.originalName || doc.name || 'Documento sem nome';
              const url = doc.filePath ? `${window.location.origin}${doc.filePath}` : '';
              return url ? `=HYPERLINK("${url}","${name}")` : name;
            }).join(' | ');
            
            if (user.documents.some((doc: any) => doc.filePath)) {
              ws[cellAddress] = { t: 'str', v: docLinks, f: docLinks };
            }
          }
        }
      }
      
      // Definir larguras das colunas
      const colWidths = [
        { wch: 20 }, // Nome
        { wch: 25 }, // Email
        { wch: 18 }, // Telefone  
        { wch: 30 }, // Endereço
        { wch: 15 }, // Cidade
        { wch: 12 }, // Estado
        { wch: 12 }, // CEP
        { wch: 15 }, // Data Nascimento
        { wch: 20 }, // Data Ingresso
        { wch: 20 }, // Cadastrado em
        { wch: 25 }, // Categorias
        { wch: 25 }, // Grupos
        { wch: 20 }, // Nome do Pai
        { wch: 20 }, // Nome da Mãe
        { wch: 20 }, // Contato Emergência
        { wch: 18 }, // Tel Emergência
        { wch: 15 }, // Parentesco
        { wch: 20 }, // Profissão
        { wch: 25 }, // Local Trabalho
        { wch: 15 }, // Estado Civil
        { wch: 30 }, // Biografia
        { wch: 30 }, // Observações
        { wch: 10 }, // Tem Foto
        { wch: 30 }  // Documentos
      ];
      
      ws['!cols'] = colWidths;
      
      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(wb, ws, "Usuários");
      
      // Gerar arquivo Excel
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Nome do arquivo
      const filename = reportType === 'all' 
        ? `relatorio_usuarios_${new Date().toISOString().split('T')[0]}.xlsx`
        : `relatorio_usuarios_categorias_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Salvar arquivo
      saveAs(data, filename);
      
      toast({
        title: "Sucesso",
        description: `Relatório Excel gerado com ${userDetails.length} usuários.`,
      });
      
      onClose();
      
    } catch (error) {
      console.error('Erro ao gerar relatório Excel:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar relatório Excel. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
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

      // Função auxiliar para carregar imagem
      const loadUserImage = async (photoUrl: string): Promise<string | null> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              canvas.width = 120; // 40 * 3 para melhor qualidade
              canvas.height = 150; // 50 * 3 para melhor qualidade
              
              ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
              const imgData = canvas.toDataURL('image/jpeg', 0.8);
              resolve(imgData);
            } catch (error) {
              console.error('Erro ao processar imagem:', error);
              resolve(null);
            }
          };
          
          img.onerror = () => {
            console.error('Erro ao carregar imagem:', photoUrl);
            resolve(null);
          };
          
          img.src = photoUrl;
        });
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
        pdf.setFontSize(14);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Relatório Dados de Usuário Conecta -', margin, yPosition);
        
        // Nome do usuário em destaque
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        const userName = user.name || 'Nome não informado';
        pdf.text(userName.toUpperCase(), margin, yPosition + 15);
        
        // Restaurar fonte normal
        pdf.setFont('helvetica', 'normal');
        yPosition += 35;

        // Linha separadora
        pdf.setLineWidth(0.5);
        pdf.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 15;

        // Espaço reservado para foto do usuário
        pdf.setFontSize(14);
        pdf.setTextColor(51, 51, 51);
        pdf.text('FOTO DO USUÁRIO', margin, yPosition);
        yPosition += 10;

        // Área da foto
        const photoWidth = 40;
        const photoHeight = 50;
        const photoX = margin;
        const photoY = yPosition;
        
        if (user.photoUrl) {
          try {
            // Carregar imagem do usuário
            const imageData = await loadUserImage(user.photoUrl);
            
            if (imageData) {
              // Adicionar imagem ao PDF
              pdf.addImage(imageData, 'JPEG', photoX, photoY, photoWidth, photoHeight);
              
              pdf.setFontSize(8);
              pdf.setTextColor(100, 100, 100);
              pdf.text('Foto do usuário', margin, yPosition + photoHeight + 5);
            } else {
              // Se não conseguiu carregar, desenhar retângulo vazio
              pdf.setDrawColor(200, 200, 200);
              pdf.setLineWidth(1);
              pdf.rect(photoX, photoY, photoWidth, photoHeight);
              
              pdf.setFontSize(8);
              pdf.setTextColor(100, 100, 100);
              pdf.text('Erro ao carregar foto', margin, yPosition + photoHeight + 5);
            }
          } catch (error) {
            console.error('Erro ao incluir foto no PDF:', error);
            // Se houver erro, desenhar retângulo vazio
            pdf.setDrawColor(200, 200, 200);
            pdf.setLineWidth(1);
            pdf.rect(photoX, photoY, photoWidth, photoHeight);
            
            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            pdf.text('Erro ao carregar foto', margin, yPosition + photoHeight + 5);
          }
        } else {
          // Desenhar retângulo vazio
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineWidth(1);
          pdf.rect(photoX, photoY, photoWidth, photoHeight);
          
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
            const docName = document.originalName || document.name || 'Documento sem nome';
            pdf.text(`• ${docName}`, margin + 5, yPosition);
            
            // Se houver URL do documento, adicionar como link clicável
            if (document.filePath) {
              const docUrl = `${window.location.origin}${document.filePath}`;
              pdf.setTextColor(0, 0, 255); // Cor azul para link
              pdf.textWithLink(`  🔗 Abrir documento`, margin + 10, yPosition + 5, { url: docUrl });
              pdf.setTextColor(0, 0, 0); // Voltar para cor preta
              yPosition += 5;
            }
            
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

        <DialogFooter className="space-x-2">
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
            variant="outline"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Gerar PDF
              </>
            )}
          </Button>
          <Button
            onClick={generateExcel}
            disabled={isGenerating || (reportType === 'categories' && selectedCategories.length === 0)}
            className="btn-primary"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Exportar Excel
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}