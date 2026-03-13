'use client'

export default function AdminLoading() {
  return (
    <div className="min-h-full p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* 标题骨架 */}
        <div className="h-8 bg-gray-200 rounded animate-pulse w-1/4" />

        {/* 卡片骨架 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>

        {/* 内容区骨架 */}
        <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />

        {/* 列表骨架 */}
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
