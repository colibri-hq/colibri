import type { HandleServerError } from "@sveltejs/kit";

export const handleError: HandleServerError = function handleError({
  error,
  event,
}) {
  console.error(`Server error on ${event.url.pathname}:`, error);

  return {
    message: "An error occurred. Please try again.",
  };
};
