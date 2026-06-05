import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";

export default function GymPhoto({
  src,
  alt,
  className = "",
  iconClassName = "",
  fallbackClassName = "",
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={alt}
        onError={() => setHasError(true)}
        className={className}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-bg-input/60 text-text-dim ${className} ${fallbackClassName}`.trim()}
      aria-label={alt}
      role="img"
    >
      <Building2 className={iconClassName || "w-1/2 h-1/2"} />
    </div>
  );
}
