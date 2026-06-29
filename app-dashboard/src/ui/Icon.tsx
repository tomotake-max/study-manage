import { icons } from "lucide-react";
import type React from "react";

export function Icon({ name, size = 18, color = "currentColor" }: { name: string; size?: number; color?: string }) {
  const key = name.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join("");
  const C = (icons as Record<string, React.FC<{ size?: number; color?: string }>>)[key];
  return C ? <C size={size} color={color} /> : null;
}
