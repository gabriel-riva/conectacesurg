import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChallengeCardProps {
  title: string;
  description: string;
  image: string;
  points: number;
}

function ChallengeItem({ title, description, image, points }: ChallengeCardProps) {
  return (
    <div className="flex flex-col rounded-md overflow-hidden border">
      <div className="h-24 bg-primary/10 flex items-center justify-center">
        <div className="text-center text-sm font-medium">IMAGEM</div>
      </div>
      <div className="p-2">
        <h3 className="font-semibold text-sm">{title}</h3>
        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{description}</p>
        <div className="flex justify-end mt-1">
          <span className="text-primary text-xs font-medium">{points}pts</span>
        </div>
      </div>
    </div>
  );
}

export function ChallengesCard() {
  // Dados de exemplo - serão substituídos por dados reais da API
  const challenges = [
    {
      id: 1,
      title: "Título",
      description: "Descrição do desafio. Lorem ipsum...",
      image: "/placeholder.jpg",
      points: 30
    },
    {
      id: 2,
      title: "Título",
      description: "Descrição do desafio. Lorem ipsum...",
      image: "/placeholder.jpg",
      points: 30
    },
    {
      id: 3,
      title: "Título",
      description: "Descrição do desafio. Lorem ipsum...",
      image: "/placeholder.jpg",
      points: 30
    },
  ];

  return (
    <Card className="h-[280px] flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle>Desafios</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <div className="grid grid-cols-3 gap-4">
          {challenges.map((challenge) => (
            <ChallengeItem
              key={challenge.id}
              title={challenge.title}
              description={challenge.description}
              image={challenge.image}
              points={challenge.points}
            />
          ))}
        </div>
        <div className="mt-4 text-right">
          <a href="#" className="text-primary text-sm hover:underline">
            Ver tudo
          </a>
        </div>
      </CardContent>
    </Card>
  );
}