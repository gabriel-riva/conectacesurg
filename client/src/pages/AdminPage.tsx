import React, { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AddUserModal } from "@/components/AddUserModal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, Group, UserCategory } from "@shared/schema";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddGroupModal } from "@/components/AddGroupModal";
import { UserProfileModal } from "@/components/UserProfileModal";
import { EditUserModal } from "@/components/EditUserModal";
import { EditGroupModal } from "@/components/EditGroupModal";
import { AdminIdeas } from "@/components/AdminIdeas";
import { UserCategoryModal } from "@/components/UserCategoryModal";
import { EditUserCategoryModal } from "@/components/EditUserCategoryModal";
import { UserCategoryAssignmentModal } from "@/components/UserCategoryAssignmentModal";
import { GenerateReportModal } from "@/components/GenerateReportModal";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

// Tipos para a ordenação
type SortColumn = 'name' | 'email' | 'role' | null;
type SortDirection = 'asc' | 'desc';

export default function AdminPage({ activeTab: initialActiveTab }: { activeTab?: string }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isUserCategoryModalOpen, setIsUserCategoryModalOpen] = useState(false);

  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserName, setSelectedUserName] = useState("");
  const [activeTab, setActiveTab] = useState(initialActiveTab || "usuarios");
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<number | null>(null);
  const [isUserEditModalOpen, setIsUserEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<number | null>(null);
  const [isGroupEditModalOpen, setIsGroupEditModalOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);
  const [categoryToEdit, setCategoryToEdit] = useState<number | null>(null);
  const [isUserCategoryEditModalOpen, setIsUserCategoryEditModalOpen] = useState(false);
  const [isUserCategoryAssignmentModalOpen, setIsUserCategoryAssignmentModalOpen] = useState(false);
  const [userForCategoryAssignment, setUserForCategoryAssignment] = useState<{ id: number; name: string } | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const { toast } = useToast();

  // Fetch users - Usar endpoint filter quando uma categoria está selecionada
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users', selectedCategoryFilter],
    queryFn: async () => {
      try {
        // Se uma categoria estiver selecionada, usamos o endpoint de filtro
        if (selectedCategoryFilter) {
          console.log(`Buscando usuários da categoria: ${selectedCategoryFilter}`);
          // Usar o apiRequest do QueryClient para garantir o gerenciamento de autenticação correto
          return await apiRequest("GET", `/api/users/filter?categoryId=${selectedCategoryFilter}`);
        } else {
          console.log("Buscando todos os usuários");
          // Usar o apiRequest do QueryClient para garantir o gerenciamento de autenticação correto
          return await apiRequest("GET", `/api/users`);
        }
      } catch (error) {
        console.error("Erro ao buscar usuários:", error);
        throw error;
      }
    }
  });

  // Fetch groups
  const { data: groups = [], isLoading: isLoadingGroups } = useQuery<Group[]>({
    queryKey: ['/api/groups'],
  });

  // Fetch user categories
  const { data: userCategories = [], isLoading: isLoadingUserCategoryList } = useQuery<UserCategory[]>({
    queryKey: ['/api/user-categories'],
  });
  
  // Buscar os grupos de cada usuário
  const { data: userGroupMapping = {}, isLoading: isLoadingUserGroups } = useQuery<Record<number, Group[]>>({
    queryKey: ['/api/users/groups/mapping', users],
    queryFn: async () => {
      // Criar um mapeamento de usuário para seus grupos
      const mapping: Record<number, Group[]> = {};
      
      for (const user of users) {
        const response = await apiRequest<Group[]>('GET', `/api/users/${user.id}/groups`);
        mapping[user.id] = response;
      }
      
      return mapping;
    },
    // Só buscar quando tiver usuários carregados
    enabled: users.length > 0,
  });

  // Buscar as categorias de cada usuário
  const { data: userCategoriesMapping = {}, isLoading: isLoadingUserCategories } = useQuery<Record<number, any[]>>({
    queryKey: ['/api/users/categories/mapping', users],
    queryFn: async () => {
      // Criar um mapeamento de usuário para suas categorias
      const mapping: Record<number, any[]> = {};
      
      for (const user of users) {
        const response = await apiRequest<any[]>('GET', `/api/user-category-assignments/user/${user.id}`);
        mapping[user.id] = response;
      }
      
      return mapping;
    },
    // Só buscar quando tiver usuários carregados
    enabled: users.length > 0,
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/groups/mapping'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/categories/mapping'] });
      toast({
        title: "Usuário removido",
        description: "O usuário foi removido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível remover o usuário.",
        variant: "destructive",
      });
    },
  });
  
  // Toggle user status mutation
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: number; isActive: boolean }) => {
      await apiRequest("PATCH", `/api/users/${userId}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Status atualizado",
        description: "O status do usuário foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do usuário.",
        variant: "destructive",
      });
    },
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: number) => {
      await apiRequest("DELETE", `/api/groups/${groupId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/groups/mapping'] });
      toast({
        title: "Grupo removido",
        description: "O grupo foi removido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível remover o grupo.",
        variant: "destructive",
      });
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      await apiRequest("DELETE", `/api/user-categories/${categoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-categories'] });
      toast({
        title: "Categoria removida",
        description: "A categoria foi removida com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível remover a categoria.",
        variant: "destructive",
      });
    },
  });

  const handleUserCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    setIsUserModalOpen(false);
  };

  const handleGroupCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
    setIsGroupModalOpen(false);
  };



  const handleUserCategoryCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/user-categories'] });
    setIsUserCategoryModalOpen(false);
  };

  const handleDeleteUser = (userId: number) => {
    setUserToDelete(userId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete);
      setUserToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleDeleteGroup = (groupId: number) => {
    setGroupToDelete(groupId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteGroup = () => {
    if (groupToDelete) {
      deleteGroupMutation.mutate(groupToDelete);
      setGroupToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleEditUser = (userId: number) => {
    setUserToEdit(userId);
    setIsUserEditModalOpen(true);
  };
  
  const handleEditGroup = (groupId: number) => {
    setGroupToEdit(groupId);
    setIsGroupEditModalOpen(true);
  };

  const handleEditCategory = (categoryId: number) => {
    setCategoryToEdit(categoryId);
    setIsUserCategoryEditModalOpen(true);
  };

  const handleDeleteCategory = (categoryId: number) => {
    setCategoryToDelete(categoryId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteCategory = () => {
    if (categoryToDelete) {
      deleteCategoryMutation.mutate(categoryToDelete);
      setCategoryToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleUserProfile = useCallback((userId: number, userName: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setIsUserProfileModalOpen(true);
  }, []);
  
  const toggleUserStatus = (user: User) => {
    if (user.role === "superadmin") {
      toast({
        title: "Operação não permitida",
        description: "Não é possível desativar o superadmin.",
        variant: "destructive",
      });
      return;
    }
    
    const newStatus = !user.isActive;
    toggleUserStatusMutation.mutate({ 
      userId: user.id, 
      isActive: newStatus 
    });
  };

  // Função para lidar com o clique no cabeçalho da coluna para ordenação
  const handleSortClick = (column: SortColumn) => {
    if (sortColumn === column) {
      // Se a coluna atual já está selecionada, alterna a direção
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Se uma nova coluna foi selecionada, define-a como a coluna de ordenação
      // e redefine a direção para 'asc'
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort filtered users
  const sortedUsers = useMemo(() => {
    if (!sortColumn) return filteredUsers;

    return [...filteredUsers].sort((a, b) => {
      const valueA = a[sortColumn]?.toString().toLowerCase() || '';
      const valueB = b[sortColumn]?.toString().toLowerCase() || '';
      
      if (sortDirection === 'asc') {
        return valueA.localeCompare(valueB);
      } else {
        return valueB.localeCompare(valueA);
      }
    });
  }, [filteredUsers, sortColumn, sortDirection]);

  // Filter groups based on search term
  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <div className="flex flex-1 bg-gray-100">
        <AdminSidebar />
        
        <div className="flex-1 p-8 max-w-full overflow-hidden">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <h1 className="text-2xl font-bold text-primary">Gestão de Usuários</h1>
            {activeTab === "usuarios" ? (
              <div className="flex gap-2 flex-shrink-0">
                <Button 
                  onClick={() => setIsUserModalOpen(true)}
                  className="btn-primary flex items-center whitespace-nowrap">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Adicionar Usuário
                </Button>
                <Button 
                  onClick={() => setIsReportModalOpen(true)}
                  variant="outline"
                  className="flex items-center whitespace-nowrap">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Gerar Relatório
                </Button>
              </div>
            ) : activeTab === "categorias" ? (
              <Button 
                onClick={() => setIsUserCategoryModalOpen(true)}
                className="btn-primary flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Nova Categoria
              </Button>
            ) : activeTab === "grupos" ? (
              <Button 
                onClick={() => setIsGroupModalOpen(true)}
                className="btn-primary flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Novo Grupo da Comunidade
              </Button>
            ) : null}
          </div>
          
          <Tabs defaultValue={activeTab} className="w-full max-w-full overflow-hidden" onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="usuarios">Usuários</TabsTrigger>
              <TabsTrigger value="categorias">Categorias</TabsTrigger>
              <TabsTrigger value="grupos">Grupos da Comunidade</TabsTrigger>
              <TabsTrigger value="acessos">Acessos</TabsTrigger>
            </TabsList>
            
            <TabsContent value="usuarios">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-primary mb-4 md:mb-0">Usuários Registrados</h2>
                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-end">
                      {/* Filtro por categoria */}
                      {!isLoadingUserCategoryList && userCategories.length > 0 && (
                        <div className="w-full md:w-64">
                          <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
                            Filtrar por categoria
                          </label>
                          <select
                            id="category-filter"
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-10 px-3"
                            value={selectedCategoryFilter?.toString() || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setSelectedCategoryFilter(value ? parseInt(value) : null);
                            }}
                          >
                            <option value="">Todos os usuários</option>
                            {[...userCategories]
                              .filter(category => category.isActive)
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}
                      
                      {/* Campo de busca */}
                      <div className="relative w-full md:w-64">
                        <Input
                          type="text"
                          placeholder="Buscar usuários..."
                          className="w-full pl-10 pr-4"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  {isLoadingUsers ? (
                    <div className="flex justify-center items-center py-8">
                      <p>Carregando usuários...</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="min-w-full bg-white">
                        <thead className="bg-gray-50">
                          <tr>
                            <th 
                              scope="col" 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSortClick('name')}
                            >
                              <div className="flex items-center">
                                Nome
                                {sortColumn === 'name' && (
                                  <span className="ml-1">
                                    {sortDirection === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th 
                              scope="col" 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSortClick('email')}
                            >
                              <div className="flex items-center">
                                Email
                                {sortColumn === 'email' && (
                                  <span className="ml-1">
                                    {sortDirection === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th 
                              scope="col" 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSortClick('role')}
                            >
                              <div className="flex items-center">
                                Função
                                {sortColumn === 'role' && (
                                  <span className="ml-1">
                                    {sortDirection === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categorias</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {sortedUsers.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-4 py-4 text-center text-sm text-gray-500">
                                  Nenhum usuário encontrado
                                </td>
                              </tr>
                            ) : (
                              sortedUsers.map((user) => (
                                <tr key={user.id}>
                                  <td className="px-4 py-4 whitespace-nowrap" style={{ width: '200px' }}>
                                    <div className="flex items-center">
                                      <div className="flex-shrink-0 h-8 w-8 bg-secondary rounded-full flex items-center justify-center text-white text-sm">
                                        {user.name.charAt(0)}
                                      </div>
                                      <div className="ml-3">
                                        <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap" style={{ width: '250px' }}>
                                    <div className="text-sm text-gray-900 truncate">{user.email}</div>
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap" style={{ width: '120px' }}>
                                    <div className="text-sm text-gray-900">
                                      {user.role === "superadmin" ? "Superadmin" : 
                                       user.role === "admin" ? "Admin" : "Usuário"}
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap" style={{ width: '80px' }}>
                                    {user.isActive === false ? (
                                      <Badge variant="outline" className="bg-red-100 text-red-800 border-0">
                                        Inativo
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-green-100 text-green-800 border-0">
                                        Ativo
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap" style={{ width: '200px' }}>
                                    <div className="flex items-center space-x-1 overflow-hidden">
                                      {isLoadingUserCategories ? (
                                        <span className="text-xs text-gray-500">Carregando...</span>
                                      ) : userCategoriesMapping[user.id]?.length > 0 ? (
                                        <>
                                          {userCategoriesMapping[user.id].length <= 2 ? (
                                            [...userCategoriesMapping[user.id]]
                                              .sort((a, b) => a.name.localeCompare(b.name))
                                              .map(category => (
                                                <Badge 
                                                  key={category.id} 
                                                  variant="secondary"
                                                  className="text-white border-0 text-xs px-2 py-1 shrink-0"
                                                  style={{ backgroundColor: category.color }}
                                                  title={category.description || category.name}
                                                >
                                                  {category.name}
                                                </Badge>
                                              ))
                                          ) : (
                                            <>
                                              <Badge 
                                                variant="secondary"
                                                className="text-white border-0 text-xs px-2 py-1 shrink-0"
                                                style={{ backgroundColor: userCategoriesMapping[user.id][0].color }}
                                                title={userCategoriesMapping[user.id][0].description || userCategoriesMapping[user.id][0].name}
                                              >
                                                {userCategoriesMapping[user.id][0].name}
                                              </Badge>
                                              <Badge 
                                                variant="outline" 
                                                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 border-gray-300 shrink-0 cursor-help"
                                                title={`Total: ${userCategoriesMapping[user.id].length} categorias
${userCategoriesMapping[user.id].map(c => `• ${c.name}`).join('\n')}`}
                                              >
                                                +{userCategoriesMapping[user.id].length - 1}
                                              </Badge>
                                            </>
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-xs text-gray-500">Nenhuma categoria</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500" style={{ width: '300px' }}>
                                    <div className="flex space-x-1">
                                      {user.role !== "superadmin" && (
                                        <>
                                          {/* Botão para ativar/desativar usuário */}
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className={`h-8 w-8 ${user.isActive ? 'text-orange-600 hover:text-orange-900 hover:bg-orange-50' : 'text-teal-600 hover:text-teal-900 hover:bg-teal-50'}`} 
                                            title={user.isActive ? "Desativar Usuário" : "Ativar Usuário"}
                                            onClick={() => toggleUserStatus(user)}
                                            disabled={toggleUserStatusMutation.isPending}
                                          >
                                            {user.isActive ? (
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                              </svg>
                                            ) : (
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                              </svg>
                                            )}
                                          </Button>

                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-green-600 hover:text-green-900 hover:bg-green-50" 
                                            title="Ver Perfil"
                                            onClick={() => handleUserProfile(user.id, user.name)}
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                          </Button>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-amber-600 hover:text-amber-900 hover:bg-amber-50" 
                                            title="Gerenciar Categorias"
                                            onClick={() => {
                                              setUserForCategoryAssignment({ id: user.id, name: user.name });
                                              setIsUserCategoryAssignmentModalOpen(true);
                                            }}
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                            </svg>
                                          </Button>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-blue-600 hover:text-blue-900 hover:bg-blue-50" 
                                            title="Editar"
                                            onClick={() => handleEditUser(user.id)}
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                          </Button>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-red-600 hover:text-red-900 hover:bg-red-50" 
                                            title="Remover"
                                            onClick={() => handleDeleteUser(user.id)}
                                            disabled={deleteUserMutation.isPending}
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="categorias">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-primary mb-4 md:mb-0">Categorias de Usuários</h2>
                    <div className="relative w-full md:w-auto">
                      <Input
                        type="text"
                        placeholder="Buscar categorias..."
                        className="w-full md:w-64 pl-10 pr-4"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Cabeçalho fixo da tabela */}
                    <div className="overflow-x-auto bg-gray-50 border-b border-gray-200">
                      <table className="min-w-full">
                        <thead>
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cor</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                          </tr>
                        </thead>
                      </table>
                    </div>
                    
                    {/* Corpo da tabela com scroll vertical */}
                    <div className="overflow-x-auto overflow-y-auto max-h-[500px] bg-white">
                      <table className="min-w-full">
                        <tbody className="bg-white divide-y divide-gray-200">
                          {userCategories.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                                Nenhuma categoria encontrada
                              </td>
                            </tr>
                          ) : (
                            userCategories
                              .filter(category => 
                                category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
                              )
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map((category) => (
                                <tr key={category.id}>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{category.name}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900">{category.description || "Sem descrição"}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div 
                                        className="w-4 h-4 rounded-full mr-2 border border-gray-300"
                                        style={{ backgroundColor: category.color || '#gray' }}
                                      />
                                      <span className="text-sm text-gray-900">{category.color}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <Badge variant={category.isActive ? "default" : "secondary"}>
                                      {category.isActive ? "Ativa" : "Inativa"}
                                    </Badge>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex items-center space-x-2">
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-blue-600 hover:text-blue-900 hover:bg-blue-50" 
                                        title="Editar"
                                        onClick={() => handleEditCategory(category.id)}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-red-600 hover:text-red-900 hover:bg-red-50" 
                                        title="Remover"
                                        onClick={() => handleDeleteCategory(category.id)}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="grupos">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-primary mb-4 md:mb-0">Grupos</h2>
                    <div className="relative w-full md:w-auto">
                      <Input
                        type="text"
                        placeholder="Buscar grupos..."
                        className="w-full md:w-64 pl-10 pr-4"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                  
                  {isLoadingGroups ? (
                    <div className="flex justify-center items-center py-8">
                      <p>Carregando grupos...</p>
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Cabeçalho fixo da tabela */}
                      <div className="overflow-x-auto bg-gray-50 border-b border-gray-200">
                        <table className="min-w-full">
                          <thead>
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criado em</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                          </thead>
                        </table>
                      </div>
                      
                      {/* Corpo da tabela com scroll vertical */}
                      <div className="overflow-x-auto overflow-y-auto max-h-[500px] bg-white">
                        <table className="min-w-full">
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredGroups.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                                  Nenhum grupo encontrado
                                </td>
                              </tr>
                            ) : (
                              [...filteredGroups]
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((group) => (
                                <tr key={group.id}>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{group.name}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900">{group.description || "Sem descrição"}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">
                                      {group.createdAt ? new Date(group.createdAt).toLocaleDateString('pt-BR') : 'Data não disponível'}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <div className="flex space-x-2">
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-blue-600 hover:text-blue-900 hover:bg-blue-50" 
                                        title="Editar"
                                        onClick={() => handleEditGroup(group.id)}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-red-600 hover:text-red-900 hover:bg-red-50" 
                                        title="Remover"
                                        onClick={() => handleDeleteGroup(group.id)}
                                        disabled={deleteGroupMutation.isPending}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            

            
            <TabsContent value="acessos">
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-lg font-semibold text-primary mb-4">Gestão de Acessos</h2>
                  <p className="text-gray-600 mb-4">
                    Configure os acessos de usuários por grupo para diferentes recursos da plataforma.
                  </p>
                  
                  <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-amber-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-amber-700">
                          Para configurar permissões, primeiro crie grupos e adicione usuários a esses grupos.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Tabela de matriz de permissões será adicionada aqui no futuro */}
                  <div className="text-center py-10 text-gray-500">
                    Funcionalidade em desenvolvimento
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {isUserModalOpen && (
        <AddUserModal 
          onClose={() => setIsUserModalOpen(false)} 
          onUserCreated={handleUserCreated}
        />
      )}

      {isGroupModalOpen && (
        <AddGroupModal 
          onClose={() => setIsGroupModalOpen(false)} 
          onGroupCreated={handleGroupCreated}
        />
      )}

      {isUserCategoryModalOpen && (
        <UserCategoryModal 
          onClose={() => setIsUserCategoryModalOpen(false)} 
          onCategoryCreated={handleUserCategoryCreated}
        />
      )}

      {isUserCategoryEditModalOpen && categoryToEdit && (
        <EditUserCategoryModal 
          categoryId={categoryToEdit}
          onClose={() => {
            setIsUserCategoryEditModalOpen(false);
            setCategoryToEdit(null);
          }}
          onCategoryUpdated={handleUserCategoryCreated}
        />
      )}

      {isUserCategoryAssignmentModalOpen && userForCategoryAssignment && (
        <UserCategoryAssignmentModal
          userId={userForCategoryAssignment.id}
          userName={userForCategoryAssignment.name}
          onClose={() => {
            setIsUserCategoryAssignmentModalOpen(false);
            setUserForCategoryAssignment(null);
          }}
        />
      )}

      {/* Modal de edição - será implementado  */}
      {isUserEditModalOpen && userToEdit && (
        <EditUserModal
          userId={userToEdit}
          onClose={() => {
            setIsUserEditModalOpen(false);
            setUserToEdit(null);
          }}
          onUserUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/users'] });
            queryClient.invalidateQueries({ queryKey: ['/api/users/groups/mapping'] });
            setIsUserEditModalOpen(false);
            setUserToEdit(null);
          }}
        />
      )}

      {isGroupEditModalOpen && groupToEdit && (
        <EditGroupModal
          groupId={groupToEdit}
          onClose={() => {
            setIsGroupEditModalOpen(false);
            setGroupToEdit(null);
          }}
          onGroupUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
            queryClient.invalidateQueries({ queryKey: ['/api/users/groups/mapping'] });
            setIsGroupEditModalOpen(false);
            setGroupToEdit(null);
          }}
        />
      )}
      
      {isUserProfileModalOpen && selectedUserId && (
        <UserProfileModal 
          userId={selectedUserId}
          userName={selectedUserName}
          isOpen={isUserProfileModalOpen}
          onClose={() => {
            setIsUserProfileModalOpen(false);
            setSelectedUserId(null);
            setSelectedUserName("");
          }}
        />
      )}

      <GenerateReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />

      {/* Diálogo de confirmação de exclusão */}
      <AlertDialog 
        open={isDeleteDialogOpen} 
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setIsDeleteDialogOpen(false);
            setUserToDelete(null);
            setGroupToDelete(null);
            setCategoryToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {userToDelete 
                ? "Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita."
                : groupToDelete 
                  ? "Tem certeza que deseja remover este grupo? Esta ação não pode ser desfeita."
                  : "Tem certeza que deseja remover esta categoria? Esta ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={userToDelete ? confirmDeleteUser : groupToDelete ? confirmDeleteGroup : confirmDeleteCategory}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Confirmar exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
