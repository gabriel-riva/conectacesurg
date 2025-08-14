import React, { useState, useEffect } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import {
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Save, X, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface Challenge {
  id: number;
  title: string;
  type: string;
  isActive: boolean;
  points: number;
  displayOrder: number;
  evaluationType?: string;
}

interface SortableItemProps {
  challenge: Challenge;
}

const SortableItem: React.FC<SortableItemProps> = ({ challenge }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: challenge.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`mb-2 ${isDragging ? 'shadow-lg' : ''}`}>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div 
              {...attributes} 
              {...listeners}
              className="cursor-move text-gray-400 hover:text-gray-600"
            >
              <GripVertical className="w-5 h-5" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{challenge.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {challenge.type === 'periodic' ? 'Ciclo' : 'Anual'}
                  </Badge>
                  {challenge.evaluationType && challenge.evaluationType !== 'none' && (
                    <Badge variant="secondary" className="text-xs">
                      {challenge.evaluationType === 'quiz' ? 'Quiz' :
                       challenge.evaluationType === 'text' ? 'Texto' :
                       challenge.evaluationType === 'file' ? 'Arquivo' :
                       challenge.evaluationType === 'qrcode' ? 'QR Code' :
                       challenge.evaluationType}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={challenge.isActive ? 'default' : 'secondary'} className="text-xs">
                    {challenge.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {challenge.points} pts
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface AdminChallengeReorderProps {
  challenges: Challenge[];
  onClose: () => void;
}

export const AdminChallengeReorder: React.FC<AdminChallengeReorderProps> = ({ 
  challenges: initialChallenges, 
  onClose 
}) => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Ordenar desafios pela ordem de display
    const sorted = [...initialChallenges].sort((a, b) => {
      // Primeiro por displayOrder
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }
      // Se displayOrder for igual, ordenar por id
      return a.id - b.id;
    });
    setChallenges(sorted);
  }, [initialChallenges]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const reorderMutation = useMutation({
    mutationFn: async (challengeIds: number[]) => {
      return apiRequest('/api/gamification/challenges/reorder', {
        method: 'PUT',
        body: JSON.stringify({ challengeIds })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/gamification/challenges']
      });
      toast({
        title: "Sucesso",
        description: "Ordem dos desafios atualizada com sucesso!",
      });
      setHasChanges(false);
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao salvar a nova ordem dos desafios",
        variant: "destructive"
      });
    }
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(Number(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setChallenges((items) => {
        const oldIndex = items.findIndex((item) => item.id === Number(active.id));
        const newIndex = items.findIndex((item) => item.id === Number(over.id));
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        setHasChanges(true);
        return newItems;
      });
    }

    setActiveId(null);
  };

  const handleSave = () => {
    const challengeIds = challenges.map(c => c.id);
    reorderMutation.mutate(challengeIds);
  };

  const handleCancel = () => {
    if (hasChanges) {
      const confirmed = window.confirm("Você tem alterações não salvas. Deseja descartar?");
      if (!confirmed) return;
    }
    onClose();
  };

  const activeChallenge = activeId ? challenges.find(c => c.id === activeId) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Reordenar Desafios</h3>
          <p className="text-sm text-gray-500">
            Arraste os desafios para reorganizar a ordem de exibição
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            size="sm"
          >
            <X className="w-4 h-4 mr-1" />
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || reorderMutation.isPending}
            size="sm"
          >
            <Save className="w-4 h-4 mr-1" />
            {reorderMutation.isPending ? 'Salvando...' : 'Salvar Ordem'}
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-600" />
          <span className="text-sm text-yellow-700">
            Você tem alterações não salvas. Clique em "Salvar Ordem" para aplicar as mudanças.
          </span>
        </div>
      )}

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={challenges.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {challenges.map((challenge) => (
              <SortableItem key={challenge.id} challenge={challenge} />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeChallenge ? (
            <Card className="shadow-xl">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{activeChallenge.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {activeChallenge.type === 'periodic' ? 'Ciclo' : 'Anual'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};