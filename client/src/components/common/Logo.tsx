import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = '' }) => {
  return (
    <div className={`d-flex align-items-center ${className}`}>
      <img 
        src="/logo-no-bg.png" 
        alt="Hospital Logo" 
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
        }}
      />
      <img 
        src="/logo-2.png" 
        alt="Hospital Logo 2" 
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
        }}
      />
    </div>
  );
};

export default Logo;
