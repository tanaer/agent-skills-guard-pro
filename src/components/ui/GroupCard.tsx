import { ReactNode } from "react";

interface GroupCardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function GroupCard({ title, children, className = "" }: GroupCardProps) {
  return (
    <div className={className}>
      {title && (
        <div className="macos-section-title">{title}</div>
      )}
      <div className="macos-card overflow-hidden">
        {children}
      </div>
    </div>
  );
}

interface GroupCardItemProps {
  children: ReactNode;
  className?: string;
  noBorder?: boolean;
}

export function GroupCardItem({ children, className = "", noBorder = false }: GroupCardItemProps) {
  return (
    <div className={`px-4 py-3 ${noBorder ? "" : "border-b border-border last:border-b-0"} ${className}`}>
      {children}
    </div>
  );
}
