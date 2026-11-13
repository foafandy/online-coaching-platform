export default function DashboardLoading() {
  return (
    <div className="animate-fade-in space-y-5">
      <div className="card h-48 animate-pulse" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card h-[92px] animate-pulse p-4" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card h-64 animate-pulse" />
        <div className="card h-64 animate-pulse" />
      </div>
      <span className="sr-only">جارٍ تحميل لوحة التحكم…</span>
    </div>
  );
}
