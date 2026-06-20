import type { ButtonHTMLAttributes } from "react";

import { Icon, type IconName } from "@/components/Icon";

type Variant = "primary" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md";

/**
 * The one button. Variants cover the surfaces we actually have (primary action,
 * neutral ghost, destructive, subtle inline). `icon` renders a leading glyph.
 * Everything else is a normal <button> | type defaults to "button" so it never
 * submits a form by accident.
 */
export function Button({
  variant = "primary",
  size = "md",
  icon,
  className = "",
  type = "button",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
}) {
  return (
    <button
      type={type}
      className={`ui-btn ui-btn-${variant} ui-btn-${size} ${className}`.trim()}
      {...props}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 15 : 17} />}
      {children}
    </button>
  );
}
