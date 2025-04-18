import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiPrompt } from "@/shared/schema";
import { Search } from "lucide-react";

interface AIPromptLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (prompt: string) => void;
  prompts: AiPrompt[];
}

export function AIPromptLibrary({
  isOpen,
  onClose,
  onSelectPrompt,
  prompts,
}: AIPromptLibraryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("todos");

  // Filtering prompts based on search term and active tab
  const filteredPrompts = prompts.filter((prompt) => {
    const matchesSearch =
      searchTerm === "" ||
      prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prompt.content.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeTab === "todos") return matchesSearch;
    if (activeTab === "meus") return matchesSearch && prompt.creatorId === 1; // Assuming user ID is 1, this should be the actual user's ID
    if (activeTab === "publicos") return matchesSearch && prompt.isPublic;

    return matchesSearch;
  });

  const handleSelectPrompt = (prompt: AiPrompt) => {
    onSelectPrompt(prompt.content);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Biblioteca de Prompts</DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar prompts..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Tabs defaultValue="todos" className="flex-1 flex flex-col" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="meus">Meus Prompts</TabsTrigger>
            <TabsTrigger value="publicos">Públicos</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="flex-1">
            {filteredPrompts.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center">
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
                    d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  />
                </svg>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "Nenhum prompt encontrado para esta busca."
                    : "Nenhum prompt disponível."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPrompts.map((prompt) => (
                  <PromptCard
                    key={prompt.id}
                    prompt={prompt}
                    onSelect={() => handleSelectPrompt(prompt)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

interface PromptCardProps {
  prompt: AiPrompt;
  onSelect: () => void;
}

function PromptCard({ prompt, onSelect }: PromptCardProps) {
  return (
    <div className="border rounded-lg p-4 hover:border-primary transition-colors">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium">{prompt.title}</h3>
        <Button variant="ghost" size="sm" onClick={onSelect}>
          Usar
        </Button>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-3">{prompt.content}</p>
      {prompt.isPublic && (
        <div className="mt-2">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
            Público
          </span>
        </div>
      )}
    </div>
  );
}