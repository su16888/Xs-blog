import { ReactNode } from 'react';
import './promo.css';

// 注意：页面标题由 page.tsx 从数据库 page_texts 表动态读取
// 不在此处设置静态 metadata，避免覆盖数据库配置

export default function PromoLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      {/* 预加载字体 - Inter + Noto Sans SC */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Noto+Sans+SC:wght@300;400;500;600;700&family=Noto+Serif+SC:wght@600;700;800&display=swap"
      />
      {children}
    </>
  );
}
