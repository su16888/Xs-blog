/**
 * @file markdown.ts
 * @description Markdown 工具函数
 */

/**
 * 移除 Markdown 语法，返回纯文本
 */
export const stripMarkdown = (markdown: string): string => {
  if (!markdown) return '';

  let text = markdown;

  // 移除图片语法
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '');
  text = text.replace(/!\[([^\]]*)\]\[([^\]]+)\]/g, '');
  text = text.replace(/!\[([^\]]+)\]/g, '');
  text = text.replace(/!\s*\[/g, '');

  // 移除代码块
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`([^`]+)`/g, '$1');
  text = text.replace(/`/g, '');

  // 移除标题符号
  text = text.replace(/^#{1,6}\s+/gm, '');

  // 移除粗体、斜体、删除线
  text = text.replace(/\*\*([^\*]+)\*\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/\*([^\*]+)\*/g, '$1');
  text = text.replace(/_([^_]+)_/g, '$1');
  text = text.replace(/~~([^~]+)~~/g, '$1');

  // 移除列表符号
  text = text.replace(/^[\s]*[-*+]\s+/gm, '');
  text = text.replace(/^[\s]*\d+\.\s+/gm, '');

  // 移除引用符号
  text = text.replace(/^>\s+/gm, '');

  // 移除链接符号
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');

  // 移除表格和分割线
  text = text.replace(/\|.*\|/g, '');
  text = text.replace(/^\s*[-*_]{3,}\s*$/gm, '');

  // 清理多余的空格和换行
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();

  return text;
};
