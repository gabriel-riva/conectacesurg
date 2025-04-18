import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus } from "lucide-react";
import { AiConversation, AiAgent } from "@/shared/schema";

interface AIConversationsSidebarProps {
  conversations: (AiConversation & { agent: AiAgent })[];
  selectedConversationId: number | null;
  onSelectConversation: (conversation: AiConversation) => void;
  onNewConversation: () => void;
  className?: string;
}

export function AIConversationsSidebar({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
  className = "",
}: AIConversationsSidebarProps) {
  return (
    <div className={`border-r p-4 w-64 flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Conversas</h2>
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={onNewConversation}
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only">Nova conversa</span>
        </Button>
      </div>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center p-4">
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
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          <p className="text-muted-foreground mb-4">
            Nenhuma conversa iniciada
          </p>
          <Button onClick={onNewConversation}>
            Iniciar nova conversa
          </Button>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={conversation.id === selectedConversationId}
                onClick={() => onSelectConversation(conversation)}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

interface ConversationItemProps {
  conversation: AiConversation & { agent: AiAgent };
  isSelected: boolean;
  onClick: () => void;
}

function ConversationItem({
  conversation,
  isSelected,
  onClick,
}: ConversationItemProps) {
  // Format date to show just the day if it's today, or the date if it's older
  const formatDate = (date: Date) => {
    const today = new Date();
    const conversationDate = new Date(date);
    
    if (
      today.getDate() === conversationDate.getDate() &&
      today.getMonth() === conversationDate.getMonth() &&
      today.getFullYear() === conversationDate.getFullYear()
    ) {
      return conversationDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    return conversationDate.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  return (
    <Button
      variant={isSelected ? "secondary" : "ghost"}
      className="w-full justify-start p-3 h-auto"
      onClick={onClick}
    >
      <div className="flex flex-col items-start gap-1 w-full overflow-hidden">
        <div className="flex justify-between w-full">
          <span className="font-medium text-sm truncate">
            {conversation.title}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDate(conversation.lastMessageAt)}
          </span>
        </div>
        <span className="text-xs text-muted-foreground truncate w-full">
          {conversation.agent.name}
        </span>
      </div>
    </Button>
  );
}