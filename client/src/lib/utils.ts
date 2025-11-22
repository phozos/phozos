import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow, parseISO } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type DateFormat = "short" | "long" | "relative";

export function formatDate(
  date: string | Date | null | undefined,
  formatType: DateFormat = "short"
): string {
  if (!date) return "N/A";

  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;

    switch (formatType) {
      case "short":
        return format(dateObj, "MMM d, yyyy");
      case "long":
        return format(dateObj, "MMMM d, yyyy, h:mm a");
      case "relative":
        return formatDistanceToNow(dateObj, { addSuffix: true });
      default:
        return format(dateObj, "MMM d, yyyy");
    }
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid date";
  }
}
