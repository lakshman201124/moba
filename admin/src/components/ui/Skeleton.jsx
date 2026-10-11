export default function Skeleton({ className = "", count = 1, style }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} aria-hidden="true" style={style} className={`skeleton ${className}`} />
      ))}
    </>
  );
}
