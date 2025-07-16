import type { Conversation } from '@/types/conversation';

/**
 * Extracts a Meta share page into a structured Conversation.
 */

export async function parseMeta(html: string): Promise<Conversation> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  //helper function to check if a node or any of its children has text content
  function hasTextContent(node: Node): boolean{
    if(node.nodeType === Node.TEXT_NODE){
      const text = node.textContent?.trim() || '';
      return text.length > 0;
    }
    for(const child of node.childNodes){
      if(hasTextContent(child)){
        return true;
      }
    }
    return false;
  }
  //preverse the head as it is because all the css styles are here
  const head = doc.head;

  const body = doc.body;
  const selectedBodyChildren: Node[] = [];

  // Select only the body children that have text content
  if(body){
    for(const child of Array.from(body.childNodes)){
      if(hasTextContent(child)){
        selectedBodyChildren.push(child.cloneNode(true));
      }
    }
  }

  // Reconstruct the HTML with preserved head and filtered body
  const newDoc = parser.parseFromString('<!DOCTYPE html><html></html>', 'text/html');
  
  // Add head if it exists
  if (head) {
    newDoc.head.replaceWith(head.cloneNode(true));
  }
  
  // Create new body with filtered children
  const newBody = newDoc.createElement('body');
  
  // Copy body attributes if they exist
  if (body) {
    for (const attr of Array.from(body.attributes)) {
      newBody.setAttribute(attr.name, attr.value);
    }
  }
  
  // Add filtered children to new body
  selectedBodyChildren.forEach(child => {
    newBody.appendChild(child);
  });
  
  // Replace the body
  if (newDoc.body) {
    newDoc.body.replaceWith(newBody);
  } else {
    newDoc.documentElement.appendChild(newBody);
  }

  // Get the final filtered HTML
  const filteredHtml = newDoc.documentElement.outerHTML;

  return {
    model: 'Meta',
    content: filteredHtml,
    scrapedAt: new Date().toISOString(),
    sourceHtmlBytes: html.length,
  };
}
