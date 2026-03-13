'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import api from '@/lib/api';
import { getAdminPath } from '@/lib/adminConfig';
import NotePage from '../note/[id]/page';
import DocsPage from '../docs/[...slug]/page';

const ADMIN_PAGES: Record<string, () => any> = {
  'login': () => require('../admins/login/page').default,
  'dashboard': () => require('../admins/dashboard/page').default,
  'settings': () => require('../admins/settings/page').default,
  'notes': () => require('../admins/notes/page').default,
  'galleries': () => require('../admins/galleries/page').default,
  'blog-theme': () => require('../admins/blog-theme/page').default,
  'other': () => require('../admins/other/page').default,
  'profile': () => require('../admins/profile/page').default,
  'promo-settings': () => require('../admins/promo-settings/page').default,
  'services': () => require('../admins/services/page').default,
  'sites': () => require('../admins/sites/page').default,
  'social-feed': () => require('../admins/social-feed/page').default,
  'social-links': () => require('../admins/social-links/page').default,
  'sticky-notes': () => require('../admins/sticky-notes/page').default,
  'text-settings': () => require('../admins/text-settings/page').default,
  'todos': () => require('../admins/todos/page').default,
};

export default function CustomSlugPage() {
  const params = useParams();
  const slug = params.slug as string | string[];
  const [state, setState] = useState<{ type: 'loading' | 'note' | 'doc' | 'admin' | '404', data?: any }>({ type: 'loading' });

  useEffect(() => {
    if (!slug || state.type !== 'loading') return;

    const checkSlug = async () => {
      const slugArray = Array.isArray(slug) ? slug : [slug];
      const firstSlug = slugArray[0];

      // 先检查是否是后台路径
      const adminPath = getAdminPath();
      if (adminPath === firstSlug) {
        setState({ type: 'admin', data: { adminPath: firstSlug, subPath: slugArray.slice(1) } });
        return;
      }

      // 再检查笔记
      try {
        const noteRes = await api.get(`/notes/${firstSlug}`);
        if (noteRes.data?.success && noteRes.data?.data?.id) {
          setState({ type: 'note', data: noteRes.data.data });
          return;
        }
      } catch (e) {}

      // 再检查文档
      try {
        const docRes = await api.get(`/markdown/${firstSlug}`);
        if (docRes.data?.success === true && docRes.data?.data?.content?.trim()) {
          setState({ type: 'doc', data: docRes.data.data });
          return;
        }
      } catch (e) {}

      setState({ type: '404' });
    };

    checkSlug();
  }, [slug, state.type]);

  if (state.type === 'loading') {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (state.type === '404') {
    notFound();
  }

  if (state.type === 'note') return <NotePage initialData={state.data} />;
  if (state.type === 'doc') return <DocsPage initialData={state.data} />;
  if (state.type === 'admin') {
    const AdminsLayout = require('../admins/layout').default;
    const subPath = state.data.subPath;

    if (subPath.length === 0) {
      const AdminsPage = require('../admins/page').default;
      return <AdminsLayout skipPathCheck={true}><AdminsPage /></AdminsLayout>;
    }

    const firstSubPath = subPath[0];
    const PageComponent = ADMIN_PAGES[firstSubPath];

    if (PageComponent) {
      const Page = PageComponent();
      return <AdminsLayout skipPathCheck={true}><Page /></AdminsLayout>;
    }

    notFound();
  }

  return null;
}
