import Link from 'next/link';
import SiteFooter from '@/components/SiteFooter'

export const metadata = {
  title: '404 - 页面未找到',
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          {/* 404 数字 */}
          <div className="relative">
            <h1 className="text-[150px] md:text-[200px] font-bold select-none" style={{ color: 'var(--border-primary)' }}>
              404
            </h1>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-6xl animate-bounce">
                🔍
              </div>
            </div>
          </div>

          {/* 提示文字 */}
          <div className="mt-8 space-y-4">
            <h2 className="text-2xl md:text-3xl font-semibold text-text-primary">
              页面未找到
            </h2>
            <p className="text-text-secondary max-w-md mx-auto">
              抱歉，您访问的页面不存在或已被移除
            </p>
          </div>

          {/* 返回首页按钮 */}
          <div className="mt-12">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              返回首页
            </Link>
          </div>
        </div>
      </div>

      {/* 页脚版权 */}
      <SiteFooter />
    </div>
  );
}
