import { cn } from "@/lib/utils";

type Tone = "blue" | "green" | "amber" | "red";

interface BannerProps {
  title: string;
  subtitle?: string;
  chips?: Array<{ label: string; tone?: Tone }>;
  className?: string;
}

const TONE_CLASSES: Record<Tone, string> = {
  blue: "bg-blue-100 text-blue-800 border-blue-200",
  green: "bg-green-100 text-green-800 border-green-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  red: "bg-red-100 text-red-800 border-red-200",
};

export function Banner({ title, subtitle, chips = [], className }: BannerProps) {
  return (
    <div className={cn("af-banner", className)}>
      <div>
        <div className="text-lg font-semibold text-gray-900">{title}</div>
        {subtitle && <div className="text-sm text-gray-600 mt-1">{subtitle}</div>}
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((c, i) => (
            <span
              key={i}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium border",
                TONE_CLASSES[c.tone ?? "blue"]
              )}
            >
              {c.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
