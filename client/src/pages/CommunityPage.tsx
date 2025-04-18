import { useState, useEffect, useRef } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Header } from '@/components/Header';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ArrowUp, ImageIcon, FileTextIcon, FilmIcon, LinkIcon, FileIcon, Send, Search, MessageCircle, ThumbsUp, UserPlus, Users, Globe, Lock, MessageSquare, X, PlusCircle, Bell } from 'lucide-react';
import type { Post, Comment, Group, User, Message, Conversation } from '@shared/schema';
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
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Group management
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [groupImageFile, setGroupImageFile] = useState<File | null>(null);
  const groupImageInputRef = useRef<HTMLInputElement>(null);

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
      return await apiRequest('POST', '/api/community/groups', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/community/groups/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/community/groups/admin'] });
      groupForm.reset();
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
              <Button variant="outline" size="sm" onClick={() => setCreateGroupOpen(true)}>
                <PlusCircle className="h-4 w-4 mr-1" />
                Criar
              </Button>
            </div>
            
            {isLoadingGroups ? (
              <div className="text-center py-6">Carregando grupos...</div>
            ) : userGroups.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                Você ainda não está em nenhum grupo.
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="space-y-2">
                  <div 
                    className={`flex items-center p-2 rounded-md cursor-pointer hover:bg-gray-100 ${selectedGroupId === null ? 'bg-gray-100' : ''}`}
                    onClick={() => {
                      setSelectedGroupId(null);
                      postForm.setValue('groupId', undefined);
                    }}
                  >
                    <Globe className="h-5 w-5 mr-2 text-primary" />
                    <div className="flex-1">
                      <div className="font-medium">Feed Geral</div>
                    </div>
                  </div>
                  
                  {userGroups.map((group) => {
                    const isAdmin = adminGroups.some(g => g.id === group.id);
                    return (
                      <div 
                        key={group.id}
                        className={`flex items-center p-2 rounded-md cursor-pointer hover:bg-gray-100 ${selectedGroupId === group.id ? 'bg-gray-100' : ''}`}
                        onClick={() => {
                          setSelectedGroupId(group.id);
                          postForm.setValue('groupId', group.id);
                        }}
                      >
                        {group.isPrivate ? (
                          <Lock className="h-5 w-5 mr-2 text-gray-500" />
                        ) : (
                          <Users className="h-5 w-5 mr-2 text-secondary" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium">{group.name}</div>
                          <div className="text-xs text-gray-500 truncate">{group.description}</div>
                        </div>
                        {isAdmin && (
                          <Badge variant="outline" className="ml-2 bg-secondary/10 text-secondary">
                            Admin
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </Card>
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