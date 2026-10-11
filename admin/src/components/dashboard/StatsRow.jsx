import { rupee } from "../../lib/format";

export default function StatsRow({ data }) {
  const stats = [
    { label: "Orders today", value: data.ordersToday },
    { label: "Order value", value: rupee(data.valueToday) },
    { label: "Waiting", value: data.waiting, highlight: data.waiting > 0 },
    {
      label: "Tables occupied",
      value: `${data.openTables} / ${data.activeTables}`,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="card text-center py-4">
          <p
            className={`font-display text-2xl ${s.highlight ? "text-orange" : ""}`}
          >
            {s.value}
          </p>
          <p className="text-xs text-ink/50 mt-1">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
