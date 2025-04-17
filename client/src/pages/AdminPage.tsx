import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AddUserModal } from "@/components/AddUserModal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, Group } from "@shared/schema";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddGroupModal } from "@/components/AddGroupModal";
import { UserGroupsModal } from "@/components/UserGroupsModal";
import { EditUserModal } from "@/components/EditUserModal";
import { EditGroupModal } from "@/components/EditGroupModal";
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

export default function AdminPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isUserGroupsModalOpen, setIsUserGroupsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("usuarios");
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<number | null>(null);
  const [isUserEditModalOpen, setIsUserEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<number | null>(null);
  const [isGroupEditModalOpen, setIsGroupEditModalOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch users - Usar endpoint filter quando um grupo está selecionado
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users', selectedGroupFilter],
    queryFn: async () => {
      try {
        // Se um grupo estiver selecionado, usamos o endpoint de filtro
        if (selectedGroupFilter) {
          console.log(`Buscando usuários do grupo: ${selectedGroupFilter}`);
          // Usar o apiRequest do QueryClient para garantir o gerenciamento de autenticação correto
          return await apiRequest("GET", `/api/users/filter?groupId=${selectedGroupFilter}`);
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

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/groups/mapping'] });
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

  const handleUserCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    setIsUserModalOpen(false);
  };

  const handleGroupCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
    setIsGroupModalOpen(false);
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

  const handleUserGroups = useCallback((userId: number) => {
    setSelectedUserId(userId);
    setIsUserGroupsModalOpen(true);
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

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        
        <div className="flex-1 p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-primary">Gestão de Usuários</h1>
            {activeTab === "usuarios" ? (
              <Button 
                onClick={() => setIsUserModalOpen(true)}
                className="btn-primary flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Adicionar Usuário
              </Button>
            ) : activeTab === "grupos" ? (
              <Button 
                onClick={() => setIsGroupModalOpen(true)}
                className="btn-primary flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Adicionar Grupo
              </Button>
            ) : null}
          </div>
          
          <Tabs defaultValue="usuarios" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="usuarios">Usuários</TabsTrigger>
              <TabsTrigger value="grupos">Grupos</TabsTrigger>
              <TabsTrigger value="acessos">Acessos</TabsTrigger>
            </TabsList>
            
            <TabsContent value="usuarios">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-primary mb-4 md:mb-0">Usuários Registrados</h2>
                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-end">
                      {/* Filtro por grupo */}
                      {!isLoadingGroups && groups.length > 0 && (
                        <div className="w-full md:w-64">
                          <label htmlFor="group-filter" className="block text-sm font-medium text-gray-700 mb-1">
                            Filtrar por grupo
                          </label>
                          <select
                            id="group-filter"
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-10 px-3"
                            value={selectedGroupFilter?.toString() || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setSelectedGroupFilter(value ? parseInt(value) : null);
                            }}
                          >
                            <option value="">Todos os usuários</option>
                            {[...groups]
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map((group) => (
                                <option key={group.id} value={group.id}>
                                  {group.name}
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
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Função</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grupos</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredUsers.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                                Nenhum usuário encontrado
                              </td>
                            </tr>
                          ) : (
                            filteredUsers.map((user) => (
                              <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10 bg-secondary rounded-full flex items-center justify-center text-white">
                                      {user.name.charAt(0)}
                                    </div>
                                    <div className="ml-4">
                                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{user.email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {user.role === "superadmin" ? "Superadmin" : 
                                     user.role === "admin" ? "Administrador" : "Usuário"}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
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
                                <td className="px-6 py-4">
                                  <div className="flex flex-wrap gap-1">
                                    {isLoadingUserGroups ? (
                                      <span className="text-xs text-gray-500">Carregando...</span>
                                    ) : userGroupMapping[user.id]?.length > 0 ? (
                                      [...userGroupMapping[user.id]]
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map(group => (
                                          <Badge 
                                            key={group.id} 
                                            variant="secondary"
                                            className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                                          >
                                            {group.name}
                                          </Badge>
                                        ))
                                    ) : (
                                      <span className="text-xs text-gray-500">Nenhum grupo</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <div className="flex space-x-2">
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
                                          title="Gerenciar Grupos"
                                          onClick={() => handleUserGroups(user.id)}
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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
                  )}
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
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criado em</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                          </tr>
                        </thead>
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

      {isUserGroupsModalOpen && selectedUserId && (
        <UserGroupsModal 
          userId={selectedUserId}
          onClose={() => {
            setIsUserGroupsModalOpen(false);
            setSelectedUserId(null);
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

      {/* Diálogo de confirmação de exclusão */}
      <AlertDialog 
        open={isDeleteDialogOpen} 
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setIsDeleteDialogOpen(false);
            setUserToDelete(null);
            setGroupToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {userToDelete 
                ? "Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita."
                : "Tem certeza que deseja remover este grupo? Esta ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={userToDelete ? confirmDeleteUser : confirmDeleteGroup}
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
