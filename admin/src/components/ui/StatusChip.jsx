const LABELS = {
  placed: "New",
  preparing: "Cooking",
  served: "Served",
  cancelled: "Cancelled",
};

export default function StatusChip({ status }) {
  return (
    <span className={`status-chip status-chip--${status}`}>
      {LABELS[status] || status}
    </span>
  );
}
