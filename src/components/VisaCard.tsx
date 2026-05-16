import { useState } from "react";
import { LucideIcon } from "lucide-react";

interface VisaCardProps {
  icon: LucideIcon;
  title: string;
  code?: string;
  group: string;
  duration: string;
  description: string;
  whoFor: string[];
}

const VisaCard = ({ icon: Icon, title, code, group, duration, description, whoFor }: VisaCardProps) => {
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
          <p className="text-xs text-muted-foreground mt-3">{group} · {duration}</p>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 bg-card rounded-xl border border-border p-6 overflow-auto"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{description}</p>
          <ul className="space-y-2">
            {whoFor.map((w) => (
              <li key={w} className="flex items-start gap-2 text-sm text-foreground/80">
                <span className="text-primary mt-1 text-xs">●</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VisaCard;
