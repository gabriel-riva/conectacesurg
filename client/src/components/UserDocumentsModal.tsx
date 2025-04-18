import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";

interface UserDocumentsModalProps {
  userId: number | null;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface UserDocument {
  name: string;
  description: string;
  file: string;
}

interface UserDocumentsResponse {
  userId: number;
  userName: string;
  documents: UserDocument[];
}

export const UserDocumentsModal: React.FC<UserDocumentsModalProps> = ({
  userId,
  userName,
  isOpen,
  onClose,
}) => {
  const {
    data: documentsData,
    isLoading,
    error,
  } = useQuery<UserDocumentsResponse>({
    queryKey: ["/api/users/documents", userId],
    queryFn: async () => {
      if (!userId) return { userId: 0, userName: "", documents: [] };
      return await apiRequest("GET", `/api/users/${userId}/documents`);
    },
    enabled: !!userId && isOpen,
  });

  const handleDownload = (fileUrl: string) => {
    window.open(fileUrl, "_blank");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] h-auto overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">
            Documentos de {userName}
          </DialogTitle>
          <DialogDescription>
            Visualize e baixe os documentos enviados pelo usuário.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 h-full">
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center p-6 text-red-500">
              Erro ao carregar documentos. Por favor, tente novamente.
            </div>
          ) : documentsData?.documents && documentsData.documents.length > 0 ? (
            <ScrollArea className="h-[50vh]">
              <div className="grid gap-4 p-1">
                {documentsData.documents.map((doc, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{doc.name}</h3>
                        <p className="text-gray-500 text-sm mb-3">
                          {doc.description || "Sem descrição"}
                        </p>
                      </div>
                      <div className="flex items-start">
                        <Button
                          onClick={() => handleDownload(doc.file)}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                          Baixar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center p-6 text-gray-500">
              Este usuário não enviou nenhum documento.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};