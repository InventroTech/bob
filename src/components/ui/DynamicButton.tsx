import React from 'react';
import { cn } from '@/lib/utils';
import { Circle } from 'lucide-react';

export interface DynamicButtonProps {
  /**
   * Button text content
   */
  children: React.ReactNode;
  
  /**
   * Click handler
   */
  onClick?: () => void;
  
  /**
   * Button size - 'sm' | 'md' | 'lg'
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Button theme - 'dark' | 'light'
   * @default 'light'
   */
  theme?: 'dark' | 'light';
  
  /**
   * Button variant - 'solid' | 'outline' | 'ghost'
   * @default 'solid'
   */
  variant?: 'solid' | 'outline' | 'ghost';
  
  /**
   * Button state - 'default' | 'hover' | 'active' | 'disabled'
   * @default 'default'
   */
  state?: 'default' | 'hover' | 'active' | 'disabled';
  
  /**
   * Show radio button icon
   * @default false
   */
  showRadioIcon?: boolean;
  
  /**
   * Custom background color (overrides theme)
   */
  backgroundColor?: string;
  
  /**
   * Custom text color (overrides theme)
   */
  textColor?: string;
  
  /**
   * Custom height (overrides size)
   */
  height?: string | number;
  
  /**
   * Custom width
   */
  width?: string | number;
  
  /**
   * Full width button
   */
  fullWidth?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Button type
   */
  type?: 'button' | 'submit' | 'reset';
  
  /**
   * Disabled state
   */
  disabled?: boolean;
}

/**
 * Dynamic Button Component
 * A flexible button component that supports multiple themes, sizes, states, and styles
 */
export const DynamicButton: React.FC<DynamicButtonProps> = ({
  children,
  onClick,
  size = 'md',
  theme = 'light',
  variant = 'solid',
  state = 'default',
  showRadioIcon = false,
  backgroundColor,
  textColor,
  height,
  width,
  fullWidth = false,
  className,
  type = 'button',
  disabled = false,
}) => {
  // Determine if button should be disabled
  const isDisabled = disabled || state === 'disabled';
  
  // Size configurations
  const sizeConfig = {
    sm: {
      height: height || 'h-9',
      padding: 'px-4 py-2',
      textSize: 'text-sm',
      iconSize: 14,
    },
    md: {
      height: height || 'h-10',
      padding: 'px-6 py-2.5',
      textSize: 'text-base',
      iconSize: 16,
    },
    lg: {
      height: height || 'h-12',
      padding: 'px-8 py-3',
      textSize: 'text-lg',
      iconSize: 18,
    },
  };
  
  const currentSize = sizeConfig[size];
  
  // Theme and state color configurations
  const getThemeColors = () => {
    if (backgroundColor && textColor) {
      return {
        bg: backgroundColor,
        text: textColor,
        icon: textColor,
      };
    }
    
    if (theme === 'dark') {
      switch (state) {
        case 'hover':
          return {
            bg: '#000000',
            text: '#FFFFFF',
            icon: '#FFFFFF',
          };
        case 'active':
          return {
            bg: '#1A1A1A',
            text: '#FFFFFF',
            icon: '#FFFFFF',
          };
        case 'disabled':
          return {
            bg: '#F5F5F5',
            text: '#D3D3D3',
            icon: '#D3D3D3',
          };
        default:
          return {
            bg: '#2D2D2D',
            text: '#FFFFFF',
            icon: '#FFFFFF',
          };
      }
    } else {
      // Light theme
      switch (state) {
        case 'hover':
          return {
            bg: '#E5E5E5',
            text: '#1F1F1F',
            icon: '#1F1F1F',
          };
        case 'active':
          return {
            bg: '#D4D4D4',
            text: '#1F1F1F',
            icon: '#1F1F1F',
          };
        case 'disabled':
          return {
            bg: '#F5F5F5',
            text: '#E0E0E0',
            icon: '#E0E0E0',
          };
        default:
          return {
            bg: '#F0F0F0',
            text: '#1F1F1F',
            icon: '#1F1F1F',
          };
      }
    }
  };
  
  const colors = getThemeColors();
  
  // Variant styles
  const getVariantStyles = () => {
    if (variant === 'outline') {
      return {
        border: `1px solid ${colors.text}`,
        background: 'transparent',
      };
    }
    if (variant === 'ghost') {
      return {
        border: 'none',
        background: 'transparent',
      };
    }
    return {
      border: 'none',
      background: colors.bg,
    };
  };
  
  const variantStyles = getVariantStyles();
  
  // Build inline styles
  const buttonStyles: React.CSSProperties = {
    backgroundColor: variantStyles.background === 'transparent' ? 'transparent' : colors.bg,
    color: colors.text,
    border: variantStyles.border,
    height: typeof height === 'number' ? `${height}px` : height || undefined,
    width: fullWidth ? '100%' : typeof width === 'number' ? `${width}px` : width || undefined,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.6 : 1,
  };
  
  return (
    <button
      type={type}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200',
        currentSize.padding,
        currentSize.textSize,
        !height && currentSize.height,
        fullWidth && 'w-full',
        !isDisabled && 'hover:opacity-90 active:scale-[0.98]',
        className
      )}
      style={buttonStyles}
    >
      {showRadioIcon && (
        <Circle
          className="flex-shrink-0"
          size={currentSize.iconSize}
          style={{ color: colors.icon }}
          strokeWidth={1.5}
        />
      )}
      <span>{children}</span>
    </button>
  );
};

export default DynamicButton;

