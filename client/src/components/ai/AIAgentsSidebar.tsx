import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AiAgent } from "@/shared/schema";

interface AIAgentsSidebarProps {
  agents: AiAgent[];
  selectedAgentId: number | null;
  onSelectAgent: (agent: AiAgent) => void;
  className?: string;
}

export function AIAgentsSidebar({ 
  agents, 
  selectedAgentId, 
  onSelectAgent, 
  className = "" 
}: AIAgentsSidebarProps) {
  if (agents.length === 0) {
    return (
      <div className={`border-l p-4 w-64 flex flex-col ${className}`}>
        <h2 className="text-lg font-semibold mb-4">Agentes IA</h2>
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 text-muted-foreground mb-3"
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
          <p className="text-muted-foreground">
            Nenhum agente disponível no momento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`border-l p-4 w-64 flex flex-col ${className}`}>
      <h2 className="text-lg font-semibold mb-4">Agentes IA</h2>
      <ScrollArea className="flex-1">
        <div className="space-y-3">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isSelected={agent.id === selectedAgentId}
              onClick={() => onSelectAgent(agent)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface AgentCardProps {
  agent: AiAgent;
  isSelected: boolean;
  onClick: () => void;
}

function AgentCard({ agent, isSelected, onClick }: AgentCardProps) {
  return (
    <Button
      variant={isSelected ? "secondary" : "ghost"}
      className="w-full justify-start p-3 h-auto"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={agent.imageUrl || ""} alt={agent.name} />
          <AvatarFallback>{agent.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="text-left">
          <h3 className="font-medium text-sm">{agent.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {agent.description}
          </p>
        </div>
      </div>
    </Button>
  );
}