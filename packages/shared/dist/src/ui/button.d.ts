import { ButtonHTMLAttributes } from 'react';
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
}
export declare const Button: import("react").ForwardRefExoticComponent<ButtonProps & import("react").RefAttributes<HTMLButtonElement>>;
export {};
