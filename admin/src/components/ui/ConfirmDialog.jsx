import Modal from "./Modal";

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  loading = false,
  children,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary" disabled={loading}>
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className={`btn ${danger ? "btn-danger" : "btn-primary"}`} disabled={loading}>
            {loading ? "Working…" : confirmLabel}
          </button>
        </>
      }
    >
      {message && <p className="text-body text-ink-2">{message}</p>}
      {children}
    </Modal>
  );
}
