'use client';

import React from 'react';

interface ScrollLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
}

export default function ScrollLink({ href, children, onClick, ...props }: ScrollLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    // Custom click handler if passed
    if (onClick) onClick(e);

    const targetId = href.replace('#', '');
    const elem = document.getElementById(targetId);
    
    if (elem) {
      // Offset for the fixed navbar
      const navOffset = 80;
      const elementPosition = elem.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - navOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
