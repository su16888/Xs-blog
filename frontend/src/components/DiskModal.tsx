'use client';

import React, { useState, useEffect } from 'react';
import DiskCarousel from './DiskCarousel';
import { safeFetch } from '@/lib/utils';

interface Disk {
  id: number;
  disk_name: string;
  title: string;
  file_size?: string;
  extract_code?: string;
  download_url?: string;
  created_at: string;
}

interface DiskModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: number;
  isAdmin?: boolean;
  password?: string;
}

export default function DiskModal({ isOpen, onClose, noteId, isAdmin = false, password }: DiskModalProps) {
  const [disks, setDisks] = useState<Disk[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDisk, setEditingDisk] = useState<Disk | null>(null);
  const [formData, setFormData] = useState({
    disk_name: '',
    title: '',
    file_size: '',
    extract_code: '',
    download_url: ''
  });

  useEffect(() => {
    if (isOpen && noteId) {
      fetchDisks();
    }
  }, [isOpen, noteId]);

  const fetchDisks = async () => {
    setLoading(true);
    try {
      let apiPath = isAdmin ? `/api/admin/notes/${noteId}/disks` : `/api/notes/${noteId}/disks`;

      // 如果是前台访问且有密码，添加密码参数
      if (!isAdmin && password) {
        apiPath += `?password=${encodeURIComponent(password)}`;
      }

      // 如果是管理员模式，需要携带token
      const headers: HeadersInit = {};
      if (isAdmin) {
        let token: string | null = null;
        try {
          token = localStorage.getItem('token');
        } catch (storageError) {
          console.error('无法访问 localStorage:', storageError);
          setLoading(false);
          return;
        }
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const response = await safeFetch(apiPath, { headers }, false);
      const data = await response.json();
      if (data.success) {
        setDisks(data.data);
      }
    } catch (error) {
      console.error('获取网盘列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDisk = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let token: string | null = null;
      try {
        token = localStorage.getItem('token');
      } catch (storageError) {
        console.error('无法访问 localStorage:', storageError);
        return;
      }

      const apiPath = isAdmin ? `/api/admin/notes/${noteId}/disks` : `/api/notes/${noteId}/disks`;
      const response = await safeFetch(apiPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.success) {
        setFormData({ disk_name: '', title: '', file_size: '', extract_code: '', download_url: '' });
        setShowAddForm(false);
        fetchDisks();
      }
    } catch (error) {
      console.error('添加网盘失败:', error);
    }
  };

  const handleEditDisk = (disk: Disk) => {
    setEditingDisk(disk);
    setFormData({
      disk_name: disk.disk_name,
      title: disk.title,
      file_size: disk.file_size || '',
      extract_code: disk.extract_code || '',
      download_url: disk.download_url || ''
    });
    setShowAddForm(true);
  };

  const handleUpdateDisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDisk) return;

    try {
      let token: string | null = null;
      try {
        token = localStorage.getItem('token');
      } catch (storageError) {
        console.error('无法访问 localStorage:', storageError);
        return;
      }

      const apiPath = isAdmin
        ? `/api/admin/notes/${noteId}/disks/${editingDisk.id}`
        : `/api/notes/${noteId}/disks/${editingDisk.id}`;
      const response = await safeFetch(apiPath, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.success) {
        setFormData({ disk_name: '', title: '', file_size: '', extract_code: '', download_url: '' });
        setShowAddForm(false);
        setEditingDisk(null);
        fetchDisks();
      }
    } catch (error) {
      console.error('更新网盘失败:', error);
    }
  };

  const handleDeleteDisk = async (diskId: number) => {
    if (!confirm('确定要删除这个网盘吗？')) return;
    try {
      let token: string | null = null;
      try {
        token = localStorage.getItem('token');
      } catch (storageError) {
        console.error('无法访问 localStorage:', storageError);
        return;
      }

      const apiPath = isAdmin
        ? `/api/admin/notes/${noteId}/disks/${diskId}`
        : `/api/notes/${noteId}/disks/${diskId}`;
      const response = await safeFetch(apiPath, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        fetchDisks();
      }
    } catch (error) {
      console.error('删除网盘失败:', error);
    }
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingDisk(null);
    setFormData({ disk_name: '', title: '', file_size: '', extract_code: '', download_url: '' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      {/* 弹窗容器 */}
      <div 
        className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full transition-all scale-100 ${
          isAdmin 
            ? 'max-w-md max-h-[85vh] overflow-hidden flex flex-col' 
            : 'max-w-[420px] overflow-hidden'
        }`} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">网盘资源</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容区域 */}
        <div className={`p-5 ${isAdmin ? 'overflow-y-auto flex-1' : ''}`}>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-4">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : !isAdmin && disks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4">
              <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-gray-400 text-xs">暂无网盘资源</p>
            </div>
          ) : !isAdmin && disks.length > 0 ? (
            <DiskCarousel disks={disks} />
          ) : null}

          {/* 管理员功能 - 缩小25% */}
          {isAdmin && (
            <div className="mt-3 sm:mt-4">
              {!showAddForm ? (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full py-2 sm:py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg sm:rounded-xl transition-all shadow-md hover:shadow-lg text-sm font-medium flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  添加网盘
                </button>
              ) : (
                <form onSubmit={editingDisk ? handleUpdateDisk : handleAddDisk} className="space-y-3 sm:space-y-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 pb-2 sm:pb-3 border-b border-gray-300 dark:border-gray-600">
                    <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                      {editingDisk ? '编辑网盘信息' : '添加新网盘'}
                    </h3>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 sm:mb-1.5 flex items-center gap-1.5">
                      <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                      </svg>
                      网盘名称
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.disk_name}
                      onChange={(e) => setFormData({ ...formData, disk_name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all"
                      placeholder="如：百度网盘、阿里云盘"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 sm:mb-1.5 flex items-center gap-1.5">
                      <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      资源标题
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 text-sm border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all"
                      placeholder="如：高级网页设计教程.pdf"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 sm:mb-1.5 flex items-center gap-1">
                        <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className="hidden sm:inline">文件</span>大小
                      </label>
                      <input
                        type="text"
                        value={formData.file_size}
                        onChange={(e) => setFormData({ ...formData, file_size: e.target.value })}
                        className="w-full px-3 py-2 text-sm border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all"
                        placeholder="如：150MB"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 sm:mb-1.5 flex items-center gap-1">
                        <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        提取码
                      </label>
                      <input
                        type="text"
                        value={formData.extract_code}
                        onChange={(e) => setFormData({ ...formData, extract_code: e.target.value })}
                        className="w-full px-3 py-2 text-sm border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all font-mono"
                        placeholder="如：1234"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 sm:mb-1.5 flex items-center gap-1.5">
                      <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      下载链接
                    </label>
                    <input
                      type="url"
                      value={formData.download_url}
                      onChange={(e) => setFormData({ ...formData, download_url: e.target.value })}
                      className="w-full px-3 py-2 text-sm border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all"
                      placeholder="https://"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 py-2 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg text-sm font-medium flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {editingDisk ? '更新' : '添加'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelForm}
                      className="flex-1 py-2 px-3 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      取消
                    </button>
                  </div>
                </form>
              )}

              {/* 管理列表 - 缩小25% */}
              {isAdmin && disks.length > 0 && !showAddForm && (
                <div className="mt-3 sm:mt-4 space-y-2">
                  <div className="flex items-center gap-1.5 mb-2">
                    <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">管理网盘</p>
                  </div>
                  {disks.map((disk) => (
                    <div key={disk.id} className="flex items-center justify-between p-2 sm:p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">{disk.title}</p>
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">{disk.disk_name}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 ml-2">
                        <button
                          onClick={() => handleEditDisk(disk)}
                          className="px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors font-medium"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteDisk(disk.id)}
                          className="px-2 sm:px-3 py-1 sm:py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md transition-colors font-medium"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部提示 - 仅前台显示 */}
        {!isAdmin && (
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800">
            <p className="text-[10px] text-center text-gray-400">
              如发现资源失效请反馈
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

