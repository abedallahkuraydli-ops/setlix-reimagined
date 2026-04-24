interface LogoProps {
  className?: string;
  showText?: boolean;
  textClassName?: string;
  iconClassName?: string;
}

/**
 * Setlix brand logo (star mark + wordmark).
 * Uses the same SVG star as the public homepage navbar so the brand
 * is consistent everywhere (auth screens, sidebars, footer, etc.).
 */
export const Logo = ({
  className = "",
  showText = true,
  textClassName = "text-primary-foreground font-bold text-xl tracking-wider",
  iconClassName = "w-8 h-8 text-primary-foreground",
}: LogoProps) => {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 24 24"
        className={iconClassName}
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 2 L13.2 9 L20 4.5 L15.5 11.3 L22 12 L15.5 12.7 L20 19.5 L13.2 15 L12 22 L10.8 15 L4 19.5 L8.5 12.7 L2 12 L8.5 11.3 L4 4.5 L10.8 9 Z" />
      </svg>
      {showText && <span className={textClassName}>SETLIX</span>}
    </span>
  );
};

export default Logo;
