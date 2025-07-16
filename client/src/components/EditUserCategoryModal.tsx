import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserCategory } from "@shared/schema";

interface EditUserCategoryModalProps {
  categoryId: number;
  onClose: () => void;
  onCategoryUpdated: () => void;
}

export function EditUserCategoryModal({ categoryId, onClose, onCategoryUpdated }: EditUserCategoryModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3b82f6",
    isActive: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Buscar dados da categoria
  const { data: category, isLoading } = useQuery<UserCategory>({
    queryKey: ['/api/user-categories', categoryId],
    queryFn: async () => {
      return await apiRequest("GET", `/api/user-categories/${categoryId}`);
    },
    enabled: !!categoryId
  });

  // Preencher formulário quando categoria é carregada
  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || "",
        description: category.description || "",
        color: category.color || "#3b82f6",
        isActive: category.isActive ?? true
      });
    }
  }, [category]);

  const updateCategoryMutation = useMutation({
    mutationFn: async (data: Partial<UserCategory>) => {
      return await apiRequest("PUT", `/api/user-categories/${categoryId}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Categoria atualizada",
        description: "A categoria foi atualizada com sucesso.",
      });
      onCategoryUpdated();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar a categoria.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }
    
    if (!formData.color.trim()) {
      newErrors.color = "Cor é obrigatória";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    updateCategoryMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg">
          <p>Carregando categoria...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle>Editar Categoria</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome da Categoria</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Digite o nome da categoria"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Digite uma descrição (opcional)"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="color">Cor</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => handleInputChange("color", e.target.value)}
                  className={`w-16 h-10 p-1 ${errors.color ? "border-red-500" : ""}`}
                />
                <Input
                  type="text"
                  value={formData.color}
                  onChange={(e) => handleInputChange("color", e.target.value)}
                  placeholder="#3b82f6"
                  className={`flex-1 ${errors.color ? "border-red-500" : ""}`}
                />
              </div>
              {errors.color && (
                <p className="text-red-500 text-sm mt-1">{errors.color}</p>
              )}
            </div>

            <div>
              <Label>Status</Label>
              <div className="flex items-center space-x-4 mt-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="isActive"
                    checked={formData.isActive === true}
                    onChange={() => handleInputChange("isActive", true)}
                  />
                  <Badge variant="default">Ativa</Badge>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="isActive"
                    checked={formData.isActive === false}
                    onChange={() => handleInputChange("isActive", false)}
                  />
                  <Badge variant="secondary">Inativa</Badge>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={updateCategoryMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateCategoryMutation.isPending}
              >
                {updateCategoryMutation.isPending ? "Atualizando..." : "Atualizar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}