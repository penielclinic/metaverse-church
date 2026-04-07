export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-indigo-950 flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      <p className="text-indigo-300 text-sm">불러오는 중...</p>
    </div>
  )
}
