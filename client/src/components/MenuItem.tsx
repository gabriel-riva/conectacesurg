import { useState } from "react";
import { Link } from "wouter";

interface MenuItemProps {
  href: string;
  icon: string;
  iconHover: string;
  label: string;
  isActive: boolean;
  className?: string;
}

export function MenuItem({ href, icon, iconHover, label, isActive, className = "" }: MenuItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <Link 
      href={href} 
      className={`menu-item ${isActive ? 'text-conecta-green' : ''} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img 
        src={isActive || isHovered ? iconHover : icon} 
        alt={label} 
        className="w-5 h-5 mr-2" 
      />
      {label}
    </Link>
  );
}