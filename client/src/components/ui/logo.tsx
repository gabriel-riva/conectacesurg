import React from "react";
import logoAzulVerde from "@assets/Logo_AzulVerde.png";
import logoBrancoVerde from "@assets/Logo_BrancoVerde.png";
import logoCesurg from "@assets/logocesurg.png";

interface LogoProps {
  className?: string;
  variant?: "colored" | "white" | "cesurg";
}

export const Logo: React.FC<LogoProps> = ({ className, variant = "colored" }) => {
  const logoSrc = 
    variant === "white" ? logoBrancoVerde :
    variant === "cesurg" ? logoCesurg :
    logoAzulVerde;
  
  return (
    <img 
      src={logoSrc} 
      alt={variant === "cesurg" ? "Logo CESURG" : "Logo Conecta CESURG"} 
      className={className} 
    />
  );
};
