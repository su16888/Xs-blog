// 后台页面路径配置
const ADMIN_PATH = process.env.NEXT_PUBLIC_ADMIN_PATH || 'admins';

// 获取后台页面路径
export const getAdminPath = (): string => {
  return ADMIN_PATH;
};

// 获取后端 API 路径（固定为 admin）
export const getAdminApiPath = (): string => {
  return 'admin';
};

// 生成前端页面路由 URL
export const getAdminUrl = (path: string = ''): string => {
  const adminPath = getAdminPath();
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `/${adminPath}${cleanPath ? `/${cleanPath}` : ''}`;
};

// 获取前端页面路由对象（用于 useRouter 的 push 方法）
export const getAdminRoute = (path: string = ''): string => {
  return getAdminUrl(path);
};

// 检查当前路径是否为后台路径
export const isAdminPage = (pathname: string): boolean => {
  // 排除 /note/ 路径（笔记详情页）
  if (pathname.startsWith('/note/')) {
    return false;
  }

  // 检查是否为后台管理路径
  const adminPath = getAdminPath();
  return pathname.startsWith(`/${adminPath}`);
};