import { HTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        'rounded-lg border border-gray-200 bg-white shadow-sm',
        className
      )}
      {...props}
    />
  )
);

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx('px-6 py-4 border-b border-gray-200', className)}
      {...props}
    />
  )
);

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx('px-6 py-4', className)}
      {...props}
    />
  )
);

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx('px-6 py-4 border-t border-gray-200', className)}
      {...props}
    />
  )
);

Card.displayName = 'Card';
CardHeader.displayName = 'CardHeader';
CardContent.displayName = 'CardContent';
CardFooter.displayName = 'CardFooter';