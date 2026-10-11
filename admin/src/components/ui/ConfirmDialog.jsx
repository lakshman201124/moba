import Modal from "./Modal";

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  loading = false,
  children,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {message && <p className="text-ink/70 mb-4">{message}</p>}
      {children}
      <div className="flex gap-3 justify-end mt-4">
        <button onClick={onClose} className="btn-secondary" disabled={loading}>
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className={danger ? "btn-danger" : "btn-primary"}
          disabled={loading}
        >
          {loading ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
