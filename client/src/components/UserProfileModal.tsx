import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Phone, 
  MapPin, 
  Mail, 
  Users, 
  FileText, 
  Download,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number | null;
  userName: string;
}

interface UserProfile {
  id: number;
  email: string;
  name: string;
  role: string;
  photoUrl?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phoneNumbers?: string[];
  secondaryEmail?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  documents?: {
    name: string;
    url: string;
    type: string;
    description: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export function UserProfileModal({ isOpen, onClose, userId, userName }: UserProfileModalProps) {
  // Buscar dados do perfil do usuário
  const { data: profile, isLoading, error } = useQuery<UserProfile>({
    queryKey: ['/api/users', userId, 'profile'],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      return await apiRequest("GET", `/api/users/${userId}/profile`);
    },
    enabled: !!userId && isOpen,
    refetchOnWindowFocus: false,
  });

  // Buscar documentos do usuário
  const { data: userDocuments, isLoading: isLoadingDocuments } = useQuery<any>({
    queryKey: ['/api/users', userId, 'documents'],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      return await apiRequest("GET", `/api/users/${userId}/documents`);
    },
    enabled: !!userId && isOpen,
    refetchOnWindowFocus: false,
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part.charAt(0))
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const formatDocumentType = (type: string) => {
    if (type.includes("pdf")) return "PDF";
    if (type.includes("image")) return "Imagem";
    if (type.includes("word")) return "Word";
    return type.split("/")[1]?.toUpperCase() || "Documento";
  };

  const downloadDocument = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen || !userId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] min-h-[600px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Perfil de {userName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-conecta-green" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-red-600 font-medium">Erro ao carregar perfil</p>
            <p className="text-gray-500 text-sm">Não foi possível carregar as informações do usuário</p>
          </div>
        ) : profile ? (
          <Tabs defaultValue="informacoes" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="informacoes">Informações Pessoais</TabsTrigger>
              <TabsTrigger value="documentos">Documentos</TabsTrigger>
            </TabsList>

            <TabsContent value="informacoes">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Foto e informações básicas */}
                <Card>
                  <CardHeader>
                    <CardTitle>Informações Básicas</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center">
                    <Avatar className="w-24 h-24 border-2 border-conecta-green mb-4">
                      <AvatarImage 
                        src={profile.photoUrl} 
                        alt={profile.name} 
                      />
                      <AvatarFallback className="text-lg">
                        {getInitials(profile.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="text-center w-full">
                      <h3 className="text-lg font-semibold mb-2">{profile.name}</h3>
                      <p className="text-gray-600 text-sm mb-2">{profile.email}</p>
                      <Badge variant="outline">{profile.role}</Badge>
                      
                      <Separator className="my-4" />
                      
                      <div className="text-sm text-gray-500">
                        <p>Data de Ingresso: {new Date(profile.createdAt).toLocaleDateString('pt-BR')}</p>
                        <p>Atualizado em: {new Date(profile.updatedAt).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Informações de contato e endereço */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Detalhes do Perfil</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Contatos */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Contatos
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {profile.phoneNumbers && profile.phoneNumbers.length > 0 ? (
                          <div>
                            <p className="text-sm font-medium text-gray-700">Telefones:</p>
                            {profile.phoneNumbers.map((phone, index) => (
                              <p key={index} className="text-sm text-gray-600">{phone}</p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Nenhum telefone cadastrado</p>
                        )}
                        
                        {profile.secondaryEmail && (
                          <div>
                            <p className="text-sm font-medium text-gray-700">Email secundário:</p>
                            <p className="text-sm text-gray-600">{profile.secondaryEmail}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Endereço */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Endereço
                      </h4>
                      {profile.address || profile.city || profile.state || profile.zipCode ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {profile.address && (
                            <div>
                              <p className="text-sm font-medium text-gray-700">Endereço:</p>
                              <p className="text-sm text-gray-600">{profile.address}</p>
                            </div>
                          )}
                          {profile.city && (
                            <div>
                              <p className="text-sm font-medium text-gray-700">Cidade:</p>
                              <p className="text-sm text-gray-600">{profile.city}</p>
                            </div>
                          )}
                          {profile.state && (
                            <div>
                              <p className="text-sm font-medium text-gray-700">Estado:</p>
                              <p className="text-sm text-gray-600">{profile.state}</p>
                            </div>
                          )}
                          {profile.zipCode && (
                            <div>
                              <p className="text-sm font-medium text-gray-700">CEP:</p>
                              <p className="text-sm text-gray-600">{profile.zipCode}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Nenhum endereço cadastrado</p>
                      )}
                    </div>

                    <Separator />

                    {/* Contato de emergência */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Contato de Emergência
                      </h4>
                      {profile.emergencyContact && profile.emergencyContact.name ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-700">Nome:</p>
                            <p className="text-sm text-gray-600">{profile.emergencyContact.name}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Telefone:</p>
                            <p className="text-sm text-gray-600">{profile.emergencyContact.phone}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Relacionamento:</p>
                            <p className="text-sm text-gray-600">{profile.emergencyContact.relationship}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Nenhum contato de emergência cadastrado</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="documentos">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Documentos do Usuário
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingDocuments ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-conecta-green" />
                    </div>
                  ) : userDocuments && userDocuments.documents && userDocuments.documents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {userDocuments.documents.map((doc: any, index: number) => (
                        <Card key={index} className="border border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm truncate">{doc.name}</h4>
                                <Badge variant="secondary" className="text-xs mt-1">
                                  {formatDocumentType(doc.type)}
                                </Badge>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadDocument(doc.url, doc.name)}
                                className="ml-2 h-8 w-8 p-0"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                            {doc.description && (
                              <p className="text-xs text-gray-600 mt-2">{doc.description}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Nenhum documento encontrado</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}