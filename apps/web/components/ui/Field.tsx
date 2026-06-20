import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

/** Label + control + optional hint. The standard wrapper for any form input. */
export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label?: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <label className="ui-field" htmlFor={htmlFor}>
      {label && <span className="ui-field-label">{label}</span>}
      {children}
      {hint && <span className="ui-field-hint">{hint}</span>}
    </label>
  );
}

/** Styled text input. Pass-through props; styling lives in the `ui-input` class. */
export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`ui-input ${className}`.trim()} {...props} />;
}

/** Styled textarea. */
export function Textarea({
  className = "",
  rows = 3,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`ui-input ui-textarea ${className}`.trim()} rows={rows} {...props} />;
}
