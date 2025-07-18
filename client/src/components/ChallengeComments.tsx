import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Heart, Reply, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";

interface ChallengeComment {
  id: number;
  challengeId: number;
  userId: number;
  content: string;
  parentId?: number;
  createdAt: string;
  updatedAt: string;
  userName: string;
  userPhotoUrl?: string;
  likeCount: number;
  isLikedByUser: boolean;
  replies: ChallengeComment[];
}

interface ChallengeCommentsProps {
  challengeId: number;
}

export default function ChallengeComments({ challengeId }: ChallengeCommentsProps) {
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyContents, setReplyContents] = useState<{ [key: number]: string }>({});
  const { toast } = useToast();
  const { user } = useUser();
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: [`/api/gamification/challenges/${challengeId}/comments`],
    enabled: !!challengeId,
  });

  const createCommentMutation = useMutation({
    mutationFn: async (data: { content: string; parentId?: number }) => {
      return apiRequest(`/api/gamification/challenges/${challengeId}/comments`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/gamification/challenges/${challengeId}/comments`],
      });
      setNewComment("");
      setReplyContents({});
      setReplyTo(null);
      toast({
        title: "Comentário criado",
        description: "Seu comentário foi adicionado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar o comentário.",
        variant: "destructive",
      });
    },
  });

  const likeCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      return apiRequest(`/api/gamification/comments/${commentId}/like`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/gamification/challenges/${challengeId}/comments`],
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível curtir o comentário.",
        variant: "destructive",
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      return apiRequest(`/api/gamification/comments/${commentId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/gamification/challenges/${challengeId}/comments`],
      });
      toast({
        title: "Comentário deletado",
        description: "O comentário foi removido com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível deletar o comentário.",
        variant: "destructive",
      });
    },
  });

  const handleCreateComment = () => {
    if (!newComment.trim()) return;
    
    createCommentMutation.mutate({
      content: newComment,
    });
  };

  const handleReply = (commentId: number) => {
    const content = replyContents[commentId];
    if (!content?.trim()) return;
    
    createCommentMutation.mutate({
      content: content,
      parentId: commentId,
    });
  };

  const updateReplyContent = (commentId: number, content: string) => {
    setReplyContents(prev => ({
      ...prev,
      [commentId]: content
    }));
  };

  const handleLike = (commentId: number) => {
    likeCommentMutation.mutate(commentId);
  };

  const handleDelete = (commentId: number) => {
    if (window.confirm("Tem certeza que deseja deletar este comentário?")) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const canDeleteComment = (comment: ChallengeComment) => {
    return (
      user?.id === comment.userId ||
      user?.role === "admin" ||
      user?.role === "superadmin"
    );
  };

  const CommentItem = ({ comment }: { comment: ChallengeComment }) => (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Avatar className="h-6 w-6 mt-0.5">
          <AvatarImage src={comment.userPhotoUrl} />
          <AvatarFallback className="text-xs">
            {getInitials(comment.userName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-xs">{comment.userName}</span>
              <span className="text-xs text-gray-500">
                {format(new Date(comment.createdAt), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </span>
            </div>
            <p className="text-sm text-gray-800">{comment.content}</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleLike(comment.id)}
              className={`p-0 h-auto font-normal text-xs ${
                comment.isLikedByUser ? "text-red-500" : "text-gray-500"
              }`}
            >
              <Heart
                className={`h-3 w-3 mr-1 ${
                  comment.isLikedByUser ? "fill-current" : ""
                }`}
              />
              {comment.likeCount > 0 && comment.likeCount}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyTo(comment.id)}
              className="p-0 h-auto font-normal text-xs text-gray-500"
            >
              <Reply className="h-3 w-3 mr-1" />
              Responder
            </Button>
            {canDeleteComment(comment) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(comment.id)}
                className="p-0 h-auto font-normal text-xs text-red-500"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Campo de resposta */}
      {replyTo === comment.id && (
        <div className="ml-8 space-y-2">
          <Textarea
            value={replyContents[comment.id] || ""}
            onChange={(e) => updateReplyContent(comment.id, e.target.value)}
            placeholder="Escreva sua resposta..."
            className="min-h-[60px] text-sm"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleReply(comment.id)}
              disabled={!replyContents[comment.id]?.trim() || createCommentMutation.isPending}
              className="text-xs py-1 px-2 h-auto"
            >
              Responder
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setReplyTo(null);
                updateReplyContent(comment.id, "");
              }}
              className="text-xs py-1 px-2 h-auto"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Respostas */}
      {comment.replies.length > 0 && (
        <div className="ml-8 space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} />
          ))}
        </div>
      )}
    </div>
  );

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Faça login para ver e adicionar comentários</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Comentários
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Novo comentário */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Avatar className="h-6 w-6 mt-0.5">
              <AvatarImage src={user.photoUrl} />
              <AvatarFallback className="text-xs">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escreva um comentário..."
                className="min-h-[60px] text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleCreateComment}
              disabled={!newComment.trim() || createCommentMutation.isPending}
              size="sm"
              className="text-xs py-1 px-3 h-auto"
            >
              {createCommentMutation.isPending ? "Enviando..." : "Comentar"}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Lista de comentários */}
        {isLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-xs text-gray-500">Carregando comentários...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum comentário ainda</p>
            <p className="text-xs">Seja o primeiro a comentar!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment: ChallengeComment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}