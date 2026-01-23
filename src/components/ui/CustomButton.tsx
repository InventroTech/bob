import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface CustomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Button text content
   */
  children: React.ReactNode;
  
  /**
   * Button variant
   */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  
  /**
   * Button size
   */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  
  /**
   * Icon to display before the text
   */
  icon?: React.ReactNode;
  
  /**
   * Icon to display after the text
   */
  iconRight?: React.ReactNode;
  
  /**
   * Loading state
   */
  loading?: boolean;
  
  /**
   * Full width button
   */
  fullWidth?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * CustomButton Component
 * A reusable button component that wraps the base Button with additional features
 */
export const CustomButton: React.FC<CustomButtonProps> = ({
  children,
  variant = 'default',
  size = 'default',
  icon,
  iconRight,
  loading = false,
  fullWidth = false,
  className,
  disabled,
  ...props
}) => {
  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || loading}
      className={cn(
        'flex items-center gap-2',
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          {children}
          {iconRight && <span className="flex-shrink-0">{iconRight}</span>}
        </>
      )}
    </Button>
  );
};

export default CustomButton;
