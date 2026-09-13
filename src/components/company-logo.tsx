import Image from "next/image";
import { getInitials, getCompanyLogoHue } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface CompanyLogoProps {
  name: string;
  logo?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  rounded?: boolean;
}

const sizeMap = {
  sm: "h-9 w-9 text-sm",
  md: "h-11 w-11 text-base",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-2xl",
};

const imageSizeMap = {
  sm: 36,
  md: 44,
  lg: 56,
  xl: 80,
};

export function CompanyLogo({
  name,
  logo,
  size = "md",
  className,
  rounded = true,
}: CompanyLogoProps) {
  const initials = getInitials(name);
  const hue = getCompanyLogoHue(name);

  if (logo) {
    return (
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center bg-white",
          sizeMap[size],
          rounded && "rounded-xl",
          className
        )}
      >
        <Image
          src={logo}
          alt={`${name} logo`}
          width={imageSizeMap[size]}
          height={imageSizeMap[size]}
          className="object-contain"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
            const fallback = e.currentTarget.parentElement?.querySelector("[data-fallback]") as HTMLElement | null;
            if (fallback) fallback.style.display = "flex";
          }}
        />
        <div
          data-fallback
          style={{ display: "none", backgroundColor: `hsl(${hue} 60% 94%)`, color: `hsl(${hue} 45% 35%)` }}
          className={cn("flex h-full w-full items-center justify-center font-bold", sizeMap[size], rounded && "rounded-xl")}
        >
          {initials}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center font-bold",
        sizeMap[size],
        rounded && "rounded-xl",
        className
      )}
      style={{ backgroundColor: `hsl(${hue} 60% 94%)`, color: `hsl(${hue} 45% 35%)` }}
      aria-label={`${name} logo`}
    >
      {initials}
    </div>
  );
}

export function CompanyLogoFallback({ name, size = "md", className, rounded = true }: Omit<CompanyLogoProps, "logo">) {
  return <CompanyLogo name={name} size={size} className={className} rounded={rounded} />;
}