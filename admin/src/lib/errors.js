const MESSAGES = {
  NOT_STAFF: "This account doesn't have access to MOBA Admin.",
  BAD_TRANSITION: "That status change isn't allowed.",
  STATUS_CONFLICT: "Someone else already changed this order. Refresh and try again.",
  SESSION_CHANGED: "New orders arrived since you opened this. Refresh and try again.",
  SESSION_CLOSED: "This table was already freed.",
  PENDING_ORDERS: "There are unfinished orders at this table.",
  CANNOT_REOPEN: "This visit can't be reopened — a new one has started, or it's been more than 15 minutes.",
  NOT_FOUND: "Not found. It may have been deleted.",
  DUPLICATE_LABEL: "A table with that name already exists.",
  "23505": "That name is already taken.",
  "23503": "This can't be deleted because it has history. Turn it off instead.",
};

export function errorMessage(err) {
  const code =
    err?.code ||
    err?.message ||
    (typeof err === "string" ? err : "");
  return MESSAGES[code] || "Something went wrong. Please try again.";
}
