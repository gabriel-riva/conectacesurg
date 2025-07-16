import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserCategory, User } from "@shared/schema";
import { X, Search, Plus, Trash2 } from "lucide-react";

interface UserCategoryAssignmentModalProps {
  userId: number;
  userName: string;
  onClose: () => void;
}

interface UserCategoryAssignment {
  id: number;
  name: string;
  description: string;
  color: string;
  isActive: boolean;
  assignedAt: string;
}

export function UserCategoryAssignmentModal({ userId, userName, onClose }: UserCategoryAssignmentModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const { toast } = useToast();

  // Buscar todas as categorias disponíveis
  const { data: allCategories, isLoading: loadingCategories } = useQuery<UserCategory[]>({
    queryKey: ['/api/user-categories'],
    queryFn: async () => {
      return await apiRequest("GET", "/api/user-categories");
    }
  });

  // Buscar categorias já atribuídas ao usuário
  const { data: assignedCategories, isLoading: loadingAssigned } = useQuery<UserCategoryAssignment[]>({
    queryKey: ['/api/user-category-assignments/user', userId],
    queryFn: async () => {
      return await apiRequest("GET", `/api/user-category-assignments/user/${userId}`);
    }
  });

  // Atribuir categoria ao usuário
  const assignCategoryMutation = useMutation({
    mutationFn: async (data: { userId: number; categoryId: number }) => {
      return await apiRequest("POST", "/api/user-category-assignments", data);
    },
    onSuccess: () => {
      toast({
        title: "Categoria atribuída",
        description: "A categoria foi atribuída ao usuário com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user-category-assignments/user', userId] });
      setSelectedCategories([]);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atribuir a categoria.",
        variant: "destructive",
      });
    },
  });

  // Remover categoria do usuário
  const removeCategoryMutation = useMutation({
    mutationFn: async (data: { userId: number; categoryId: number }) => {
      return await apiRequest("DELETE", "/api/user-category-assignments", data);
    },
    onSuccess: () => {
      toast({
        title: "Categoria removida",
        description: "A categoria foi removida do usuário com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user-category-assignments/user', userId] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível remover a categoria.",
        variant: "destructive",
      });
    },
  });

  const filteredCategories = allCategories?.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         category.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const isNotAssigned = !assignedCategories?.some(assigned => assigned.id === category.id);
    const isActive = category.isActive;
    return matchesSearch && isNotAssigned && isActive;
  }) || [];

  const handleAssignCategories = () => {
    selectedCategories.forEach(categoryId => {
      assignCategoryMutation.mutate({ userId, categoryId });
    });
  };

  const handleRemoveCategory = (categoryId: number) => {
    removeCategoryMutation.mutate({ userId, categoryId });
  };

  const handleCategorySelect = (categoryId: number, checked: boolean) => {
    if (checked) {
      setSelectedCategories(prev => [...prev, categoryId]);
    } else {
      setSelectedCategories(prev => prev.filter(id => id !== categoryId));
    }
  };

  if (loadingCategories || loadingAssigned) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg">
          <p>Carregando categorias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gerenciar Categorias - {userName}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="overflow-y-auto">
          <div className="space-y-6">
            {/* Categorias já atribuídas */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Categorias Atribuídas</h3>
              {assignedCategories && assignedCategories.length > 0 ? (
                <div className="space-y-2">
                  {assignedCategories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        ></div>
                        <div>
                          <p className="font-medium">{category.name}</p>
                          {category.description && (
                            <p className="text-sm text-gray-600">{category.description}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCategory(category.id)}
                        disabled={removeCategoryMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Nenhuma categoria atribuída</p>
              )}
            </div>

            {/* Atribuir novas categorias */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Atribuir Novas Categorias</h3>
              
              {/* Campo de busca */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar categorias..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Lista de categorias disponíveis */}
              {filteredCategories.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {filteredCategories.map((category) => (
                    <div key={category.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id={`category-${category.id}`}
                        checked={selectedCategories.includes(category.id)}
                        onCheckedChange={(checked) => 
                          handleCategorySelect(category.id, checked as boolean)
                        }
                      />
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <div className="flex-1">
                        <label 
                          htmlFor={`category-${category.id}`}
                          className="font-medium cursor-pointer"
                        >
                          {category.name}
                        </label>
                        {category.description && (
                          <p className="text-sm text-gray-600">{category.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">
                  {searchTerm ? "Nenhuma categoria encontrada" : "Todas as categorias já foram atribuídas"}
                </p>
              )}

              {/* Botão para atribuir categorias selecionadas */}
              {selectedCategories.length > 0 && (
                <div className="mt-4 flex justify-end">
                  <Button 
                    onClick={handleAssignCategories}
                    disabled={assignCategoryMutation.isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Atribuir {selectedCategories.length} categoria(s)
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}