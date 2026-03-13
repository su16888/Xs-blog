'use client';

import { ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getServices, getImageUrl } from '@/lib/api';

interface Service {
  id: number;
  name: string;
  description: string;
  content: string;
  cover_image: string;
  price: string;
  category_id?: number;
  is_visible: boolean;
  is_recommended: boolean;
  sort_order: number;
  show_order_button: boolean;
  order_button_text?: string;
  order_button_url?: string;
  order_page_slug?: string | null;
  created_at: string;
  updated_at: string;
  Category?: {
    id: number;
    name: string;
    icon?: string;
  };
  specifications?: Array<{
    id: number;
    spec_name: string;
    spec_value: string;
    sort_order: number;
  }>;
}

interface ServicesProps {
  searchQuery?: string;
  limit?: number;
  showViewAll?: boolean;
}

export default function Services({ searchQuery = '', limit, showViewAll }: ServicesProps) {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, [searchQuery, limit]);

  const fetchServices = async () => {
    try {
      const params: { page?: number; limit?: number; search?: string } = {
        page: 1,
        limit: limit || 12
      };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const response = await getServices(params);

      // 后端返回格式: { success: true, data: { services: [], pagination: {} } }
      // getServices 已经返回 response.data，所以 response 就是 { success, data }
      if (response && response.success && response.data) {
        const servicesData = response.data.services || [];
        // 后端已经过滤了 is_visible，直接使用
        setServices(servicesData);
      } else if (response && Array.isArray(response)) {
        // 兼容旧格式（直接返回数组）
        setServices(response);
      } else {
        console.warn('Unexpected services response format:', response);
        setServices([]);
      }
    } catch (error) {
      console.error('Failed to fetch services:', error);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const getServiceDetailUrl = (service: Service) => {
    if (service.order_page_slug) {
      return service.order_page_slug.startsWith('/') ? service.order_page_slug : `/p/${service.order_page_slug}`;
    }
    return `/service-order/${service.id}`;
  };

  // 搜索过滤
  const filteredServices = services.filter((service) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const nameMatch = service.name?.toLowerCase().includes(query);
    const descMatch = service.description?.toLowerCase().includes(query);
    const priceMatch = service.price?.toLowerCase().includes(query);

    return nameMatch || descMatch || priceMatch;
  });

  const displayedServices = limit ? filteredServices.slice(0, limit) : filteredServices;

  if (loading) {
    return (
      <div className="bg-bg-secondary/40 rounded-2xl p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
          {[...Array(12)].map((_, i) => (
            <div key={i}>
              <div className="bg-bg-secondary rounded-xl shadow-sm border border-border-primary overflow-hidden animate-pulse">
                <div className="aspect-square bg-bg-tertiary"></div>
                <div className="p-3">
                  <div className="h-4 bg-bg-tertiary rounded w-3/4 mb-2"></div>
                  <div className="flex items-baseline justify-between">
                    <div className="h-5 bg-bg-tertiary rounded w-16"></div>
                    <div className="h-4 bg-bg-tertiary rounded w-12"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (filteredServices.length === 0) {
    return (
      <div className="bg-bg-secondary/40 rounded-2xl p-8 text-center">
        <ShoppingBag className="w-12 h-12 text-text-tertiary opacity-30 mx-auto mb-3" />
        <p className="text-text-secondary">暂无服务</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-bg-secondary/40 rounded-2xl p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
          {displayedServices.map((service, index) => (
            <div
              key={service.id}
              onClick={() => router.push(getServiceDetailUrl(service))}
              className="group bg-bg-secondary rounded-xl shadow-sm hover:shadow-xl hover:-translate-y-1 border border-border-primary transition-all duration-300 cursor-pointer overflow-hidden animate-fade-in"
            >
              {/* 服务封面图 - 1:1 正方形 */}
              <div className="relative aspect-square bg-bg-tertiary overflow-hidden">
                {service.cover_image ? (
                  <img
                    src={getImageUrl(service.cover_image)}
                    alt={service.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="w-16 h-16 text-text-tertiary opacity-30" />
                  </div>
                )}

                {/* 推荐标签 */}
                {service.is_recommended && (
                  <div className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-semibold" style={{ background: 'linear-gradient(to right, var(--accent-gradient-from), var(--accent-gradient-to))', color: 'var(--accent-text)' }}>
                    推荐
                  </div>
                )}
              </div>

              {/* 服务信息 */}
              <div className="p-3">
                <h3 className="text-base font-semibold text-text-primary group-hover:text-primary-500 transition-colors mb-2 line-clamp-1">
                  {service.name}
                </h3>

                {/* 价格 */}
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-bold text-primary-600">
                    <span className="text-base font-normal mr-0.5">¥</span>{service.price}
                  </span>
                  {service.Category && (
                    <span className="text-xs text-text-tertiary px-2 py-0.5 bg-bg-tertiary rounded">
                      {service.Category.icon && <span className="mr-1">{service.Category.icon}</span>}
                      {service.Category.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {showViewAll && (
          <div className="flex justify-center pt-6 mt-4">
            <a href="/services" className="px-6 py-2 bg-bg-secondary border border-border-primary rounded-full text-sm font-medium text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors shadow-sm">
              查看全部
            </a>
          </div>
        )}
      </div>
    </>
  );
}
