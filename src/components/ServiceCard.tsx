import { useState } from "react";
import { LucideIcon } from "lucide-react";

interface ServiceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  items: string[];
}

const ServiceCard = ({ icon: Icon, title, description, items }: ServiceCardProps) => {
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
          minHeight: "320px",
        }}
      >
        {/* Front - Icon & Title only */}
        <div
          className="absolute inset-0 bg-card rounded-xl border border-border flex flex-col items-center justify-center p-8"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
            <Icon className="w-9 h-9 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground text-center">{title}</h3>
        </div>

        {/* Back - Full details */}
        <div
          className="absolute inset-0 bg-card rounded-xl border border-border p-8 overflow-auto"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{description}</p>
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-foreground/80">
                <span className="text-primary mt-1 text-xs">●</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;
