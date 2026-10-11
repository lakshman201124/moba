export default function Skeleton({ className = "", count = 1 }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-ink/8 rounded-lg ${className}`}
        />
      ))}
    </>
  );
}
