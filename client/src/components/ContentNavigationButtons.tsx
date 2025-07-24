import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StarRating } from "@/components/StarRating";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface TrailContent {
  id: number;
  title: string;
  order: number;
}

interface ContentNavigationButtonsProps {
  currentContent: TrailContent;
  allContents: TrailContent[];
  trailId: number;
  userId?: number;
  isCompleted: boolean;
  onContentSelect: (content: TrailContent) => void;
  onMarkCompleted: () => void;
}

export function ContentNavigationButtons({
  currentContent,
  allContents,
  trailId,
  userId,
  isCompleted,
  onContentSelect,
  onMarkCompleted
}: ContentNavigationButtonsProps) {
  const queryClient = useQueryClient();
  
  // Sort contents by order
  const sortedContents = [...allContents].sort((a, b) => a.order - b.order);
  const currentIndex = sortedContents.findIndex(content => content.id === currentContent.id);
  const previousContent = currentIndex > 0 ? sortedContents[currentIndex - 1] : null;
  const nextContent = currentIndex < sortedContents.length - 1 ? sortedContents[currentIndex + 1] : null;

  // Content rating queries
  const { data: contentRating } = useQuery({
    queryKey: [`/api/trails/content/${currentContent.id}/rating`],
  });

  const { data: userRating } = useQuery({
    queryKey: [`/api/trails/content/${currentContent.id}/rating/user`],
    enabled: !!userId,
  });

  // Mutations
  const completeContentMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('User not authenticated');
      return apiRequest(`/api/trails/${trailId}/content/${currentContent.id}/complete`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trails/${trailId}/progress`] });
      onMarkCompleted();
    },
  });

  const rateContentMutation = useMutation({
    mutationFn: async (rating: number) => {
      return apiRequest(`/api/trails/content/${currentContent.id}/rating`, {
        method: 'POST',
        body: JSON.stringify({ rating }),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trails/content/${currentContent.id}/rating`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trails/content/${currentContent.id}/rating/user`] });
    },
  });

  const handleNext = () => {
    if (nextContent) {
      // Auto-mark current content as completed when advancing
      if (!isCompleted && userId) {
        completeContentMutation.mutate();
      }
      onContentSelect(nextContent);
    }
  };

  const handlePrevious = () => {
    if (previousContent) {
      onContentSelect(previousContent);
    }
  };

  const handleMarkCompleted = () => {
    if (userId) {
      completeContentMutation.mutate();
    }
  };

  const handleRating = (rating: number) => {
    rateContentMutation.mutate(rating);
  };

  return (
    <div className="mt-8 pt-6 border-t">
      <div className="flex flex-col gap-6">
        {/* Rating Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium">Avalie este conteúdo</h4>
            <div className="flex items-center gap-4">
              {userId ? (
                <StarRating
                  rating={userRating?.rating || 0}
                  onRatingChange={handleRating}
                  readonly={rateContentMutation.isPending}
                />
              ) : (
                <StarRating
                  rating={contentRating?.average || 0}
                  readonly={true}
                />
              )}
              <div className="text-sm text-muted-foreground">
                {contentRating?.average ? (
                  <>
                    {contentRating.average.toFixed(1)} estrelas
                    <span className="text-xs ml-1">
                      ({contentRating.count} {contentRating.count === 1 ? 'voto' : 'votos'})
                    </span>
                  </>
                ) : (
                  'Sem avaliações ainda'
                )}
              </div>
            </div>
          </div>

          {/* Completion Button */}
          {userId && (
            <Button
              variant={isCompleted ? "secondary" : "outline"}
              size="sm"
              onClick={handleMarkCompleted}
              disabled={isCompleted || completeContentMutation.isPending}
              className="flex items-center gap-2"
            >
              <CheckCircle className={`w-4 h-4 ${isCompleted ? 'text-green-600' : ''}`} />
              {isCompleted ? 'Concluído' : 'Marcar como concluído'}
            </Button>
          )}
        </div>

        <Separator />

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={!previousContent}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {previousContent ? (
              <span className="hidden sm:inline">
                {previousContent.title.length > 30 
                  ? `${previousContent.title.substring(0, 30)}...` 
                  : previousContent.title}
              </span>
            ) : (
              'Anterior'
            )}
          </Button>

          <div className="text-sm text-muted-foreground">
            {currentIndex + 1} de {sortedContents.length}
          </div>

          <Button
            variant="default"
            onClick={handleNext}
            disabled={!nextContent}
            className="flex items-center gap-2"
          >
            {nextContent ? (
              <span className="hidden sm:inline">
                {nextContent.title.length > 30 
                  ? `${nextContent.title.substring(0, 30)}...` 
                  : nextContent.title}
              </span>
            ) : (
              'Próximo'
            )}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}