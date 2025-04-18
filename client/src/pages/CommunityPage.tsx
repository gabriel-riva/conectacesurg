import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
// Removemos o uso de Tabs para o novo layout
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Header } from '@/components/Header';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ArrowUp, ImageIcon, FileTextIcon, FilmIcon, LinkIcon, FileIcon, Send, Search, MessageCircle, ThumbsUp, UserPlus, Users, Globe, Lock, LogOut, MessageSquare, X, PlusCircle, Bell, Camera, FileText, ListTodo, LayoutGrid, Plus, AlertTriangle, User as UserIcon } from 'lucide-react';
import type { Post, Comment, Group, Message, Conversation } from '@shared/schema';
import type { User as UserType } from '@shared/schema';
import { format } from 'date-fns';

// Schemas dos formulários
const postFormSchema = z.object({
  content: z.string().min(1, { message: 'O conteúdo da publicação é obrigatório' }),
  groupId: z.number().optional(),
});

const commentFormSchema = z.object({
  content: z.string().min(1, { message: 'O conteúdo do comentário é obrigatório' }),
});

const searchFormSchema = z.object({
  query: z.string().min(1, { message: 'Digite algo para pesquisar' }),
});

const groupFormSchema = z.object({
  name: z.string().min(3, { message: 'O nome do grupo deve ter pelo menos 3 caracteres' }),
  description: z.string().optional(),
  isPrivate: z.boolean().default(false),
  requiresApproval: z.boolean().default(false),
  imageUrl: z.string().optional(),
});

const messageFormSchema = z.object({
  content: z.string().min(1, { message: 'A mensagem é obrigatória' }),
});

// Type definitions for form values
type PostFormValues = z.infer<typeof postFormSchema>;
type CommentFormValues = z.infer<typeof commentFormSchema>;
type SearchFormValues = z.infer<typeof searchFormSchema>;
type GroupFormValues = z.infer<typeof groupFormSchema>;
type MessageFormValues = z.infer<typeof messageFormSchema>;

export default function CommunityPage() {
  const { user } = useAuth();
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Post[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [activeConversation, setActiveConversation] = useState<number | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showMessagesPanel, setShowMessagesPanel] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState<number | null>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Group management
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [groupImageFile, setGroupImageFile] = useState<File | null>(null);
  const groupImageInputRef = useRef<HTMLInputElement>(null);
  const [organizationTab, setOrganizationTab] = useState<'posts' | 'documents' | 'tasks' | 'kanban'>('posts');
  const [showAllGroups, setShowAllGroups] = useState(false);
  
  // Buscar todos os usuários para o modal de adicionar membros
  const { data: allUsers = [], isLoading: isLoadingUsers } = useQuery<UserType[]>({
    queryKey: ['/api/auth/dev-user-list'],
    enabled: true,
  });
  
  // Estado para filtrar usuários na pesquisa do modal de adicionar membros
  const [userSearchQuery, setUserSearchQuery] = useState('');
  
  // Filtrar usuários com base na pesquisa
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return allUsers;
    
    const query = userSearchQuery.toLowerCase();
    return allUsers.filter(user => 
      user.name?.toLowerCase().includes(query) || 
      user.email?.toLowerCase().includes(query)
    );
  }, [allUsers, userSearchQuery]);

  // Forms
  const postForm = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      content: '',
      groupId: undefined,
    },
  });

  const commentForm = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: {
      content: '',
    },
  });

  const searchForm = useForm<SearchFormValues>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: {
      query: '',
    },
  });

  const groupForm = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: '',
      description: '',
      isPrivate: false,
      requiresApproval: false,
    },
  });

  const messageForm = useForm<MessageFormValues>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      content: '',
    },
  });

  // Get all posts (feed + groups user is in)
  const { data: posts = [], isLoading: isLoadingPosts } = useQuery<Post[]>({
    queryKey: ['/api/community/posts'],
  });

  // Get user groups
  const { data: userGroups = [], isLoading: isLoadingGroups } = useQuery<Group[]>({
    queryKey: ['/api/community/groups/user'],
  });

  // Get admin groups
  const { data: adminGroups = [] } = useQuery<Group[]>({
    queryKey: ['/api/community/groups/admin'],
  });

  // Get conversations
  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery<Conversation[]>({
    queryKey: ['/api/community/conversations'],
  });
  
  // Get pending group invites
  const { data: pendingInvites = [], isLoading: isLoadingInvites } = useQuery<any[]>({
    queryKey: ['/api/community/group-invites'],
  });
  
  // Get group members for the active dialog
  const [activeGroupForMembers, setActiveGroupForMembers] = useState<number | null>(null);
  const { data: groupMembers = [], isLoading: isLoadingGroupMembers } = useQuery<UserType[]>({
    queryKey: ['/api/community/groups', activeGroupForMembers, 'members'],
    enabled: activeGroupForMembers !== null,
    queryFn: async () => {
      if (activeGroupForMembers === null) return [];
      return await apiRequest('GET', `/api/community/groups/${activeGroupForMembers}/members`);
    }
  });

  // Get messages for active conversation
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: ['/api/community/messages', activeConversation],
    enabled: activeConversation !== null,
  });

  // Mutations
  const createPostMutation = useMutation({
    mutationFn: async (formData: PostFormValues & { mediaUrls?: string[], mediaTypes?: string[] }) => {
      const formDataWithMedia = new FormData();
      formDataWithMedia.append('content', formData.content);
      
      if (formData.groupId) {
        formDataWithMedia.append('groupId', formData.groupId.toString());
      }
      
      if (mediaFiles.length > 0) {
        mediaFiles.forEach((file, index) => {
          formDataWithMedia.append('media', file);
        });
      }
      
      // Para FormData, não podemos usar apiRequest pois ela aplica JSON.stringify
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        body: formDataWithMedia,
        credentials: 'include'
      });
      
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text || res.statusText}`);
      }
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/community/posts'] });
      postForm.reset();
      setMediaFiles([]);
      setMediaType(null);
      toast({
        title: 'Publicação criada',
        description: 'Sua publicação foi enviada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao criar a publicação. Por favor, tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: number; content: string }) => {
      return await apiRequest('POST', `/api/community/posts/${postId}/comments`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/community/posts'] });
      commentForm.reset();
      toast({
        title: 'Comment added',
        description: 'Your comment has been added successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao adicionar comentário. Por favor, tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async (formData: GroupFormValues) => {
      // Se temos imagem, precisamos usar FormData para upload
      if (groupImageFile) {
        const formDataWithImage = new FormData();
        console.log("Enviando dados de grupo com FormData:", {
          name: formData.name,
          description: formData.description,
          isPrivate: formData.isPrivate,
          requiresApproval: formData.requiresApproval
        });
        
        formDataWithImage.append('name', formData.name);
        
        if (formData.description) {
          formDataWithImage.append('description', formData.description);
        }
        
        formDataWithImage.append('isPrivate', formData.isPrivate ? 'true' : 'false');
        formDataWithImage.append('requiresApproval', formData.requiresApproval ? 'true' : 'false');
        formDataWithImage.append('image', groupImageFile);
        
        // Para FormData, não podemos usar apiRequest
        const res = await fetch('/api/community/groups', {
          method: 'POST',
          body: formDataWithImage,
          credentials: 'include'
        });
        
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`${res.status}: ${text || res.statusText}`);
        }
        
        return await res.json();
      } else {
        // Sem imagem, usamos o apiRequest padrão
        return await apiRequest('POST', '/api/community/groups', formData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/community/groups/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/community/groups/admin'] });
      groupForm.reset();
      setGroupImageFile(null);
      setCreateGroupOpen(false);
      toast({
        title: 'Grupo criado',
        description: 'Seu grupo foi criado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao criar o grupo. Por favor, tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ receiverId, content }: { receiverId: number; content: string }) => {
      return await apiRequest('POST', '/api/community/messages', { receiverId, content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/community/messages', activeConversation] });
      queryClient.invalidateQueries({ queryKey: ['/api/community/conversations'] });
      messageForm.reset();
      toast({
        title: 'Mensagem enviada',
        description: 'Sua mensagem foi enviada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao enviar mensagem. Por favor, tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const likeMutation = useMutation({
    mutationFn: async ({ postId }: { postId: number }) => {
      return await apiRequest('POST', `/api/community/posts/${postId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/community/posts'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao curtir a publicação. Por favor, tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const joinGroupMutation = useMutation({
    mutationFn: async ({ groupId }: { groupId: number }) => {
      return await apiRequest('POST', `/api/community/groups/${groupId}/join`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/community/groups/user'] });
      toast({
        title: 'Entrou no grupo',
        description: 'Você entrou no grupo com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao entrar no grupo. Por favor, tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      setIsSearching(true);
      return await apiRequest('GET', `/api/community/search?q=${encodeURIComponent(query)}`);
    },
    onSuccess: (data) => {
      setSearchResults(data);
      setIsSearching(false);
      setShowSearchResults(true);
    },
    onError: (error: any) => {
      setIsSearching(false);
      toast({
        title: 'Erro',
        description: error.message || 'Falha na pesquisa. Por favor, tente novamente.',
        variant: 'destructive',
      });
    },
  });

  // Mutation para aceitar convite de grupo
  const acceptInviteMutation = useMutation({
    mutationFn: async (groupId: number) => {
      return await apiRequest('POST', `/api/community/group-invites/${groupId}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/community/group-invites'] });
      queryClient.invalidateQueries({ queryKey: ['/api/community/groups/user'] });
      toast({
        title: 'Convite aceito',
        description: 'Você agora é membro do grupo.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao aceitar o convite. Por favor, tente novamente.',
        variant: 'destructive',
      });
    },
  });

  // Mutation para recusar convite de grupo
  const rejectInviteMutation = useMutation({
    mutationFn: async (groupId: number) => {
      return await apiRequest('POST', `/api/community/group-invites/${groupId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/community/group-invites'] });
      toast({
        title: 'Convite recusado',
        description: 'O convite foi recusado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao recusar o convite. Por favor, tente novamente.',
        variant: 'destructive',
      });
    },
  });
  
  // Mutation para convidar usuário para grupo
  const inviteUserMutation = useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: number; userId: number }) => {
      return await apiRequest('POST', `/api/community/groups/${groupId}/invite`, { userId });
    },
    onSuccess: () => {
      // Limpar a pesquisa após sucesso no convite
      setUserSearchQuery('');
      // Resetar o ID do usuário sendo convidado
      setInvitingUserId(null);
      
      toast({
        title: 'Convite enviado',
        description: 'O convite foi enviado com sucesso.',
      });
    },
    onError: (error: any) => {
      // Resetar o ID do usuário sendo convidado em caso de erro também
      setInvitingUserId(null);
      
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao enviar o convite. Por favor, tente novamente.',
        variant: 'destructive',
      });
    },
  });

  // Scroll to bottom of messages when new ones arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle post submission
  const onPostSubmit = (values: PostFormValues) => {
    createPostMutation.mutate({
      ...values,
      ...(selectedGroupId && { groupId: selectedGroupId }),
    });
  };

  // Handle comment submission
  const onCommentSubmit = (postId: number) => {
    const values = commentForm.getValues();
    createCommentMutation.mutate({ postId, content: values.content });
  };

  // Handle group creation submission
  const onGroupSubmit = (values: GroupFormValues) => {
    createGroupMutation.mutate(values);
  };

  // Handle message submission
  const onMessageSubmit = (values: MessageFormValues) => {
    if (!activeConversation) return;
    
    const otherUser = conversations.find(c => c.id === activeConversation);
    if (!otherUser) return;
    
    const receiverId = user?.id === otherUser.user1Id ? otherUser.user2Id : otherUser.user1Id;
    
    sendMessageMutation.mutate({
      receiverId,
      content: values.content,
    });
  };

  // Handle search submission
  const onSearchSubmit = (values: SearchFormValues) => {
    searchMutation.mutate(values.query);
  };

  // Handle media upload
  const handleMediaUpload = (type: string) => {
    setMediaType(type);
    if (mediaInputRef.current) {
      mediaInputRef.current.click();
    }
  };
  
  // Handle group image upload
  const handleGroupImageUpload = () => {
    if (groupImageInputRef.current) {
      groupImageInputRef.current.click();
    }
  };
  
  // Handle group image selection
  const handleGroupImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setGroupImageFile(e.target.files[0]);
    }
  };

  // Handle media selection
  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setMediaFiles(Array.from(e.target.files));
    }
  };

  // Remove media
  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    if (mediaFiles.length <= 1) {
      setMediaType(null);
    }
  };

  // Get other user in conversation
  const getOtherUser = (conversation: Conversation): string => {
    const otherUserId = user?.id === conversation.user1Id ? conversation.user2Id : conversation.user1Id;
    // In a real app, you would fetch user details, but for now we'll use placeholder
    return `User ${otherUserId}`;
  };

  // Format time
  const formatTime = (date: Date | string) => {
    return format(new Date(date), 'HH:mm');
  };
  
  // Format date
  const formatDate = (date: Date | string) => {
    return format(new Date(date), 'dd MMM yyyy');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Header />
      
      <div className="container mx-auto px-4 py-6 flex-1 flex">
        {/* Left sidebar - Messages section */}
        <div className="w-80 min-w-80 space-y-6 mr-4">
          {/* Messages tab button */}
          <button 
            className={`w-full p-3 rounded-lg bg-white shadow flex items-center justify-center font-medium ${showMessagesPanel ? 'bg-primary text-white' : ''}`}
            onClick={() => setShowMessagesPanel(!showMessagesPanel)}
          >
            <MessageSquare className="h-5 w-5 mr-2" />
            Mensagens
          </button>
          
          {/* Messages panel */}
          {showMessagesPanel && (
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Mensagens</h3>
              {isLoadingConversations ? (
                <div className="text-center py-6">Carregando mensagens...</div>
              ) : (
                <>
                  {activeConversation === null ? (
                    <>
                      {conversations.length === 0 ? (
                        <div className="text-center py-6 text-gray-500">
                          Nenhuma conversa ainda.
                        </div>
                      ) : (
                        <ScrollArea className="h-[calc(100vh-300px)]">
                          <div className="space-y-2">
                            {conversations.map((conversation) => (
                              <div 
                                key={conversation.id}
                                className="flex items-center p-2 rounded-md cursor-pointer hover:bg-gray-100"
                                onClick={() => setActiveConversation(conversation.id)}
                              >
                                <Avatar className="h-10 w-10 mr-3">
                                  <div className="bg-primary text-white h-full w-full flex items-center justify-center">
                                    {getOtherUser(conversation).charAt(0)}
                                  </div>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium">{getOtherUser(conversation)}</div>
                                  <div className="text-xs text-gray-500 truncate">
                                    {conversation.lastMessageText || 'Iniciar uma conversa'}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-400">
                                  {conversation.lastMessageAt ? formatTime(conversation.lastMessageAt) : ''}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col h-[calc(100vh-300px)]">
                      <div className="flex items-center p-2 border-b">
                        <button 
                          className="mr-2 text-gray-500" 
                          onClick={() => setActiveConversation(null)}
                        >
                          <ArrowUp className="h-4 w-4 transform -rotate-90" />
                        </button>
                        <div className="font-medium flex-1">
                          {conversations.find(c => c.id === activeConversation) 
                            ? getOtherUser(conversations.find(c => c.id === activeConversation)!)
                            : 'Conversa'}
                        </div>
                      </div>
                      
                      <ScrollArea className="flex-1 p-2">
                        <div className="space-y-2">
                          {isLoadingMessages ? (
                            <div className="text-center py-6">Carregando mensagens...</div>
                          ) : messages.length === 0 ? (
                            <div className="text-center py-6 text-gray-500">
                              Nenhuma mensagem ainda. Inicie uma conversa!
                            </div>
                          ) : (
                            <>
                              {messages.map((message) => (
                                <div 
                                  key={message.id}
                                  className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div 
                                    className={`max-w-[80%] p-3 rounded-lg ${
                                      message.senderId === user?.id 
                                        ? 'bg-primary text-white' 
                                        : 'bg-gray-100'
                                    }`}
                                  >
                                    <div className="text-sm">{message.content}</div>
                                    <div className={`text-xs mt-1 ${
                                      message.senderId === user?.id 
                                        ? 'text-white/70' 
                                        : 'text-gray-500'
                                    }`}>
                                      {formatTime(message.createdAt)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                              <div ref={messagesEndRef} />
                            </>
                          )}
                        </div>
                      </ScrollArea>
                      
                      <div className="p-2 border-t mt-auto">
                        <Form {...messageForm}>
                          <form onSubmit={messageForm.handleSubmit(onMessageSubmit)} className="flex items-center">
                            <FormField
                              control={messageForm.control}
                              name="content"
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Digite uma mensagem..."
                                      className="rounded-full"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <Button type="submit" size="icon" className="ml-2" disabled={sendMessageMutation.isPending}>
                              <Send className="h-4 w-4" />
                            </Button>
                          </form>
                        </Form>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Card>
          )}
        </div>
        
        {/* Main content area */}
        <div className="flex-1 space-y-6 mr-4">
          {/* Search bar */}
          <div className="bg-white rounded-lg shadow p-4">
            <Form {...searchForm}>
              <form onSubmit={searchForm.handleSubmit(onSearchSubmit)} className="flex items-center">
                <FormField
                  control={searchForm.control}
                  name="query"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            {...field}
                            placeholder="Pesquisar publicações e discussões..."
                            className="pl-10"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" variant="default" className="ml-2" disabled={isSearching}>
                  {isSearching ? 'Pesquisando...' : 'Pesquisar'}
                </Button>
              </form>
            </Form>
          </div>
          
          {/* Post creation */}
          <Card className="p-4">
            <Form {...postForm}>
              <form onSubmit={postForm.handleSubmit(onPostSubmit)} className="space-y-4">
                <FormField
                  control={postForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="O que você está pensando?"
                          className="min-h-[100px] resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Media preview */}
                {mediaFiles.length > 0 && (
                  <div className="border rounded-md p-3 bg-gray-50">
                    <div className="text-sm font-medium mb-2">Mídia ({mediaFiles.length}):</div>
                    <div className="flex flex-wrap gap-2">
                      {mediaFiles.map((file, index) => (
                        <div key={index} className="relative">
                          <div className="bg-gray-200 rounded-md p-2 flex items-center max-w-[200px]">
                            {file.type.startsWith('image/') ? (
                              <img 
                                src={URL.createObjectURL(file)} 
                                alt="preview" 
                                className="h-12 w-12 object-cover rounded-md"
                              />
                            ) : (
                              <FileIcon className="h-12 w-12 text-gray-500" />
                            )}
                            <div className="ml-2 text-xs overflow-hidden">
                              <div className="truncate font-medium">{file.name}</div>
                              <div className="text-gray-500">{(file.size / 1024).toFixed(1)} KB</div>
                            </div>
                            <button 
                              type="button"
                              onClick={() => removeMedia(index)}
                              className="ml-2 text-gray-500 hover:text-red-500"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between border-t pt-3">
                  <div className="flex space-x-2">
                    <button 
                      type="button" 
                      onClick={() => handleMediaUpload('image')}
                      className="text-gray-500 hover:text-primary flex items-center"
                    >
                      <ImageIcon className="h-5 w-5 mr-1" />
                      <span className="text-sm">Imagem</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleMediaUpload('video')}
                      className="text-gray-500 hover:text-primary flex items-center"
                    >
                      <FilmIcon className="h-5 w-5 mr-1" />
                      <span className="text-sm">Vídeo</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleMediaUpload('document')}
                      className="text-gray-500 hover:text-primary flex items-center"
                    >
                      <FileTextIcon className="h-5 w-5 mr-1" />
                      <span className="text-sm">Documento</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleMediaUpload('link')}
                      className="text-gray-500 hover:text-primary flex items-center"
                    >
                      <LinkIcon className="h-5 w-5 mr-1" />
                      <span className="text-sm">Link</span>
                    </button>
                  </div>
                  
                  <div className="flex items-center">
                    {selectedGroupId ? (
                      <Badge variant="outline" className="mr-2">
                        {userGroups.find(g => g.id === selectedGroupId)?.name || 'Grupo'}
                      </Badge>
                    ) : null}
                    <Button type="submit" disabled={createPostMutation.isPending}>
                      {createPostMutation.isPending ? 'Publicando...' : 'Publicar'}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
            
            {/* Hidden file input */}
            <input
              type="file"
              ref={mediaInputRef}
              onChange={handleMediaChange}
              className="hidden"
              multiple={mediaType === 'image'}
              accept={
                mediaType === 'image'
                  ? 'image/*'
                  : mediaType === 'video'
                  ? 'video/*'
                  : mediaType === 'document'
                  ? '.pdf,.doc,.docx,.txt'
                  : undefined
              }
            />
          </Card>
          
          {/* Cabeçalho do grupo selecionado */}
          {selectedGroupId && (
            <div className="bg-white rounded-lg p-4 mb-4 shadow-sm flex items-center">
              <div className="w-12 h-12 rounded-full overflow-hidden mr-3 flex items-center justify-center">
                {userGroups.find(g => g.id === selectedGroupId)?.imageUrl ? (
                  <img 
                    src={userGroups.find(g => g.id === selectedGroupId)?.imageUrl || ''} 
                    alt="Imagem do grupo" 
                    className="h-full w-full object-cover" 
                  />
                ) : (
                  <div className="bg-green-100 w-full h-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-secondary" />
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  {userGroups.find(g => g.id === selectedGroupId)?.name}
                </h2>
                <p className="text-sm text-gray-500">
                  {userGroups.find(g => g.id === selectedGroupId)?.description || 'Sem descrição'}
                </p>
              </div>
            </div>
          )}
          
          {/* Feed content */}
          <div className="space-y-4">
            {isLoadingPosts ? (
              <div className="text-center py-10">Carregando publicações...</div>
            ) : posts.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                Nenhuma publicação ainda. Seja o primeiro a publicar!
              </div>
            ) : (
              posts
                .filter(post => selectedGroupId === null || post.groupId === selectedGroupId)
                .map((post) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    onCommentSubmit={onCommentSubmit}
                    commentForm={commentForm}
                    onLike={() => likeMutation.mutate({ postId: post.id })}
                  />
                ))
            )}
          </div>
          
          {/* Search Results Dialog */}
          <Dialog open={showSearchResults} onOpenChange={setShowSearchResults}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Resultados da Pesquisa: {searchForm.getValues().query}</DialogTitle>
                <DialogDescription>
                  Encontrados {searchResults.length} resultados para sua pesquisa.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {isSearching ? (
                  <div className="text-center py-10">Pesquisando...</div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    Nenhum resultado encontrado. Tente um termo de pesquisa diferente.
                  </div>
                ) : (
                  searchResults.map((post) => (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      onCommentSubmit={onCommentSubmit}
                      commentForm={commentForm}
                      onLike={() => likeMutation.mutate({ postId: post.id })}
                      highlightSearch={searchForm.getValues().query}
                    />
                  ))
                )}
              </div>
              
              <DialogFooter>
                <Button onClick={() => setShowSearchResults(false)}>Fechar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Right sidebar - Groups section */}
        <div className="w-80 min-w-80 space-y-6">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Meus Grupos</h3>
              <Button variant="ghost" size="sm" onClick={() => setCreateGroupOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Criar
              </Button>
            </div>
            
            {/* Convites pendentes */}
            {pendingInvites.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Convites pendentes</h4>
                <div className="space-y-2">
                  {pendingInvites.map(invite => (
                    <div key={invite.id} className="p-2 rounded-md bg-gray-50 border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-2">
                            {invite.imageUrl ? (
                              <img src={invite.imageUrl} alt={invite.name} className="w-full h-full object-cover rounded-full" />
                            ) : (
                              <Users className="h-4 w-4 text-gray-500" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{invite.name}</p>
                            <p className="text-xs text-gray-500">Convite de {invite.invitedBy}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-xs"
                            onClick={() => rejectInviteMutation.mutate(invite.id)}
                            disabled={rejectInviteMutation.isPending}
                          >
                            Recusar
                          </Button>
                          <Button 
                            size="sm" 
                            className="h-7 text-xs bg-green-600 hover:bg-green-700"
                            onClick={() => acceptInviteMutation.mutate(invite.id)}
                            disabled={acceptInviteMutation.isPending}
                          >
                            Aceitar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t my-4"></div>
              </div>
            )}

            {pendingInvites.length === 0 && (
              <div className="border-t my-4"></div>
            )}
            
            {isLoadingGroups ? (
              <div className="text-center py-6">Carregando grupos...</div>
            ) : userGroups.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                Você ainda não está em nenhum grupo.
              </div>
            ) : (
              <div className={userGroups.length > 8 ? "h-[400px]" : ""}>
                <div className="space-y-1">
                  <div 
                    className={`flex items-center p-2 rounded-md cursor-pointer hover:bg-gray-100 ${selectedGroupId === null ? 'bg-gray-100' : ''}`}
                    onClick={() => {
                      setSelectedGroupId(null);
                      postForm.setValue('groupId', undefined);
                      setOrganizationTab('posts');
                    }}
                  >
                    <Avatar className="h-7 w-7 mr-2">
                      <Globe className="h-4 w-4 text-primary" />
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Feed Geral</div>
                    </div>
                  </div>
                  
                  {userGroups.slice(0, showAllGroups ? undefined : 8).map((group) => {
                    const isAdmin = adminGroups.some(g => g.id === group.id);
                    return (
                      <div 
                        key={group.id}
                        className={`flex items-center p-2 rounded-md ${selectedGroupId === group.id ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                      >
                        <div 
                          className="flex items-center flex-1 cursor-pointer"
                          onClick={() => {
                            setSelectedGroupId(group.id);
                            postForm.setValue('groupId', group.id);
                            setOrganizationTab('posts');
                          }}
                        >
                          <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center mr-2">
                            {group.imageUrl ? (
                              <img 
                                src={group.imageUrl} 
                                alt={group.name} 
                                className="h-full w-full object-cover" 
                              />
                            ) : group.isPrivate ? (
                              <div className="bg-gray-200 w-full h-full flex items-center justify-center">
                                <Lock className="h-4 w-4 text-gray-500" />
                              </div>
                            ) : (
                              <div className="bg-green-100 w-full h-full flex items-center justify-center">
                                <Users className="h-4 w-4 text-secondary" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <span className="text-sm font-medium">{group.name}</span>
                          </div>
                        </div>
                        
                        {/* Botão para sair do grupo */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 mr-1" 
                              onClick={(e) => e.stopPropagation()}
                              title="Sair do grupo"
                            >
                              <LogOut className="h-3.5 w-3.5 text-gray-500" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Sair do Grupo</DialogTitle>
                              <DialogDescription>
                                Você tem certeza que deseja sair do grupo "{group.name}"?
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                              {isAdmin && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 mb-4">
                                  <AlertTriangle className="h-4 w-4 inline-block mr-2" />
                                  Você é administrador deste grupo. Se sair, perderá acesso às configurações administrativas.
                                </div>
                              )}
                              <p>Ao sair do grupo, você não terá mais acesso ao conteúdo compartilhado. Esta ação não pode ser desfeita.</p>
                            </div>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="outline">Cancelar</Button>
                              </DialogClose>
                              <Button 
                                variant="destructive"
                                onClick={() => {
                                  // Aqui seria a chamada para a API para remover o usuário do grupo
                                  toast({
                                    title: "Grupo abandonado",
                                    description: `Você saiu do grupo "${group.name}"`,
                                    duration: 5000,
                                  });
                                }}
                              >
                                Sair do grupo
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        {isAdmin && (
                          <div className="flex items-center space-x-1">
                            <Badge variant="outline" className="bg-secondary/10 text-secondary text-xs">
                              Admin
                            </Badge>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {
                                  e.stopPropagation(); // Impede que o clique propague para o elemento pai
                                }}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                  </svg>
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Gerenciar Grupo</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-2">
                                  <div className="flex flex-col items-center mb-4">
                                    <div 
                                      className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden mb-2 cursor-pointer"
                                      onClick={handleGroupImageUpload}
                                    >
                                      {groupImageFile ? (
                                        <img 
                                          src={URL.createObjectURL(groupImageFile)} 
                                          alt="Preview" 
                                          className="w-full h-full object-cover"
                                        />
                                      ) : group.imageUrl ? (
                                        <img 
                                          src={group.imageUrl} 
                                          alt={group.name} 
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <Camera className="h-8 w-8 text-gray-400" />
                                      )}
                                    </div>
                                    <Button 
                                      type="button" 
                                      variant="outline" 
                                      size="sm"
                                      onClick={handleGroupImageUpload}
                                    >
                                      Alterar imagem
                                    </Button>
                                  </div>
                                  
                                  <div className="space-y-3">
                                    <div>
                                      <label className="block text-sm font-medium mb-1">Nome do grupo</label>
                                      <Input defaultValue={group.name} />
                                    </div>
                                    
                                    <div>
                                      <label className="block text-sm font-medium mb-1">Descrição</label>
                                      <Textarea defaultValue={group.description || ''} />
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-2 border-t pt-4 mt-4">
                                    <h4 className="font-medium">Opções de administrador</h4>
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" className="w-full justify-start">
                                          <UserPlus className="h-4 w-4 mr-2" />
                                          Gerenciar membros
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="sm:max-w-md">
                                        <DialogHeader>
                                          <DialogTitle>Gerenciar Membros</DialogTitle>
                                          <DialogDescription>
                                            Gerencie os membros do grupo "{group.name}".
                                          </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                          <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-sm font-medium">Membros do Grupo</h3>
                                            <Dialog>
                                              <DialogTrigger asChild>
                                                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedGroupId(group.id)}>
                                                  <UserPlus className="h-3 w-3 mr-1" />
                                                  Adicionar
                                                </Button>
                                              </DialogTrigger>
                                              <DialogContent className="sm:max-w-md">
                                                <DialogHeader>
                                                  <DialogTitle>Adicionar Membros</DialogTitle>
                                                  <DialogDescription>
                                                    Selecione os usuários que deseja adicionar ao grupo {group.name}.
                                                  </DialogDescription>
                                                </DialogHeader>
                                                <div className="py-4">
                                                  <div className="mb-4">
                                                    <Input
                                                      placeholder="Pesquisar usuários..."
                                                      className="mb-2"
                                                      value={userSearchQuery}
                                                      onChange={(e) => setUserSearchQuery(e.target.value)}
                                                    />
                                                  </div>
                                                  <div className="border rounded-md max-h-60 overflow-y-auto">
                                                    {isLoadingUsers && (
                                                      <div className="text-center py-4">Carregando usuários...</div>
                                                    )} 
                                                    {!isLoadingUsers && filteredUsers.length === 0 && (
                                                      <div className="text-center py-4 text-gray-500">Nenhum usuário encontrado</div>
                                                    )}
                                                    {!isLoadingUsers && filteredUsers.length > 0 && filteredUsers.map(user => (
                                                      <div key={user.id} className="flex items-center justify-between p-2 border-b hover:bg-gray-50">
                                                        <div className="flex items-center">
                                                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                                                            <UserIcon className="h-4 w-4 text-primary" />
                                                          </div>
                                                          <div>
                                                            <div className="text-sm font-medium">{user.name}</div>
                                                            <div className="text-xs text-muted-foreground">{user.email}</div>
                                                          </div>
                                                        </div>
                                                        <Button 
                                                          variant="outline" 
                                                          size="sm" 
                                                          onClick={() => {
                                                            if (selectedGroupId) {
                                                              setInvitingUserId(user.id);
                                                              inviteUserMutation.mutate({ 
                                                                groupId: selectedGroupId, 
                                                                userId: user.id 
                                                              });
                                                            } else {
                                                              toast({
                                                                title: "Erro",
                                                                description: "Selecione um grupo primeiro",
                                                                variant: "destructive"
                                                              });
                                                            }
                                                          }}
                                                          disabled={inviteUserMutation.isPending && invitingUserId === user.id}
                                                        >
                                                          {inviteUserMutation.isPending && invitingUserId === user.id ? "Enviando..." : "Convidar"}
                                                        </Button>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                                <DialogFooter>
                                                  <DialogClose asChild>
                                                    <Button variant="outline">Fechar</Button>
                                                  </DialogClose>
                                                </DialogFooter>
                                              </DialogContent>
                                            </Dialog>
                                          </div>
                                          
                                          <div className="border rounded-md">
                                            <div className="p-3 flex items-center justify-between border-b">
                                              <div className="flex items-center">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                                                  <UserIcon className="h-4 w-4 text-primary" />
                                                </div>
                                                <div>
                                                  <div className="text-sm font-medium">Você</div>
                                                  <div className="text-xs text-muted-foreground">Administrador</div>
                                                </div>
                                              </div>
                                            </div>
                                            
                                            <div className="p-4 text-center text-sm text-muted-foreground">
                                              Nenhum outro membro no grupo ainda.
                                            </div>
                                          </div>
                                          
                                          <div className="mt-4">
                                            <h3 className="text-sm font-medium mb-2">Solicitações Pendentes</h3>
                                            <div className="border rounded-md p-4 text-center text-sm text-muted-foreground">
                                              Nenhuma solicitação pendente.
                                            </div>
                                          </div>
                                        </div>
                                        <DialogFooter>
                                          <DialogClose asChild>
                                            <Button type="button">Fechar</Button>
                                          </DialogClose>
                                        </DialogFooter>
                                      </DialogContent>
                                    </Dialog>
                                    
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                          Solicitar exclusão
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>Solicitar Exclusão do Grupo</DialogTitle>
                                          <DialogDescription>
                                            Você está solicitando a exclusão do grupo "{group.name}". 
                                            Esta solicitação será enviada aos administradores do sistema para aprovação.
                                          </DialogDescription>
                                        </DialogHeader>
                                        <div className="py-4">
                                          <div className="space-y-4">
                                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm">
                                              <AlertTriangle className="h-4 w-4 inline-block mr-2" />
                                              Esta ação não pode ser desfeita. Todos os conteúdos do grupo serão removidos.
                                            </div>
                                            
                                            <div>
                                              <label className="block text-sm font-medium mb-1">Motivo da solicitação</label>
                                              <Textarea 
                                                placeholder="Explique brevemente por que deseja excluir este grupo" 
                                                className="w-full"
                                              />
                                            </div>
                                          </div>
                                        </div>
                                        <DialogFooter className="flex space-x-2 justify-end">
                                          <DialogClose asChild>
                                            <Button variant="outline">Cancelar</Button>
                                          </DialogClose>
                                          <Button 
                                            variant="destructive"
                                            onClick={() => {
                                              toast({
                                                title: "Solicitação enviada",
                                                description: "Sua solicitação de exclusão do grupo foi enviada aos administradores.",
                                                duration: 5000,
                                              });
                                              // Fechar o diálogo programaticamente
                                              document.querySelector('[data-state="open"]')?.dispatchEvent(
                                                new KeyboardEvent('keydown', { key: 'Escape' })
                                              );
                                            }}
                                          >
                                            Enviar solicitação
                                          </Button>
                                        </DialogFooter>
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                </div>
                                
                                <DialogFooter>
                                  <Button type="submit">Salvar alterações</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {userGroups.length > 8 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowAllGroups(!showAllGroups)}
                      className="w-full text-xs mt-1"
                    >
                      {showAllGroups ? "Mostrar menos" : `Ver mais ${userGroups.length - 8} grupos`}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Card>
          
          {/* Seção de organização quando um grupo está selecionado */}
          {selectedGroupId && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {userGroups.find(g => g.id === selectedGroupId)?.name || 'Grupo'}
                </h3>
                
                {adminGroups.some(g => g.id === selectedGroupId) && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3"></circle>
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Configurações do Grupo</DialogTitle>
                        <DialogDescription>
                          Gerencie as configurações e membros do seu grupo.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-2">
                        <div className="flex flex-col items-center mb-4">
                          <div 
                            className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden mb-2 cursor-pointer"
                            onClick={handleGroupImageUpload}
                          >
                            {groupImageFile ? (
                              <img 
                                src={URL.createObjectURL(groupImageFile)} 
                                alt="Preview" 
                                className="w-full h-full object-cover"
                              />
                            ) : userGroups.find(g => g.id === selectedGroupId)?.imageUrl ? (
                              <img 
                                src={userGroups.find(g => g.id === selectedGroupId)?.imageUrl || ''} 
                                alt="Imagem do grupo" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Camera className="h-8 w-8 text-gray-400" />
                            )}
                          </div>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={handleGroupImageUpload}
                          >
                            Alterar imagem
                          </Button>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <FormLabel>Nome do grupo</FormLabel>
                            <Input defaultValue={userGroups.find(g => g.id === selectedGroupId)?.name} />
                          </div>
                          
                          <div>
                            <FormLabel>Descrição</FormLabel>
                            <Textarea defaultValue={userGroups.find(g => g.id === selectedGroupId)?.description || ''} />
                          </div>
                        </div>
                        
                        <div className="space-y-2 border-t pt-4 mt-4">
                          <h4 className="font-medium">Opções de administrador</h4>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="w-full justify-start">
                                <UserPlus className="h-4 w-4 mr-2" />
                                Gerenciar membros
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Gerenciar Membros</DialogTitle>
                                <DialogDescription>
                                  Gerencie os membros do grupo "{userGroups.find(g => g.id === selectedGroupId)?.name}".
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="flex justify-between items-center mb-2">
                                  <h3 className="text-sm font-medium">Membros do Grupo</h3>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="text-xs">
                                        <UserPlus className="h-3 w-3 mr-1" />
                                        Adicionar
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md">
                                      <DialogHeader>
                                        <DialogTitle>Adicionar Membros</DialogTitle>
                                        <DialogDescription>
                                          Selecione os usuários que deseja adicionar ao grupo.
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="py-4">
                                        <div className="mb-4">
                                          <Input
                                            placeholder="Pesquisar usuários..."
                                            className="mb-2"
                                          />
                                        </div>
                                        <div className="border rounded-md max-h-60 overflow-y-auto">
                                          {/* Lista de usuários simulada - em produção seria obtida da API */}
                                          {[
                                            { id: 1, name: 'Admin Conecta', email: 'conecta@cesurg.com', selected: false },
                                            { id: 3, name: 'Josefina Souza', email: 'josefina@example.com', selected: false },
                                            { id: 4, name: 'Victor Lima', email: 'victor@example.com', selected: false },
                                            { id: 5, name: 'Mariana Costa', email: 'mariana@example.com', selected: false }
                                          ].map(user => (
                                            <div key={user.id} className="flex items-center justify-between p-2 border-b hover:bg-gray-50">
                                              <div className="flex items-center">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                                                  <UserIcon className="h-4 w-4 text-primary" />
                                                </div>
                                                <div>
                                                  <div className="text-sm font-medium">{user.name}</div>
                                                  <div className="text-xs text-muted-foreground">{user.email}</div>
                                                </div>
                                              </div>
                                              <Button variant="outline" size="sm" onClick={() => {
                                                toast({
                                                  title: "Convite enviado",
                                                  description: `Convite enviado para ${user.name}`,
                                                });
                                              }}>
                                                Convidar
                                              </Button>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <DialogFooter>
                                        <DialogClose asChild>
                                          <Button variant="outline">Fechar</Button>
                                        </DialogClose>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                                
                                <div className="border rounded-md">
                                  <div className="p-3 flex items-center justify-between border-b">
                                    <div className="flex items-center">
                                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                                        <UserIcon className="h-4 w-4 text-primary" />
                                      </div>
                                      <div>
                                        <div className="text-sm font-medium">Você</div>
                                        <div className="text-xs text-muted-foreground">Administrador</div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="p-4 text-center text-sm text-muted-foreground">
                                    Nenhum outro membro no grupo ainda.
                                  </div>
                                </div>
                                
                                <div className="mt-4">
                                  <h3 className="text-sm font-medium mb-2">Solicitações Pendentes</h3>
                                  <div className="border rounded-md p-4 text-center text-sm text-muted-foreground">
                                    Nenhuma solicitação pendente.
                                  </div>
                                </div>
                              </div>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button type="button">Fechar</Button>
                                </DialogClose>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Solicitar exclusão
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Solicitar Exclusão do Grupo</DialogTitle>
                                <DialogDescription>
                                  Você está solicitando a exclusão do grupo "{userGroups.find(g => g.id === selectedGroupId)?.name}". 
                                  Esta solicitação será enviada aos administradores do sistema para aprovação.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="py-4">
                                <div className="space-y-4">
                                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm">
                                    <AlertTriangle className="h-4 w-4 inline-block mr-2" />
                                    Esta ação não pode ser desfeita. Todos os conteúdos do grupo serão removidos.
                                  </div>
                                  
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Motivo da solicitação</label>
                                    <Textarea 
                                      placeholder="Explique brevemente por que deseja excluir este grupo" 
                                      className="w-full"
                                    />
                                  </div>
                                </div>
                              </div>
                              <DialogFooter className="flex space-x-2 justify-end">
                                <DialogClose asChild>
                                  <Button variant="outline">Cancelar</Button>
                                </DialogClose>
                                <Button 
                                  variant="destructive"
                                  onClick={() => {
                                    toast({
                                      title: "Solicitação enviada",
                                      description: "Sua solicitação de exclusão do grupo foi enviada aos administradores.",
                                      duration: 5000,
                                    });
                                    // Fechar o diálogo programaticamente
                                    document.querySelector('[data-state="open"]')?.dispatchEvent(
                                      new KeyboardEvent('keydown', { key: 'Escape' })
                                    );
                                  }}
                                >
                                  Enviar solicitação
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                      
                      <DialogFooter>
                        <Button type="submit">Salvar alterações</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Button 
                  variant={organizationTab === 'posts' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setOrganizationTab('posts')}
                  className="flex items-center justify-center"
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Posts
                </Button>
                <Button 
                  variant={organizationTab === 'documents' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setOrganizationTab('documents')}
                  className="flex items-center justify-center"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Documentos
                </Button>
                <Button 
                  variant={organizationTab === 'tasks' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setOrganizationTab('tasks')}
                  className="flex items-center justify-center"
                >
                  <ListTodo className="h-4 w-4 mr-1" />
                  Tarefas
                </Button>
                <Button 
                  variant={organizationTab === 'kanban' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setOrganizationTab('kanban')}
                  className="flex items-center justify-center"
                >
                  <LayoutGrid className="h-4 w-4 mr-1" />
                  Kanban
                </Button>
              </div>
              
              {organizationTab !== 'posts' && (
                <div className="p-6 text-center text-gray-500 border rounded-md border-dashed">
                  <p>Funcionalidade {organizationTab === 'documents' ? 'de documentos' : 
                     organizationTab === 'tasks' ? 'de tarefas' : 
                     'kanban'} em desenvolvimento.</p>
                  <p className="text-xs mt-1">Esta seção será implementada em breve.</p>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
      
      {/* Create Group Dialog */}
      <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar um Novo Grupo</DialogTitle>
            <DialogDescription>
              Crie um grupo para conectar e compartilhar com outros membros.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...groupForm}>
            <form onSubmit={groupForm.handleSubmit(onGroupSubmit)} className="space-y-4">
              {/* Campo para imagem do grupo */}
              <div className="mb-4">
                <FormLabel>Imagem do Grupo</FormLabel>
                <div className="mt-2 flex flex-col items-center">
                  <div 
                    className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden mb-2"
                    onClick={handleGroupImageUpload}
                    style={{ cursor: 'pointer' }}
                  >
                    {groupImageFile ? (
                      <img 
                        src={URL.createObjectURL(groupImageFile)} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={handleGroupImageUpload}
                  >
                    {groupImageFile ? 'Alterar imagem' : 'Adicionar imagem'}
                  </Button>
                  <input
                    type="file"
                    ref={groupImageInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleGroupImageChange}
                  />
                  {groupImageFile && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-500 mt-1"
                      onClick={() => setGroupImageFile(null)}
                    >
                      Remover
                    </Button>
                  )}
                </div>
              </div>
              
              <FormField
                control={groupForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome do grupo" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={groupForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Descreva seu grupo" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={groupForm.control}
                name="isPrivate"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Grupo privado (visível apenas para membros)</FormLabel>
                  </FormItem>
                )}
              />
              
              <FormField
                control={groupForm.control}
                name="requiresApproval"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Exigir aprovação de administrador para entrar</FormLabel>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setCreateGroupOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createGroupMutation.isPending}>
                  {createGroupMutation.isPending ? 'Criando...' : 'Criar Grupo'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Post Card Component
interface PostCardProps {
  post: Post;
  onCommentSubmit: (postId: number) => void;
  commentForm: any;
  onLike: () => void;
  highlightSearch?: string;
}

function PostCard({ 
  post, 
  onCommentSubmit, 
  commentForm, 
  onLike,
  highlightSearch
}: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  
  // Format date
  const formatPostDate = (date: Date | string) => {
    return format(new Date(date), 'dd MMM yyyy, HH:mm');
  };
  
  // Highlight search terms in content
  const highlightContent = (content: string, searchTerm?: string) => {
    if (!searchTerm) return content;
    
    const parts = content.split(new RegExp(`(${searchTerm})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === searchTerm?.toLowerCase() 
        ? <mark key={i} className="bg-yellow-200">{part}</mark> 
        : part
    );
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-start">
          <Avatar className="h-10 w-10 mr-3">
            <div className="bg-primary text-white h-full w-full flex items-center justify-center">
              {post.user?.name?.charAt(0) || 'U'}
            </div>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{post.user?.name || 'Usuário'}</div>
                <div className="text-xs text-gray-500">{formatPostDate(post.createdAt)}</div>
              </div>
              {post.groupId && (
                <Badge variant="outline">
                  {post.group?.name || 'Grupo'}
                </Badge>
              )}
            </div>
            <div className="mt-2">
              {highlightSearch 
                ? <div>{highlightContent(post.content, highlightSearch)}</div>
                : <div>{post.content}</div>
              }
            </div>
            
            {/* Media attachments would be rendered here */}
            {post.mediaUrls && post.mediaUrls.length > 0 && (
              <div className="mt-3 space-y-2">
                {post.mediaUrls.map((url, index) => {
                  const type = post.mediaTypes?.[index] || '';
                  
                  if (type.startsWith('image')) {
                    return (
                      <img 
                        key={index}
                        src={url} 
                        alt={`Attachment ${index + 1}`}
                        className="max-h-96 rounded-md"
                      />
                    );
                  } else if (type.startsWith('video')) {
                    return (
                      <video 
                        key={index}
                        src={url} 
                        controls 
                        className="w-full rounded-md"
                      />
                    );
                  } else {
                    return (
                      <div key={index} className="flex items-center p-2 bg-gray-100 rounded-md">
                        <FileIcon className="h-5 w-5 mr-2 text-gray-500" />
                        <span className="text-sm">Anexo {index + 1}</span>
                      </div>
                    );
                  }
                })}
              </div>
            )}
            
            <div className="mt-4 flex items-center text-gray-500 text-sm">
              <button 
                className="mr-4 flex items-center hover:text-primary"
                onClick={onLike}
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
                <span>{post.likeCount || 0} Curtidas</span>
              </button>
              <button 
                className="flex items-center hover:text-primary"
                onClick={() => setShowComments(!showComments)}
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                <span>{post.commentCount || 0} Comentários</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Comments section */}
      {showComments && (
        <div className="bg-gray-50 p-4 border-t">
          {post.comments && post.comments.length > 0 ? (
            <div className="space-y-3 mb-4">
              {post.comments.map((comment) => (
                <div key={comment.id} className="flex items-start">
                  <Avatar className="h-8 w-8 mr-2">
                    <div className="bg-gray-300 text-gray-600 h-full w-full flex items-center justify-center text-xs">
                      {comment.user?.name?.charAt(0) || 'U'}
                    </div>
                  </Avatar>
                  <div className="flex-1 bg-white rounded-md p-3 text-sm">
                    <div className="font-medium">{comment.user?.name || 'Usuário'}</div>
                    <div>{comment.content}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {format(new Date(comment.createdAt), 'dd MMM yyyy, HH:mm')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-2 text-gray-500 text-sm">
              Nenhum comentário ainda. Seja o primeiro a comentar!
            </div>
          )}
          
          {/* Add comment form */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              onCommentSubmit(post.id);
            }} 
            className="flex items-center"
          >
            <Input
              {...commentForm.register('content')}
              placeholder="Escreva um comentário..."
              className="flex-1"
            />
            <Button type="submit" size="sm" className="ml-2">
              Enviar
            </Button>
          </form>
          {commentForm.formState.errors.content && (
            <div className="text-red-500 text-xs mt-1">
              {commentForm.formState.errors.content.message}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}