import React from "react";
import logoImage from "@assets/Logo_fundoTransparente.png";

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className }) => {
  return (
    <img 
      src={logoImage} 
      alt="Logo Conecta CESURG" 
      className={className} 
    />
  );
};
