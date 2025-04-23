import { useState } from "react";
import { Link } from "wouter";

interface MenuItemProps {
  href: string;
  icon: string;
  iconHover: string; // Mantendo o parâmetro para não quebrar as chamadas existentes
  label: string;
  isActive: boolean;
  className?: string;
}

export function MenuItem({ href, icon, iconHover, label, isActive, className = "" }: MenuItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <Link 
      href={href} 
      className={`menu-item ${isActive ? 'menu-item-active' : ''} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`menu-item-content ${isHovered && !isActive ? 'menu-item-hover' : ''}`}>
        <img 
          src={icon}
          alt={label} 
          className="w-5 h-5 mr-2" 
        />
        {label}
      </div>
    </Link>
  );
}