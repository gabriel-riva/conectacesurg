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
      <div className="h-32 bg-gray-200 flex items-center justify-center">
        <div className="text-center text-lg font-medium">IMAGEM</div>
      </div>
      <div className="p-3">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
        <div className="flex justify-end mt-2">
          <span className="text-primary text-sm font-medium">{points}pts</span>
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
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle>Desafios</CardTitle>
      </CardHeader>
      <CardContent>
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