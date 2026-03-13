'use client';

import React from 'react';
import { Clock, Pin, Folder, Hash, Vote, ClipboardList, Gift, HardDrive } from 'lucide-react';
import { getApiBaseUrl, truncate, formatDate } from '@/lib/utils';
import { stripMarkdown } from '@/lib/markdown';

const API_BASE_URL = getApiBaseUrl();

export interface Note {
  id: number;
  title: string;
  content: string;
  summary?: string;
  is_published: boolean;
  is_pinned?: boolean;
  published_at?: string;
  created_at: string;
  media_type?: 'none' | 'image' | 'video' | 'music';
  media_urls?: string[];
  external_link?: string;
  category?: string;
  category_id?: number;
  tags?: string;
  password?: string;
  requiresPassword?: boolean;
  cover_image?: string;
  Tags?: Array<{
    id: number;
    name: string;
    color?: string;
  }>;
  source_type?: 'none' | 'original' | 'reprint';
  source_url?: string;
  source_text?: string;
  has_poll?: boolean;
  has_survey?: boolean;
  has_lottery?: boolean;
  has_disk?: boolean;
}

export type NoteCardProps = {
  note: Note;
  isHorizontal: boolean;
  imagePosition?: 'left' | 'right' | 'top';
  isDesktop: boolean;
  columns: number;
  showCover: boolean;
  defaultCover: string;
  showSummary: boolean;
  showNoteTags: boolean;
  showNoteCategories: boolean;
  onOpen: (note: Note) => void;
  onTagClick: (tagName: string) => void;
  onCategoryClick: (categoryName: string) => void;
  isAdmin: boolean;
};

const NoteCard = React.memo(({
  note,
  isHorizontal,
  imagePosition = 'left',
  isDesktop,
  columns,
  showCover,
  defaultCover,
  showSummary,
  showNoteTags,
  showNoteCategories,
  onOpen,
  onTagClick,
  onCategoryClick,
  isAdmin
}: NoteCardProps) => {
  const title = note.title || '无标题';
  const dateLabel = formatDate(note.published_at || note.created_at, 'YYYY-MM-DD');
  const hasSpecialBadges = Boolean(note.has_poll || note.has_survey || note.has_lottery || note.has_disk);
  const coverImage = note.cover_image || defaultCover;
  const coverImageUrl = coverImage
    ? (coverImage.startsWith('http') ? coverImage : `${API_BASE_URL}${coverImage}`)
    : '';
  const showCoverImage = showCover && Boolean(coverImageUrl);

  // 渲染特殊功能徽标 (抽奖、问卷、投票、资源) - 手机端放在封面图右上角
  const renderSpecialBadges = () => {
    const badges = [];
    if (note.has_poll) badges.push({ label: '投票', color: 'blue', icon: Vote });
    if (note.has_survey) badges.push({ label: '问卷', color: 'emerald', icon: ClipboardList });
    if (note.has_lottery) badges.push({ label: '抽奖', color: 'amber', icon: Gift });
    if (note.has_disk) badges.push({ label: '含资源', color: 'violet', icon: HardDrive });

    if (badges.length === 0) return null;

    // 手机端：渲染在封面图右上角
    if (!isDesktop) {
      return (
        <div className="absolute top-1 right-1 flex flex-col gap-1 z-10">
          {badges.map((badge, index) => {
            const Icon = badge.icon;
            return (
              <span
                key={index}
                className={`inline-flex items-center gap-[2.2px] text-[10px] px-[4.5px] py-[2.2px] rounded-lg border backdrop-blur-sm
                  ${badge.color === 'blue' ? 'bg-blue-500/90 text-white border-blue-400' : ''}
                  ${badge.color === 'emerald' ? 'bg-emerald-500/90 text-white border-emerald-400' : ''}
                  ${badge.color === 'amber' ? 'bg-amber-500/90 text-white border-amber-400' : ''}
                  ${badge.color === 'violet' ? 'bg-violet-500/90 text-white border-violet-400' : ''}
                `}
              >
                <Icon className="w-[11px] h-[11px]" />
                {badge.label}
              </span>
            );
          })}
        </div>
      );
    }

    // 电脑端：渲染在内容区域
    return (
      <div className="flex flex-wrap gap-2 mt-px mb-1">
        {badges.map((badge, index) => {
          const Icon = badge.icon;
          return (
            <span
              key={index}
              className={`inline-flex items-center gap-1 text-[10px] leading-none px-1.5 py-0.5 rounded border
                ${badge.color === 'blue' ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30' : ''}
                ${badge.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/30' : ''}
                ${badge.color === 'amber' ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30' : ''}
                ${badge.color === 'violet' ? 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800/30' : ''}
              `}
            >
              <Icon className="w-3 h-3" />
              {badge.label}
            </span>
          );
        })}
      </div>
    );
  };

  // 渲染底部信息 - 手机端不显示，电脑端显示时间、分类、标签
  const renderBottomMeta = () => {
    // 手机端不显示底部信息
    if (!isDesktop) return null;

    const hasSummaryContent = Boolean(note.summary || (note.content && truncate(stripMarkdown(note.content), 60)));
    const maxTags = (columns >= 2 && hasSummaryContent && !isDesktop) ? 1 : undefined;

    // 获取标签列表
    const tagsToShow = note.Tags && note.Tags.length > 0
      ? note.Tags.slice(0, maxTags)
      : note.tags
        ? note.tags.split(',').filter(Boolean).slice(0, maxTags).map((tag, idx) => ({ id: idx, name: tag.trim(), color: undefined }))
        : [];

    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-auto pt-[0.6rem] pb-0 text-xs text-text-tertiary border-t border-[color:var(--note-divider)]">
        {/* 电脑端：显示时间、分类、标签 */}
        <>
          {/* 时间 */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{dateLabel}</span>
          </div>

          {/* 分类 */}
          {showNoteCategories && note.category && (
            <div
              className="flex items-center gap-1 hover:text-primary-500 cursor-pointer transition-colors flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onCategoryClick(note.category!);
              }}
            >
              <Folder className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{note.category}</span>
            </div>
          )}

          {/* 标签 */}
          {showNoteTags && tagsToShow.map((tag) => (
            <span
              key={tag.id}
              className="flex items-center gap-0.5 hover:text-primary-500 cursor-pointer transition-colors flex-shrink-0"
              style={tag.color ? { color: tag.color } : undefined}
              onClick={(e) => {
                e.stopPropagation();
                onTagClick(tag.name);
              }}
            >
              <Hash className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate">{tag.name}</span>
            </span>
          ))}
        </>
      </div>
    );
  };

  // 卡片容器样式
  const containerClasses = `
    note-card group relative w-full h-full text-left rounded-xl transition-all duration-300 cursor-pointer overflow-hidden
    bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50
    hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-gray-900/20 hover:-translate-y-0.5
    ${isAdmin ? 'ring-1 ring-gray-200 dark:ring-gray-700' : ''}
  `;

  // 标题区域 - 根据设备类型和布局调整
  const renderTitle = () => {
    // 手机端：2行，字体13px，行高1.4
    // 电脑端横向布局：1行，字体16px
    // 电脑端纵向布局：1行，字体14px
    let titleClass = '';
    let titleStyle: React.CSSProperties = {};

    if (!isDesktop) {
      // 手机端：始终2行 - 增大字体确保换行
      titleClass = 'text-[13px] break-words leading-[1.4]';
      titleStyle = {
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        wordBreak: 'break-word',
        whiteSpace: 'normal',
        maxHeight: '36.4px'  // 13px * 1.4 * 2 = 36.4px，强制高度限制
      } as React.CSSProperties;
    } else if (isHorizontal) {
      // 电脑端横向布局：1行，16px
      titleClass = 'text-base';
      titleStyle = {
        display: '-webkit-box',
        WebkitLineClamp: 1,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      } as React.CSSProperties;
    } else {
      // 电脑端纵向布局：1行，14px
      titleClass = 'text-sm';
      titleStyle = {
        display: '-webkit-box',
        WebkitLineClamp: 1,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      } as React.CSSProperties;
    }

    return (
      <div className="flex items-start gap-1.5 mb-1">
        {note.is_pinned && !showCoverImage && (
          <Pin className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-1" />
        )}
        <h3
          title={title}
          style={titleStyle}
          className={`flex-1 min-w-0 font-bold text-text-primary group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors ${titleClass}`}
        >
          {title}
        </h3>
      </div>
    );
  };

  // 摘要区域 - 手机端不显示
  const renderSummary = () => {
    if (!showSummary || !isDesktop) return null;
    const summaryText = note.summary || (note.content ? truncate(stripMarkdown(note.content), 60) : '');
    if (!summaryText) return null;

    return (
      <p className={`text-[12px] text-text-secondary ${hasSpecialBadges ? 'line-clamp-1' : 'line-clamp-2'} leading-[1.54] mb-1`}>
        {summaryText}
      </p>
    );
  };

  const coverImageClasses = "w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105";
  const pinnedIconClasses = "absolute top-1 left-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500/90 text-white shadow-sm backdrop-blur-[2px] z-10";

  if (isHorizontal) {
    const isImageRight = imagePosition === 'right';

    return (
      <button type="button" className={containerClasses} onClick={() => onOpen(note)}>
        <div className={`flex ${isImageRight ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* 封面图区域 - 决定整体高度 */}
          <div className="flex flex-col justify-between flex-shrink-0 w-24 sm:w-32">
            <div className="relative w-full pt-[100%] overflow-hidden rounded-l-xl">
              {showCoverImage ? (
                <div className="absolute inset-0 w-full h-full bg-gray-100 dark:bg-gray-800">
                  <img
                    src={coverImageUrl}
                    alt={title}
                    className={coverImageClasses}
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/20 dark:to-primary-800/20 flex items-center justify-center">
                  <div className="text-primary-400 dark:text-primary-600 opacity-50">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              )}
              {/* 置顶图标 */}
              {note.is_pinned && (
                <div className={pinnedIconClasses}>
                  <Pin className="w-3 h-3" />
                </div>
              )}
              {/* 手机端：特殊徽章显示在封面图右上角 */}
              {!isDesktop && renderSpecialBadges()}
            </div>
          </div>

          {/* 内容区域 - 高度与图片一致 */}
          <div className="flex-1 flex flex-col min-w-0 py-3 px-3 h-24 sm:h-32">
            {renderTitle()}
            {renderSummary()}
            {/* 电脑端：特殊徽章显示在内容区域 */}
            {isDesktop && renderSpecialBadges()}
            {renderBottomMeta()}
          </div>
        </div>
      </button>
    );
  }

  // 纵向布局
  return (
    <button type="button" className={containerClasses} onClick={() => onOpen(note)}>
      <div className="flex flex-col h-full">
        <div className="relative w-full pt-[100%] overflow-hidden rounded-t-xl">
          {showCoverImage ? (
            <div className="absolute inset-0 w-full h-full bg-gray-100 dark:bg-gray-800">
              <img
                src={coverImageUrl}
                alt={title}
                className={coverImageClasses}
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/20 dark:to-primary-800/20 flex items-center justify-center">
              <div className="text-primary-400 dark:text-primary-600 opacity-50">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          )}
          {/* 置顶图标 */}
          {note.is_pinned && (
            <div className={pinnedIconClasses}>
              <Pin className="w-3 h-3" />
            </div>
          )}
          {/* 手机端：特殊徽章显示在封面图右上角 */}
          {!isDesktop && renderSpecialBadges()}
        </div>

        <div className="flex flex-col flex-1 p-3">
          {renderTitle()}
          {renderSummary()}
          {/* 电脑端：特殊徽章显示在内容区域 */}
          {isDesktop && renderSpecialBadges()}
          {renderBottomMeta()}
        </div>
      </div>
    </button>
  );
});

NoteCard.displayName = 'NoteCard';

export default NoteCard;
