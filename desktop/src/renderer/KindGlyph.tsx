import {
  Bug,
  CircleQuestionMark,
  Lightbulb,
  Palette,
  Scissors,
  Telescope,
  Type,
} from "lucide-react";
import type { Kind } from "@/types/cellar";

export function KindGlyph({ kind, size = 14 }: { kind: Kind; size?: number }) {
  const props = { size, strokeWidth: 2, "aria-hidden": true as const };
  switch (kind) {
    case "idea":
      return <Lightbulb {...props} />;
    case "removal":
      return <Scissors {...props} />;
    case "glitch":
      return <Bug {...props} />;
    case "question":
      return <CircleQuestionMark {...props} />;
    case "research":
      return <Telescope {...props} />;
    case "copy":
      return <Type {...props} />;
    case "design":
      return <Palette {...props} />;
  }
}
