import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { AIMessage } from "@/components/ai/AIMessage";
import { AIChatInput } from "@/components/ai/AIChatInput";
import { AIAgentsSidebar } from "@/components/ai/AIAgentsSidebar";
import { AIConversationsSidebar } from "@/components/ai/AIConversationsSidebar";
import { AIPromptLibrary } from "@/components/ai/AIPromptLibrary";
import { useAuth } from "@/lib/auth";
import { AiConversation, AiMessage as AIMessageType, AiAgent, AiPrompt } from "@/shared/schema";

export default function AIPage() {
  const { user } = useAuth();
  const [isPromptLibraryOpen, setIsPromptLibraryOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<AIMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data - would be replaced with actual data from API
  const mockAgents: AiAgent[] = [
    {
      id: 1,
      name: "Assistente Geral",
      description: "Um assistente inteligente para ajudar com perguntas gerais e suporte.",
      imageUrl: "",
      n8nWebhookUrl: "",
      n8nApiKey: "",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      name: "Redator de Conteúdo",
      description: "Especializado em criação de textos, artigos e conteúdo para marketing.",
      imageUrl: "",
      n8nWebhookUrl: "",
      n8nApiKey: "",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      name: "Analista de Dados",
      description: "Auxilia com análise de dados, estatísticas e visualizações.",
      imageUrl: "",
      n8nWebhookUrl: "",
      n8nApiKey: "",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockConversations: (AiConversation & { agent: AiAgent })[] = [
    {
      id: 1,
      userId: user?.id || 1,
      agentId: 1,
      title: "Perguntas sobre o projeto",
      lastMessageAt: new Date(),
      createdAt: new Date(),
      agent: mockAgents[0],
    },
    {
      id: 2,
      userId: user?.id || 1,
      agentId: 2,
      title: "Criação de artigo sobre IA",
      lastMessageAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
      agent: mockAgents[1],
    },
  ];

  const mockPrompts: AiPrompt[] = [
    {
      id: 1,
      title: "Resumo de artigo",
      content: "Por favor, faça um resumo conciso do seguinte artigo, destacando os pontos principais e conclusões:",
      creatorId: 1,
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      title: "Analise dados",
      content: "Por favor, analise os seguintes dados e forneça insights sobre tendências e padrões importantes:",
      creatorId: 1,
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      title: "Crie uma lista de tarefas",
      content: "Baseado no seguinte projeto, crie uma lista detalhada de tarefas com prioridades e prazos estimados:",
      creatorId: 2,
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockMessages: AIMessageType[] = [
    {
      id: 1,
      conversationId: 1,
      content: "Olá, como posso ajudar com seu projeto hoje?",
      isFromUser: false,
      attachments: [],
      createdAt: new Date(Date.now() - 60 * 1000), // 1 minute ago
    },
    {
      id: 2,
      conversationId: 1,
      content: "Preciso de ajuda para planejar as etapas do meu novo projeto de desenvolvimento web.",
      isFromUser: true,
      attachments: [],
      createdAt: new Date(Date.now() - 30 * 1000), // 30 seconds ago
    },
  ];

  // Fetch real data from API
  const { data: agents = [] } = useQuery<AiAgent[]>({
    queryKey: ['/api/ai/agents'],
  });

  const { data: conversations = [] } = useQuery<(AiConversation & { agent: AiAgent })[]>({
    queryKey: ['/api/ai/conversations'],
  });

  const { data: prompts = [] } = useQuery<AiPrompt[]>({
    queryKey: ['/api/ai/prompts'],
    queryFn: async () => {
      const response = await fetch('/api/ai/prompts?includePrivate=true');
      if (!response.ok) {
        throw new Error('Failed to fetch prompts');
      }
      return response.json();
    }
  });

  // Na implementação real, não inicializamos com mensagens de teste
  // React.useEffect(() => {
  //   if (messages.length === 0) {
  //     setMessages(mockMessages);
  //   }
  // }, [messages]);

  const handleSubmitMessage = async (message: string, attachments: File[]) => {
    if (!selectedAgentId) return;

    setIsLoading(true);
    
    try {
      // Se não existe uma conversa, crie uma
      let conversationId = selectedConversationId;
      
      if (!conversationId) {
        // Cria uma nova conversa
        const createConversationResponse = await fetch('/api/ai/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agentId: selectedAgentId,
            title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
          }),
        });
        
        if (!createConversationResponse.ok) {
          throw new Error('Falha ao criar conversa');
        }
        
        const newConversation = await createConversationResponse.json();
        conversationId = newConversation.id;
        setSelectedConversationId(conversationId);
      }
      
      // Adicionar mensagem do usuário localmente para feedback imediato
      const userMessage: AIMessageType = {
        id: Date.now(),
        conversationId: conversationId,
        content: message,
        isFromUser: true,
        attachments: [],
        createdAt: new Date(),
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Enviar a mensagem para o servidor
      const sendMessageResponse = await fetch(`/api/ai/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message,
          isFromUser: true,
          // Os anexos seriam processados aqui com upload
        }),
      });
      
      if (!sendMessageResponse.ok) {
        throw new Error('Falha ao enviar mensagem');
      }
      
      // Simular resposta do agente - em produção, isso viria do webhook do n8n
      // Em uma implementação real, o frontend esperaria por uma resposta de webhook ou faria polling
      setTimeout(async () => {
        const agentMessage: AIMessageType = {
          id: Date.now() + 1,
          conversationId: conversationId || 0,
          content: `Recebi sua mensagem: "${message}". Em um sistema real, essa mensagem seria processada pelo agente de IA selecionado através do n8n.`,
          isFromUser: false,
          attachments: [],
          createdAt: new Date(),
        };
        
        setMessages(prev => [...prev, agentMessage]);
        
        // Simular o envio da resposta do agente para o servidor
        await fetch(`/api/ai/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: agentMessage.content,
            isFromUser: false,
          }),
        });
        
        setIsLoading(false);
      }, 1500);
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      setIsLoading(false);
    }
  };

  const handleSelectAgent = (agent: AiAgent) => {
    setSelectedAgentId(agent.id);
    
    // Reset conversation and conversation ID when switching agents
    if (selectedAgentId !== agent.id) {
      setSelectedConversationId(null);
      
      // Create a new conversation when selecting an agent
      setMessages([{
        id: Date.now(),
        conversationId: 0,
        content: `Olá! Eu sou o ${agent.name}. ${agent.description} Como posso ajudar você hoje?`,
        isFromUser: false,
        attachments: [],
        createdAt: new Date(),
      }]);
    }
  };

  const handleSelectConversation = (conversation: AiConversation) => {
    setSelectedConversationId(conversation.id);
    setSelectedAgentId(conversation.agentId);
    
    // Buscar mensagens para essa conversa
    fetch(`/api/ai/conversations/${conversation.id}/messages`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Falha ao buscar mensagens');
        }
        return response.json();
      })
      .then(data => {
        setMessages(data || []);
      })
      .catch(error => {
        console.error('Erro ao buscar mensagens:', error);
        setMessages([]);
      });
  };

  const handleNewConversation = () => {
    // Reset the current conversation
    setSelectedConversationId(null);
    setSelectedAgentId(null);
    setMessages([]);
  };

  const handleOpenPromptLibrary = () => {
    setIsPromptLibraryOpen(true);
  };

  const handleSelectPrompt = (promptContent: string) => {
    handleSubmitMessage(promptContent, []);
  };

  return (
    <div className="flex flex-col h-screen">
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        <AIConversationsSidebar
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
        />
        
        <div className="flex-1 flex flex-col">
          {selectedAgentId ? (
            <>
              <div className="flex-1 overflow-y-auto">
                {messages.map((message) => (
                  <AIMessage
                    key={message.id}
                    content={message.content}
                    isFromUser={message.isFromUser}
                    timestamp={message.createdAt}
                    userName={user?.name}
                    agentName={agents.find(a => a.id === selectedAgentId)?.name}
                    agentImage={agents.find(a => a.id === selectedAgentId)?.imageUrl}
                    userImage={user?.photoUrl}
                    attachments={message.attachments}
                  />
                ))}
                {isLoading && (
                  <div className="p-4 text-center">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-e-transparent" />
                  </div>
                )}
              </div>
              
              <AIChatInput
                onSubmit={handleSubmitMessage}
                onOpenPromptLibrary={handleOpenPromptLibrary}
                isLoading={isLoading}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 text-muted-foreground mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M11.5 3L15 10L18.5 3M5.5 21L9 14L12.5 21M2.5 12L6 5L9.5 12M14.5 12L18 5L21.5 12"
                />
              </svg>
              <h2 className="text-xl font-semibold mb-2">Bem-vindo ao Assistente IA</h2>
              <p className="text-muted-foreground max-w-md mb-8">
                Selecione um agente para iniciar uma nova conversa ou continue uma conversa existente.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    className="flex flex-col items-center p-6 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-center"
                    onClick={() => handleSelectAgent(agent)}
                  >
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      {agent.imageUrl ? (
                        <img
                          src={agent.imageUrl}
                          alt={agent.name}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        <span className="text-primary text-lg font-semibold">
                          {agent.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium mb-2">{agent.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {agent.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <AIAgentsSidebar
          agents={agents}
          selectedAgentId={selectedAgentId}
          onSelectAgent={handleSelectAgent}
        />
      </div>

      <AIPromptLibrary
        isOpen={isPromptLibraryOpen}
        onClose={() => setIsPromptLibraryOpen(false)}
        onSelectPrompt={handleSelectPrompt}
        prompts={prompts}
      />
    </div>
  );
}