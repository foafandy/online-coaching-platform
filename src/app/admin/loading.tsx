export default function AdminLoading() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8 space-y-3">
        <div className="h-3 w-24 rounded bg-ink-800" />
        <div className="h-8 w-56 rounded-lg bg-ink-800" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card h-[104px] animate-pulse p-5" />
        ))}
      </div>
      <div className="card mt-6 h-64 animate-pulse" />
      <span className="sr-only">جارٍ تحميل لوحة المدرب…</span>
    </div>
  );
}
