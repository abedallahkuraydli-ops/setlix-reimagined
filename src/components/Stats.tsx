import { useEffect, useRef, useState } from "react";
import { Building2, Clock, Users, Smile } from "lucide-react";

const stats = [
  { icon: Building2, value: 20, suffix: "+", label: "Companies Registered" },
  { icon: Clock, value: 1, suffix: "", label: "Week Avg. Incorporation Time" },
  { icon: Users, value: 60, suffix: "+", label: "Digital Nomads Relocated" },
  { icon: Smile, value: 90, suffix: "%", label: "Client Satisfaction Rate" },
];

const StatItem = ({
  icon: Icon,
  value,
  suffix,
  label,
  start,
}: {
  icon: typeof Building2;
  value: number;
  suffix: string;
  label: string;
  start: boolean;
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start) return;
    const duration = 1500;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.ceil(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [start, value]);

  return (
    <div className="flex flex-col items-center text-center p-6 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors">
      <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-primary" />
      </div>
      <div className="text-4xl md:text-5xl font-bold text-foreground mb-2">
        {count}
        {suffix}
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
};

const Stats = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id="stats" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2 text-center">
          Setlix in Numbers
        </h2>
        <div className="w-16 h-1 bg-primary mx-auto mb-14 rounded-full" />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {stats.map((s) => (
            <StatItem key={s.label} {...s} start={visible} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
