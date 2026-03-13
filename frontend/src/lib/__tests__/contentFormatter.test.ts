/**
 * @file contentFormatter.test.ts
 * @description 内容格式化工具测试
 */

import { formatContent, markdownToHtml, plainTextToHtml, detectContentFormat } from '../contentFormatter'

describe('contentFormatter', () => {
  describe('plainTextToHtml', () => {
    it('应该保留换行', () => {
      const input = '第一行\n第二行\n第三行'
      const expected = '第一行<br />第二行<br />第三行'
      expect(plainTextToHtml(input)).toBe(expected)
    })

    it('应该转义 HTML 特殊字符', () => {
      const input = '<script>alert("xss")</script>'
      const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      expect(plainTextToHtml(input)).toBe(expected)
    })
  })

  describe('markdownToHtml', () => {
    it('应该转换标题', () => {
      expect(markdownToHtml('# 标题1')).toContain('<h1>标题1</h1>')
      expect(markdownToHtml('## 标题2')).toContain('<h2>标题2</h2>')
    })

    it('应该转换粗体和斜体', () => {
      expect(markdownToHtml('**粗体**')).toContain('<strong>粗体</strong>')
      expect(markdownToHtml('*斜体*')).toContain('<em>斜体</em>')
    })

    it('应该转换链接', () => {
      const result = markdownToHtml('[链接](https://example.com)')
      expect(result).toContain('<a href="https://example.com"')
      expect(result).toContain('链接</a>')
    })

    it('应该保留换行', () => {
      const input = '第一行\n第二行'
      const result = markdownToHtml(input)
      expect(result).toContain('<br />')
    })
  })

  describe('formatContent', () => {
    it('应该根据格式类型处理内容', () => {
      const content = '第一行\n第二行'
      
      // 纯文本
      const textResult = formatContent(content, 'text')
      expect(textResult).toContain('<br />')
      
      // HTML
      const htmlResult = formatContent('<p>HTML</p>', 'html')
      expect(htmlResult).toBe('<p>HTML</p>')
      
      // Markdown
      const mdResult = formatContent('**粗体**', 'markdown')
      expect(mdResult).toContain('<strong>粗体</strong>')
    })
  })

  describe('detectContentFormat', () => {
    it('应该检测 HTML', () => {
      expect(detectContentFormat('<p>HTML</p>')).toBe('html')
      expect(detectContentFormat('<div>test</div>')).toBe('html')
    })

    it('应该检测 Markdown', () => {
      expect(detectContentFormat('# 标题')).toBe('markdown')
      expect(detectContentFormat('**粗体**')).toBe('markdown')
      expect(detectContentFormat('[链接](url)')).toBe('markdown')
    })

    it('应该默认为纯文本', () => {
      expect(detectContentFormat('普通文本')).toBe('text')
      expect(detectContentFormat('第一行\n第二行')).toBe('text')
    })
  })
})
