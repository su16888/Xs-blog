/**
 * @file contentFormatter.ts
 * @description 内容格式化工具 - 支持 Markdown、HTML 和纯文本
 * @author Arran
 * @copyright 2025 Arran (SuMoChen)
 */

/**
 * 简单的 Markdown 转 HTML 解析器
 * 支持常用的 Markdown 语法
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return ''
  
  let html = markdown
  
  // 转义 HTML 特殊字符（除了已经存在的 HTML 标签）
  // html = html.replace(/&/g, '&amp;')
  //          .replace(/</g, '&lt;')
  //          .replace(/>/g, '&gt;')
  
  // 标题 (h1-h6)
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
  
  // 粗体 **text** 或 __text__
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>')
  
  // 斜体 *text* 或 _text_
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/_(.+?)_/g, '<em>$1</em>')
  
  // 删除线 ~~text~~
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>')
  
  // 行内代码 `code`
  html = html.replace(/`(.+?)`/g, '<code>$1</code>')
  
  // 链接 [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
  
  // 图片 ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
  
  // 无序列表
  html = html.replace(/^\*\s+(.+)$/gm, '<li>$1</li>')
  html = html.replace(/^-\s+(.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
  
  // 有序列表
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
  
  // 引用块
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')
  
  // 水平线
  html = html.replace(/^---$/gm, '<hr />')
  html = html.replace(/^\*\*\*$/gm, '<hr />')
  
  // 换行：两个空格 + 换行 或 两个换行
  html = html.replace(/  \n/g, '<br />')
  html = html.replace(/\n\n/g, '</p><p>')
  html = html.replace(/\n/g, '<br />')
  
  // 包裹段落
  if (!html.startsWith('<')) {
    html = '<p>' + html + '</p>'
  }
  
  return html
}

/**
 * 处理纯文本，保留换行
 */
export function plainTextToHtml(text: string): string {
  if (!text) return ''
  
  // 转义 HTML 特殊字符
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
  
  // 保留换行
  html = html.replace(/\n/g, '<br />')
  
  return html
}

/**
 * 根据格式类型处理内容
 * @param content 原始内容
 * @param format 格式类型：'markdown' | 'html' | 'text'
 * @returns 处理后的 HTML 字符串
 */
export function formatContent(content: string, format: 'markdown' | 'html' | 'text' = 'text'): string {
  if (!content) return ''
  
  switch (format) {
    case 'markdown':
      return markdownToHtml(content)
    case 'html':
      return content // HTML 直接返回
    case 'text':
    default:
      return plainTextToHtml(content)
  }
}

/**
 * 检测内容可能的格式类型
 */
export function detectContentFormat(content: string): 'markdown' | 'html' | 'text' {
  if (!content) return 'text'
  
  // 检测 HTML 标签
  if (/<[a-z][\s\S]*>/i.test(content)) {
    return 'html'
  }
  
  // 检测 Markdown 语法
  if (
    /^#{1,6}\s/.test(content) || // 标题
    /\*\*.*\*\*/.test(content) || // 粗体
    /\[.*\]\(.*\)/.test(content) || // 链接
    /^[-*]\s/.test(content) || // 列表
    /^>\s/.test(content) // 引用
  ) {
    return 'markdown'
  }
  
  return 'text'
}
