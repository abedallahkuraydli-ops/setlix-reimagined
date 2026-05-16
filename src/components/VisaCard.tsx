import { useState } from "react";
import { LucideIcon } from "lucide-react";

interface VisaCardProps {
  icon: LucideIcon;
  title: string;
  code?: string;
  description: string;
}

const VisaCard = ({ icon: Icon, title, code, description }: VisaCardProps) => {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="relative cursor-pointer"
      style={{ perspective: "1000px" }}
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      onClick={() => setFlipped((prev) => !prev)}
    >
      <div
        className="relative w-full transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          minHeight: "280px",
        }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 bg-card rounded-xl border border-border flex flex-col items-center justify-center p-6 text-center"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
            <Icon className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground leading-tight">{title}</h3>
          {code && (
            <span className="mt-2 text-[10px] font-semibold tracking-wide uppercase bg-primary/10 text-primary rounded px-1.5 py-0.5">
              {code}
            </span>
          )}
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 bg-card rounded-xl border border-border p-6 flex items-center justify-center overflow-auto"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <p className="text-muted-foreground text-sm leading-relaxed text-center">{description}</p>
        </div>
      </div>
    </div>
  );
};

export default VisaCard;
