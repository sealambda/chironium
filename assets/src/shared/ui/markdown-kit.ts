import { Markdown, MarkdownManager } from "@tiptap/markdown";
import { generateHTML } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

const MARKDOWN_OPTIONS = {
  breaks: true,
  gfm: true,
};

const MARKDOWN_HTML_CACHE_LIMIT = 100;

export function createMarkdownExtensions() {
  return [
    StarterKit.configure({
      blockquote: false,
      code: false,
      codeBlock: false,
      dropcursor: false,
      gapcursor: false,
      heading: { levels: [2] },
      horizontalRule: false,
      strike: false,
    }),
    Markdown.configure({
      markedOptions: MARKDOWN_OPTIONS,
    }),
  ];
}

const sharedMarkdownExtensions = createMarkdownExtensions();
const sharedMarkdownManager = new MarkdownManager({
  extensions: sharedMarkdownExtensions,
  markedOptions: MARKDOWN_OPTIONS,
});
const renderedMarkdownHtmlCache = new Map<string, string>();

export function renderMarkdownToHtml(markdown: string) {
  const cachedHtml = renderedMarkdownHtmlCache.get(markdown);

  if (cachedHtml) {
    return cachedHtml;
  }

  const html = generateHTML(sharedMarkdownManager.parse(markdown), sharedMarkdownExtensions);

  renderedMarkdownHtmlCache.set(markdown, html);

  if (renderedMarkdownHtmlCache.size > MARKDOWN_HTML_CACHE_LIMIT) {
    const oldestMarkdown = renderedMarkdownHtmlCache.keys().next().value;

    if (oldestMarkdown) {
      renderedMarkdownHtmlCache.delete(oldestMarkdown);
    }
  }

  return html;
}
