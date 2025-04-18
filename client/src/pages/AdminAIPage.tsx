import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AiAgent, AiPrompt } from "@/shared/schema";
import { Edit, Trash, Plus, Search } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function AdminAIPage() {
  const [activeTab, setActiveTab] = useState("agentes");
  const { toast } = useToast();

  return (
    <div className="flex h-screen">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        
        <div className="p-6 flex-1 overflow-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Gerenciamento de IA</h1>
            <p className="text-muted-foreground">
              Configure os agentes de IA e gerencie a biblioteca de prompts.
            </p>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="agentes">Agentes</TabsTrigger>
              <TabsTrigger value="prompts">Prompts</TabsTrigger>
            </TabsList>
            
            <TabsContent value="agentes">
              <AIAgentsTab />
            </TabsContent>
            
            <TabsContent value="prompts">
              <AIPromptsTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function AIAgentsTab() {
  const [isAddAgentOpen, setIsAddAgentOpen] = useState(false);
  const [isEditAgentOpen, setIsEditAgentOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AiAgent | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Mock data - would be replaced with actual data from API
  const mockAgents: AiAgent[] = [
    {
      id: 1,
      name: "Assistente Geral",
      description: "Um assistente inteligente para ajudar com perguntas gerais e suporte.",
      imageUrl: "",
      n8nWebhookUrl: "https://n8n.example.com/webhook/assistente-geral",
      n8nApiKey: "n8n_api_key_123",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      name: "Redator de Conteúdo",
      description: "Especializado em criação de textos, artigos e conteúdo para marketing.",
      imageUrl: "",
      n8nWebhookUrl: "https://n8n.example.com/webhook/redator",
      n8nApiKey: "n8n_api_key_456",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      name: "Analista de Dados",
      description: "Auxilia com análise de dados, estatísticas e visualizações.",
      imageUrl: "",
      n8nWebhookUrl: "https://n8n.example.com/webhook/analista",
      n8nApiKey: "n8n_api_key_789",
      active: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // Buscar dados reais da API
  const { data: agents = mockAgents, refetch: refetchAgents } = useQuery({
    queryKey: ['/api/ai/agents'],
  });

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditAgent = (agent: AiAgent) => {
    setSelectedAgent(agent);
    setIsEditAgentOpen(true);
  };

  const handleDeleteAgent = async (agentId: number) => {
    try {
      await apiRequest('DELETE', `/api/ai/agents/${agentId}`);
      
      // Recarregar a lista de agentes
      await refetchAgents();
      
      toast({
        title: "Agente excluído",
        description: "O agente foi excluído com sucesso.",
        variant: "default",
      });
    } catch (error) {
      console.error("Erro ao excluir agente:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o agente. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleToggleAgentStatus = async (agentId: number, newStatus: boolean) => {
    try {
      // Atualizar apenas o status do agente
      await apiRequest('PUT', `/api/ai/agents/${agentId}`, { active: newStatus });
      
      // Recarregar a lista de agentes
      await refetchAgents();
      
      toast({
        title: newStatus ? "Agente ativado" : "Agente desativado",
        description: `O agente foi ${newStatus ? "ativado" : "desativado"} com sucesso.`,
        variant: "default",
      });
    } catch (error) {
      console.error("Erro ao alterar status do agente:", error);
      toast({
        title: "Erro",
        description: `Não foi possível ${newStatus ? "ativar" : "desativar"} o agente. Tente novamente.`,
        variant: "destructive",
      });
    }
  };

  const handleSaveAgent = async (agent: Partial<AiAgent>) => {
    try {
      if (selectedAgent) {
        // Atualizar agente existente
        await apiRequest('PUT', `/api/ai/agents/${selectedAgent.id}`, agent);
      } else {
        // Criar novo agente
        await apiRequest('POST', '/api/ai/agents', agent);
      }
      
      // Recarregar a lista de agentes
      await refetchAgents();
      
      toast({
        title: selectedAgent ? "Agente atualizado" : "Agente criado",
        description: `O agente foi ${selectedAgent ? "atualizado" : "criado"} com sucesso.`,
        variant: "default",
      });
    } catch (error) {
      console.error("Erro ao salvar agente:", error);
      toast({
        title: "Erro",
        description: `Não foi possível ${selectedAgent ? "atualizar" : "criar"} o agente. Tente novamente.`,
        variant: "destructive",
      });
    } finally {
      setIsAddAgentOpen(false);
      setIsEditAgentOpen(false);
      setSelectedAgent(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar agentes..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={() => setIsAddAgentOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo Agente
        </Button>
      </div>

      {filteredAgents.length === 0 ? (
        <div className="text-center p-12 border rounded-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 mx-auto text-muted-foreground mb-4"
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
          <h3 className="text-lg font-medium mb-2">
            {searchTerm ? "Nenhum agente encontrado" : "Nenhum agente disponível"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm
              ? "Tente outro termo de busca ou limpe o filtro."
              : "Crie seu primeiro agente de IA para começar."}
          </p>
          {searchTerm ? (
            <Button variant="outline" onClick={() => setSearchTerm("")}>
              Limpar busca
            </Button>
          ) : (
            <Button onClick={() => setIsAddAgentOpen(true)}>
              Criar Agente
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <Card key={agent.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={agent.imageUrl || ""} alt={agent.name} />
                      <AvatarFallback>{agent.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>{agent.name}</CardTitle>
                      <div className="flex items-center mt-1">
                        <div
                          className={`h-2 w-2 rounded-full mr-2 ${
                            agent.active ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                        <CardDescription>
                          {agent.active ? "Ativo" : "Inativo"}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditAgent(agent)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteAgent(agent.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {agent.description}
                </p>
                <div className="mt-4 text-xs text-muted-foreground truncate">
                  <p className="font-medium">n8n Webhook:</p>
                  <p className="truncate">{agent.n8nWebhookUrl}</p>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-3 flex justify-between">
                <p className="text-xs text-muted-foreground">
                  Criado: {agent.createdAt.toLocaleDateString()}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs">Status:</span>
                  <Switch
                    checked={agent.active}
                    onCheckedChange={(checked) =>
                      handleToggleAgentStatus(agent.id, checked)
                    }
                  />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <AgentFormDialog
        isOpen={isAddAgentOpen}
        onClose={() => setIsAddAgentOpen(false)}
        onSave={handleSaveAgent}
        agent={null}
        title="Criar Novo Agente"
      />

      <AgentFormDialog
        isOpen={isEditAgentOpen}
        onClose={() => {
          setIsEditAgentOpen(false);
          setSelectedAgent(null);
        }}
        onSave={handleSaveAgent}
        agent={selectedAgent}
        title="Editar Agente"
      />
    </div>
  );
}

interface AgentFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (agent: Partial<AiAgent>) => void;
  agent: AiAgent | null;
  title: string;
}

function AgentFormDialog({
  isOpen,
  onClose,
  onSave,
  agent,
  title,
}: AgentFormDialogProps) {
  const [formData, setFormData] = useState<Partial<AiAgent>>(
    agent || {
      name: "",
      description: "",
      imageUrl: "",
      n8nWebhookUrl: "",
      n8nApiKey: "",
      active: true,
    }
  );

  // Reset form when agent changes
  React.useEffect(() => {
    setFormData(
      agent || {
        name: "",
        description: "",
        imageUrl: "",
        n8nWebhookUrl: "",
        n8nApiKey: "",
        active: true,
      }
    );
  }, [agent]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, active: checked }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Agente</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imageUrl">URL da Imagem</Label>
              <Input
                id="imageUrl"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleChange}
                placeholder="https://exemplo.com/imagem.jpg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="n8nWebhookUrl">n8n Webhook URL</Label>
              <Input
                id="n8nWebhookUrl"
                name="n8nWebhookUrl"
                value={formData.n8nWebhookUrl}
                onChange={handleChange}
                placeholder="https://n8n.exemplo.com/webhook/meu-agente"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="n8nApiKey">n8n API Key</Label>
              <Input
                id="n8nApiKey"
                name="n8nApiKey"
                type="password"
                value={formData.n8nApiKey}
                onChange={handleChange}
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={handleSwitchChange}
              />
              <Label htmlFor="active">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AIPromptsTab() {
  const [isAddPromptOpen, setIsAddPromptOpen] = useState(false);
  const [isEditPromptOpen, setIsEditPromptOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<AiPrompt | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Mock data - would be replaced with actual data from API
  const mockPrompts: (AiPrompt & { creatorName: string })[] = [
    {
      id: 1,
      title: "Resumo de artigo",
      content: "Por favor, faça um resumo conciso do seguinte artigo, destacando os pontos principais e conclusões:",
      creatorId: 1,
      creatorName: "Admin Conecta",
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      title: "Analise dados",
      content: "Por favor, analise os seguintes dados e forneça insights sobre tendências e padrões importantes:",
      creatorId: 1,
      creatorName: "Admin Conecta",
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      title: "Crie uma lista de tarefas",
      content: "Baseado no seguinte projeto, crie uma lista detalhada de tarefas com prioridades e prazos estimados:",
      creatorId: 2,
      creatorName: "João Silva",
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // Mock agent data for prompt assignment
  const mockAgents: AiAgent[] = [
    {
      id: 1,
      name: "Assistente Geral",
      description: "Um assistente inteligente para ajudar com perguntas gerais e suporte.",
      imageUrl: "",
      n8nWebhookUrl: "https://n8n.example.com/webhook/assistente-geral",
      n8nApiKey: "n8n_api_key_123",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      name: "Redator de Conteúdo",
      description: "Especializado em criação de textos, artigos e conteúdo para marketing.",
      imageUrl: "",
      n8nWebhookUrl: "https://n8n.example.com/webhook/redator",
      n8nApiKey: "n8n_api_key_456",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // In a real app, these would be API calls
  const { data: prompts = mockPrompts } = useQuery({
    queryKey: ['/api/admin/ai/prompts'],
    enabled: false, // Disable until API is implemented
  });

  const { data: agents = mockAgents } = useQuery({
    queryKey: ['/api/admin/ai/agents'],
    enabled: false, // Disable until API is implemented
  });

  const filteredPrompts = prompts.filter(prompt => 
    prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prompt.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditPrompt = (prompt: AiPrompt & { creatorName: string }) => {
    setSelectedPrompt(prompt);
    setIsEditPromptOpen(true);
  };

  const handleDeletePrompt = (promptId: number) => {
    // In a real app, this would be an API call
    toast({
      title: "Prompt excluído",
      description: "O prompt foi excluído com sucesso.",
      variant: "default",
    });
  };

  const handleSavePrompt = (prompt: Partial<AiPrompt>, selectedAgentIds: number[]) => {
    // In a real app, this would be an API call to save the prompt and its agent assignments
    toast({
      title: selectedPrompt ? "Prompt atualizado" : "Prompt criado",
      description: `O prompt foi ${selectedPrompt ? "atualizado" : "criado"} com sucesso.`,
      variant: "default",
    });
    
    setIsAddPromptOpen(false);
    setIsEditPromptOpen(false);
    setSelectedPrompt(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar prompts..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={() => setIsAddPromptOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo Prompt
        </Button>
      </div>

      {filteredPrompts.length === 0 ? (
        <div className="text-center p-12 border rounded-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 mx-auto text-muted-foreground mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="text-lg font-medium mb-2">
            {searchTerm ? "Nenhum prompt encontrado" : "Nenhum prompt disponível"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm
              ? "Tente outro termo de busca ou limpe o filtro."
              : "Crie seu primeiro prompt para começar."}
          </p>
          {searchTerm ? (
            <Button variant="outline" onClick={() => setSearchTerm("")}>
              Limpar busca
            </Button>
          ) : (
            <Button onClick={() => setIsAddPromptOpen(true)}>
              Criar Prompt
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrompts.map((prompt) => (
            <Card key={prompt.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle>{prompt.title}</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditPrompt(prompt)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeletePrompt(prompt.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  Criado por: {prompt.creatorName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-4">
                  {prompt.content}
                </p>
              </CardContent>
              <CardFooter className="border-t pt-3 flex justify-between">
                <p className="text-xs text-muted-foreground">
                  Criado: {prompt.createdAt.toLocaleDateString()}
                </p>
                {prompt.isPublic && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                    Público
                  </span>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <PromptFormDialog
        isOpen={isAddPromptOpen}
        onClose={() => setIsAddPromptOpen(false)}
        onSave={handleSavePrompt}
        prompt={null}
        title="Criar Novo Prompt"
        agents={agents}
      />

      <PromptFormDialog
        isOpen={isEditPromptOpen}
        onClose={() => {
          setIsEditPromptOpen(false);
          setSelectedPrompt(null);
        }}
        onSave={handleSavePrompt}
        prompt={selectedPrompt}
        title="Editar Prompt"
        agents={agents}
      />
    </div>
  );
}

interface PromptFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prompt: Partial<AiPrompt>, selectedAgentIds: number[]) => void;
  prompt: AiPrompt | null;
  title: string;
  agents: AiAgent[];
}

function PromptFormDialog({
  isOpen,
  onClose,
  onSave,
  prompt,
  title,
  agents,
}: PromptFormDialogProps) {
  const [formData, setFormData] = useState<Partial<AiPrompt>>(
    prompt || {
      title: "",
      content: "",
      isPublic: false,
    }
  );
  const [selectedAgentIds, setSelectedAgentIds] = useState<number[]>([]);

  // Reset form when prompt changes
  React.useEffect(() => {
    setFormData(
      prompt || {
        title: "",
        content: "",
        isPublic: false,
      }
    );
    // In a real app, you would fetch the agent IDs associated with this prompt
    setSelectedAgentIds(prompt ? [1, 2] : []);
  }, [prompt]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isPublic: checked }));
  };

  const handleAgentToggle = (agentId: number) => {
    setSelectedAgentIds((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData, selectedAgentIds);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo</Label>
              <Textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleChange}
                className="min-h-[200px]"
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isPublic"
                checked={formData.isPublic}
                onCheckedChange={handleSwitchChange}
              />
              <Label htmlFor="isPublic">Público</Label>
            </div>
            <div className="space-y-2">
              <Label>Atribuir a Agentes</Label>
              <div className="border rounded-md p-3 space-y-2">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center space-x-2"
                  >
                    <input
                      type="checkbox"
                      id={`agent-${agent.id}`}
                      checked={selectedAgentIds.includes(agent.id)}
                      onChange={() => handleAgentToggle(agent.id)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor={`agent-${agent.id}`} className="cursor-pointer">
                      {agent.name}
                    </Label>
                  </div>
                ))}
                {agents.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum agente disponível.
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}