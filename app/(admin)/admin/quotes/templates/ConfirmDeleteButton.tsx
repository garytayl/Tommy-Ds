"use client";

type ConfirmDeleteButtonProps = {
  children: React.ReactNode;
  className?: string;
  message?: string;
};

export function ConfirmDeleteButton({
  children,
  className = "btn-danger",
  message = "Delete this template? This cannot be undone.",
}: ConfirmDeleteButtonProps) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
