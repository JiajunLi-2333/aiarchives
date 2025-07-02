import type { Conversation } from '@/types/conversation';

/**
 * Extracts a Meta share page into a structured Conversation.
 */

export async function parseMeta(html: string): Promise<Conversation> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const importantElements = new Set<Element>();
  function hasMeaningfulText(element: Element): boolean {
    const directText = getDirectTextContent(element);
    if (directText && directText.trim().length > 0) {
      return true;
    }
    return false;
  }
  function getDirectTextContent(element: Element): string {
    let directText = '';
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        directText += node.textContent || '';
      }
    }
    return directText;
  }
  function markImportantElements(element: Element) {
    let hasImportantContent = false;
    if (hasMeaningfulText(element)) {
      hasImportantContent = true;
    }
    for (const child of Array.from(element.children)) {
      if (markImportantElements(child)) {
        hasImportantContent = true;
      }
    }
    if (hasImportantContent) {
      importantElements.add(element);
      let parent = element.parentElement;
      while (parent && parent !== doc.body && parent !== doc.documentElement) {
        importantElements.add(parent);
        parent = parent.parentElement;
      }
    } 
    return hasImportantContent;
  }
  if (doc.body) {
    markImportantElements(doc.body);
  }
  function cloneImportantElements(original: Element): Element | null {
    if (!importantElements.has(original)) {
      return null;
    }
    
    const cloned = original.cloneNode(false) as Element;
    
    for (const child of Array.from(original.children)) {
      const clonedChild = cloneImportantElements(child);
      if (clonedChild) {
        cloned.appendChild(clonedChild);
      }
    }
    
    if (original.children.length === 0 && original.textContent?.trim()) {
      cloned.textContent = original.textContent;
    }
    
    return cloned;
  }
  
  let cleanedHtml = '';
  
  if (doc.body && importantElements.has(doc.body)) {
    const cleanedBody = cloneImportantElements(doc.body);
    if (cleanedBody) {
      cleanedHtml = cleanedBody.outerHTML;
    }
  }
  
  if (!cleanedHtml.trim()) {
    const allText = doc.body?.textContent?.trim() || '';
    if (allText) {
      cleanedHtml = `<div>${allText}</div>`;
    } else {
      cleanedHtml = html; 
    }
  }
  return {
    model: 'Meta',
    content: html,
    scrapedAt: new Date().toISOString(),
    sourceHtmlBytes: html.length,
  };
}
