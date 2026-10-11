const LABELS = {
  veg: "Veg",
  nonveg: "Non-veg",
  egg: "Contains egg",
  both: "Veg or non-veg",
};

export default function DietMark({ diet, size = 14 }) {
  if (!diet || !LABELS[diet]) return null;

  if (diet === "both") {
    return (
      <span
        className="inline-flex gap-0.5"
        role="img"
        aria-label={LABELS[diet]}
      >
        <Mark diet="veg" size={size} />
        <Mark diet="nonveg" size={size} />
      </span>
    );
  }

  return (
    <span role="img" aria-label={LABELS[diet]}>
      <Mark diet={diet} size={size} />
    </span>
  );
}

function Mark({ diet, size }) {
  return <span className={`mark mark--${diet}`} style={{ width: size, height: size }} />;
}
