import { type ComponentProps, type FC } from 'react';
import { twMerge } from 'tailwind-merge';

interface IconProps extends ComponentProps<'span'> {
  icon: FC<ComponentProps<'svg'>>;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export const Icon: FC<IconProps> = ({
  icon: IconComponent,
  size = 'md',
  interactive = false,
  className,
  ...props
}) => {
  return (
    <span
      className={twMerge(
        'inline-flex items-center justify-center',
        interactive && 'rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <IconComponent className="w-full h-full" aria-hidden="true" />
    </span>
  );
}; 