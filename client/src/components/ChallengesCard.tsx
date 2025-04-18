import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChallengeCardProps {
  title: string;
  description: string;
  image: string;
  points: number;
}

function ChallengeItem({ title, description, image, points }: ChallengeCardProps) {
  return (
    <div className="flex flex-col rounded-md overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 transform hover:translate-y-[-2px] group">
      <div className="h-24 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
        <div className="text-center text-sm font-medium">IMAGEM</div>
      </div>
      <div className="p-3 bg-white">
        <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{description}</p>
        <div className="flex justify-end mt-2">
          <span className="text-primary text-xs font-medium bg-primary/10 px-2 py-0.5 rounded-full">{points}pts</span>
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
    <Card className="h-[280px] flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 border-none">
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="text-primary/90 flex items-center">
          <span className="inline-block w-1 h-5 bg-primary rounded mr-2"></span>
          Desafios
        </CardTitle>
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