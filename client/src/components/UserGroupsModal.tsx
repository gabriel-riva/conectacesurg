import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { User, Group } from "@shared/schema";

interface UserGroupsModalProps {
  userId: number;
  onClose: () => void;
}

export function UserGroupsModal({ userId, onClose }: UserGroupsModalProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(true);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  
  // Fetch user
  const { data: user } = useQuery<User>({
    queryKey: ['/api/users', userId],
    queryFn: async () => {
      const response = await apiRequest<User>("GET", `/api/users/${userId}`);
      return response;
    },
  });

  // Fetch all groups
  const { data: allGroups = [], isLoading: isLoadingGroups } = useQuery<Group[]>({
    queryKey: ['/api/groups'],
  });

  // Fetch groups that the user belongs to
  const { data: userGroups = [], isLoading: isLoadingUserGroups } = useQuery<Group[]>({
    queryKey: ['/api/users', userId, 'groups'],
    queryFn: async () => {
      const response = await apiRequest<Group[]>("GET", `/api/users/${userId}/groups`);
      return response;
    },
  });

  // Set initially selected groups when userGroups data is loaded
  useEffect(() => {
    if (userGroups && userGroups.length > 0) {
      setSelectedGroupIds(userGroups.map(group => group.id));
    }
  }, [userGroups]);

  // Add user to group mutation
  const addToGroupMutation = useMutation({
    mutationFn: async (groupId: number) => {
      await apiRequest("POST", `/api/users/${userId}/groups/${groupId}`);
    },
    onSuccess: () => {
      // Invalidar a consulta específica dos grupos deste usuário
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'groups'] });
      
      // Invalidar consultas de filtro para atualizar a UI
      queryClient.invalidateQueries({ queryKey: ['/api/users/filter'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      
      toast({
        title: "Grupo adicionado",
        description: "O usuário foi adicionado ao grupo com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o usuário ao grupo.",
        variant: "destructive",
      });
    },
  });

  // Remove user from group mutation
  const removeFromGroupMutation = useMutation({
    mutationFn: async (groupId: number) => {
      await apiRequest("DELETE", `/api/users/${userId}/groups/${groupId}`);
    },
    onSuccess: () => {
      // Invalidar a consulta específica dos grupos deste usuário
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'groups'] });
      
      // Invalidar consultas de filtro para atualizar a UI
      queryClient.invalidateQueries({ queryKey: ['/api/users/filter'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      
      toast({
        title: "Grupo removido",
        description: "O usuário foi removido do grupo com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível remover o usuário do grupo.",
        variant: "destructive",
      });
    },
  });

  // Handle group selection changes
  const handleGroupSelectionChange = (groupId: number, checked: boolean) => {
    if (checked) {
      // If checked and not already in the selected groups
      if (!selectedGroupIds.includes(groupId)) {
        addToGroupMutation.mutate(groupId);
        setSelectedGroupIds(prev => [...prev, groupId]);
      }
    } else {
      // If unchecked and in the selected groups
      if (selectedGroupIds.includes(groupId)) {
        removeFromGroupMutation.mutate(groupId);
        setSelectedGroupIds(prev => prev.filter(id => id !== groupId));
      }
    }
  };

  const handleClose = () => {
    setOpen(false);
    onClose();
  };

  const isLoading = isLoadingGroups || isLoadingUserGroups || 
                   addToGroupMutation.isPending || removeFromGroupMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">
            Gerenciar Grupos do Usuário
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <h3 className="text-sm font-medium mb-2">Usuário: {user?.name || 'Carregando...'}</h3>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <p>Carregando grupos...</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto p-1">
              {allGroups.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum grupo disponível.</p>
              ) : (
                allGroups.map((group) => (
                  <div key={group.id} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                    <Checkbox 
                      id={`group-${group.id}`} 
                      checked={selectedGroupIds.includes(group.id)}
                      onCheckedChange={(checked) => handleGroupSelectionChange(group.id, checked === true)}
                    />
                    <Label 
                      htmlFor={`group-${group.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium">{group.name}</div>
                      {group.description && (
                        <div className="text-xs text-gray-500">{group.description}</div>
                      )}
                    </Label>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        
        <DialogFooter className="flex justify-end space-x-2">
          <Button
            type="button"
            onClick={handleClose}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}