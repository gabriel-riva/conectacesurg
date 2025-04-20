import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Header } from "@/components/Header";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminHeader } from "@/components/AdminHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Save, Image, Trash } from "lucide-react";

// Importando o editor TinyMCE
import TinyEditor from "@/components/TinyEditor";

// Define o tipo das props da página

// Define o tipo das props da página
interface NewsEditorPageProps {
  isEditMode?: boolean;
}

// Componente principal da página
export default function NewsEditorPage(props: NewsEditorPageProps) {
  const params = useParams();
  const newsId = params?.id;
  const [_, setLocation] = useLocation();
  
  // Determina se estamos no modo de edição com base nos props ou na presença de um ID
  const isEditMode = props.isEditMode || !!newsId;
  const { toast } = useToast();
  
  // Estado inicial do formulário
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
    categoryId: "",
    isPublished: false,
    imageUrl: null as string | null,
  });
  
  // Estado para armazenar a imagem selecionada
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Buscar categorias
  const { data: categories } = useQuery({
    queryKey: ['/api/news/categories'],
    queryFn: () => fetch('/api/news/categories').then(res => res.json()),
  });
  
  // Se estiver no modo de edição, busca os dados da notícia
  const { data: newsData, isLoading: isLoadingNews } = useQuery({
    queryKey: ['/api/news', newsId],
    queryFn: () => fetch(`/api/news/${newsId}`).then(res => res.json()),
    enabled: isEditMode && !!newsId,
  });

  // Efeito para atualizar o formulário quando os dados são carregados
  React.useEffect(() => {
    if (newsData) {
      setFormData({
        title: newsData.title || "",
        description: newsData.description || "",
        content: newsData.content || "",
        categoryId: newsData.categoryId ? String(newsData.categoryId) : "",
        isPublished: newsData.isPublished || false,
        imageUrl: newsData.imageUrl || null,
      });
      
      if (newsData.imageUrl) {
        setImagePreview(newsData.imageUrl);
      }
    }
  }, [newsData]);
  
  // Mutação para salvar notícia
  const saveNews = useMutation({
    mutationFn: async () => {
      // Cria um FormData para enviar arquivos
      const formDataObj = new FormData();
      formDataObj.append('title', formData.title);
      formDataObj.append('description', formData.description);
      formDataObj.append('content', formData.content);
      
      if (formData.categoryId) {
        formDataObj.append('categoryId', formData.categoryId);
      }
      
      formDataObj.append('isPublished', String(formData.isPublished));
      
      if (selectedImage) {
        formDataObj.append('image', selectedImage);
      }
      
      if (isEditMode && newsId) {
        // Editar notícia existente
        return apiRequest(`/api/news/${newsId}`, {
          method: 'PUT',
          body: formDataObj,
        });
      } else {
        // Criar nova notícia
        return apiRequest('/api/news', {
          method: 'POST',
          body: formDataObj,
        });
      }
    },
    onSuccess: (data) => {
      toast({
        title: isEditMode ? "Notícia atualizada com sucesso" : "Notícia criada com sucesso",
        description: isEditMode 
          ? "As alterações foram salvas." 
          : "A notícia foi criada e já está disponível.",
      });
      
      // Redireciona para a página de gerenciamento de notícias
      setLocation('/admin/noticias');
    },
    onError: (error) => {
      toast({
        title: isEditMode ? "Erro ao atualizar notícia" : "Erro ao criar notícia",
        description: "Ocorreu um erro ao salvar a notícia. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
      console.error(isEditMode ? "Erro ao atualizar notícia:" : "Erro ao criar notícia:", error);
    },
  });
  
  // Handler para o envio do formulário
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação dos campos obrigatórios
    if (!formData.title.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Por favor, informe um título para a notícia.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.description.trim()) {
      toast({
        title: "Descrição obrigatória",
        description: "Por favor, informe uma descrição para a notícia.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.content.trim()) {
      toast({
        title: "Conteúdo obrigatório",
        description: "Por favor, informe o conteúdo da notícia.",
        variant: "destructive",
      });
      return;
    }
    
    // Se validação passar, salva a notícia
    saveNews.mutate();
  };
  
  // Agora estamos usando diretamente o evento onChange do Textarea
  
  // Handler para lidar com a seleção de imagem
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      
      // Cria um preview da imagem
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Remover imagem
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setFormData({ ...formData, imageUrl: null });
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <div className="flex flex-1 bg-gray-100">
        <AdminSidebar />
        
        <div className="flex-1 p-8">
          <AdminHeader
            title={isEditMode ? "Editar Notícia" : "Nova Notícia"}
            description={isEditMode 
              ? "Edite as informações da notícia selecionada." 
              : "Crie uma nova notícia para o portal."}
          />
          
          <div className="mt-6">
            <Button 
              variant="outline" 
              onClick={() => setLocation('/admin/noticias')}
              className="mb-6"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
            
            {isEditMode && isLoadingNews ? (
              <div className="text-center py-8">Carregando dados da notícia...</div>
            ) : (
              <form onSubmit={handleSubmit}>
                <Card className="p-6 mb-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Título da Notícia *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Digite o título da notícia"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição *</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Digite uma breve descrição da notícia"
                        rows={3}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="category">Categoria</Label>
                      <Select
                        value={formData.categoryId || "null"} 
                        onValueChange={(value) => setFormData({ ...formData, categoryId: value === "null" ? "" : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="null">Sem categoria</SelectItem>
                          {categories?.map((category: any) => (
                            <SelectItem key={category.id} value={String(category.id)}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="image">Imagem de Capa</Label>
                      <div className="mt-2">
                        <div className="flex items-center gap-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById('image-upload')?.click()}
                          >
                            <Image className="h-4 w-4 mr-2" /> Selecionar Imagem
                          </Button>
                          {imagePreview && (
                            <Button
                              type="button"
                              variant="outline"
                              className="text-destructive"
                              onClick={handleRemoveImage}
                            >
                              <Trash className="h-4 w-4 mr-2" /> Remover Imagem
                            </Button>
                          )}
                        </div>
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </div>
                      {imagePreview && (
                        <div className="mt-4">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="max-w-full max-h-60 object-contain rounded-lg border"
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="published"
                        checked={formData.isPublished}
                        onCheckedChange={(checked) => setFormData({ ...formData, isPublished: checked })}
                      />
                      <Label htmlFor="published">Publicar imediatamente</Label>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-6 mb-6">
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="content">Conteúdo da Notícia *</Label>
                    <p className="text-sm text-muted-foreground">
                      Use o editor abaixo para criar o conteúdo completo da notícia com formatação.
                    </p>
                  </div>
                  
                  <TinyEditor
                    value={formData.content}
                    onChange={(value) => setFormData({ ...formData, content: value })}
                  />
                </Card>
                
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="mr-2"
                    onClick={() => setLocation('/admin/noticias')}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    disabled={saveNews.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" /> 
                    {saveNews.isPending ? 'Salvando...' : 'Salvar Notícia'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}