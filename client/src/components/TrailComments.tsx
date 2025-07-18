import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageSquare, Send, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { TrailComment } from '@shared/schema';

interface TrailCommentsProps {
  contentId: number;
}

// Componente memoizado para evitar re-renders desnecessários
const CommentItem = React.memo(({ 
  comment, 
  replyTo, 
  replyContents, 
  onSetReplyTo, 
  onUpdateReplyContent, 
  onHandleReply, 
  onHandleLike, 
  onHandleDelete, 
  canDeleteComment, 
  isReplying 
}: {
  comment: TrailComment & { 
    user: any; 
    replies: (TrailComment & { user: any; likeCount: number; isLikedByUser: boolean })[];
    likeCount: number;
    isLikedByUser: boolean;
  };
  replyTo: number | null;
  replyContents: Record<number, string>;
  onSetReplyTo: (id: number | null) => void;
  onUpdateReplyContent: (id: number, content: string) => void;
  onHandleReply: (parentId: number) => void;
  onHandleLike: (commentId: number) => void;
  onHandleDelete: (commentId: number) => void;
  canDeleteComment: (comment: any) => boolean;
  isReplying: boolean;
}) => {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={comment.user?.photoUrl} />
          <AvatarFallback className="text-xs">
            {comment.user?.name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{comment.user?.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ptBR })}
            </span>
          </div>
          
          <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">
            {comment.content}
          </p>
          
          <div className="flex items-center gap-3 text-xs">
            <Button
              variant="ghost"
              size="sm"
              className={`h-auto p-1 ${comment.isLikedByUser ? 'text-red-500' : 'text-gray-500'}`}
              onClick={() => onHandleLike(comment.id)}
            >
              <Heart className={`w-3 h-3 mr-1 ${comment.isLikedByUser ? 'fill-current' : ''}`} />
              {comment.likeCount}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-gray-500"
              onClick={() => onSetReplyTo(isReplying ? null : comment.id)}
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              Responder
            </Button>
            
            {canDeleteComment(comment) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1 text-red-500 hover:text-red-700"
                onClick={() => onHandleDelete(comment.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
          
          {isReplying && (
            <div className="mt-3 space-y-2">
              <Textarea
                placeholder="Escreva sua resposta..."
                value={replyContents[comment.id] || ''}
                onChange={(e) => onUpdateReplyContent(comment.id, e.target.value)}
                rows={2}
                className="text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onHandleReply(comment.id)}
                  disabled={!replyContents[comment.id]?.trim()}
                >
                  <Send className="w-3 h-3 mr-1" />
                  Responder
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSetReplyTo(null)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-11 space-y-3 pl-3 border-l-2 border-gray-100">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              replyTo={replyTo}
              replyContents={replyContents}
              onSetReplyTo={onSetReplyTo}
              onUpdateReplyContent={onUpdateReplyContent}
              onHandleReply={onHandleReply}
              onHandleLike={onHandleLike}
              onHandleDelete={onHandleDelete}
              canDeleteComment={canDeleteComment}
              isReplying={replyTo === reply.id}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default function TrailComments({ contentId }: TrailCommentsProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyContents, setReplyContents] = useState<Record<number, string>>({});

  const { data: comments = [], isLoading } = useQuery<TrailComment[]>({
    queryKey: [`/api/trails/content/${contentId}/comments`],
    enabled: !!contentId,
  });

  const createCommentMutation = useMutation({
    mutationFn: async (commentData: { content: string; parentId?: number }) => {
      return await apiRequest(`/api/trails/content/${contentId}/comments`, {
        method: 'POST',
        body: commentData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trails/content/${contentId}/comments`] });
      setNewComment('');
      setReplyTo(null);
      setReplyContents({});
      toast({
        title: "Sucesso",
        description: "Comentário adicionado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao adicionar comentário. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const likeCommentMutation = useMutation({
    mutationFn: async ({ commentId, isLiked }: { commentId: number; isLiked: boolean }) => {
      if (isLiked) {
        return await apiRequest(`/api/trails/comments/${commentId}/like`, {
          method: 'DELETE',
        });
      } else {
        return await apiRequest(`/api/trails/comments/${commentId}/like`, {
          method: 'POST',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trails/content/${contentId}/comments`] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao curtir comentário. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      return await apiRequest(`/api/trails/comments/${commentId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trails/content/${contentId}/comments`] });
      toast({
        title: "Sucesso",
        description: "Comentário removido com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao remover comentário. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSetReplyTo = useCallback((id: number | null) => {
    setReplyTo(id);
  }, []);

  const updateReplyContent = useCallback((id: number, content: string) => {
    setReplyContents(prev => ({ ...prev, [id]: content }));
  }, []);

  const handleComment = useCallback(() => {
    if (!newComment.trim()) return;
    createCommentMutation.mutate({ content: newComment.trim() });
  }, [newComment, createCommentMutation]);

  const handleReply = useCallback((parentId: number) => {
    const content = replyContents[parentId];
    if (!content?.trim()) return;
    createCommentMutation.mutate({ content: content.trim(), parentId });
  }, [replyContents, createCommentMutation]);

  const handleLike = useCallback((commentId: number) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;
    
    likeCommentMutation.mutate({ 
      commentId, 
      isLiked: comment.isLikedByUser 
    });
  }, [comments, likeCommentMutation]);

  const handleDelete = useCallback((commentId: number) => {
    if (window.confirm('Tem certeza que deseja excluir este comentário?')) {
      deleteCommentMutation.mutate(commentId);
    }
  }, [deleteCommentMutation]);

  const canDeleteComment = useCallback((comment: any) => {
    return user && (
      user.role === 'admin' || 
      user.role === 'superadmin' || 
      comment.userId === user.id
    );
  }, [user]);

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comentários</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            Faça login para ver e adicionar comentários
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comentários</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/4" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Comentários ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Novo comentário */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={user.photoUrl} />
              <AvatarFallback className="text-xs">
                {user.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder="Adicione um comentário..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button
              onClick={handleComment}
              disabled={!newComment.trim() || createCommentMutation.isPending}
              size="sm"
            >
              <Send className="w-4 h-4 mr-2" />
              {createCommentMutation.isPending ? 'Enviando...' : 'Comentar'}
            </Button>
          </div>
        </div>

        {/* Lista de comentários */}
        {comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhum comentário ainda</p>
            <p className="text-xs">Seja o primeiro a comentar!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment: TrailComment) => (
              <CommentItem 
                key={comment.id} 
                comment={comment}
                replyTo={replyTo}
                replyContents={replyContents}
                onSetReplyTo={handleSetReplyTo}
                onUpdateReplyContent={updateReplyContent}
                onHandleReply={handleReply}
                onHandleLike={handleLike}
                onHandleDelete={handleDelete}
                canDeleteComment={canDeleteComment}
                isReplying={replyTo === comment.id}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}