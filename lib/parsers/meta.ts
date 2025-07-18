import {JSDOM} from 'jsdom';
import type { Conversation } from '@/types/conversation';

/**
 * Extracts a Meta share page into a structured Conversation.
 */
export async function parseMeta(html: string): Promise<Conversation> {
  // USE JSDOM to rebuild the html structure
  const dom = new JSDOM(html);
  const document = dom.window.document;

  //Helper function to clean the head element
  function cleanHead(originalHead: HTMLHeadElement): HTMLHeadElement{
    const newHead = dom.window.document.createElement('head');
    const cssElements = originalHead.querySelectorAll('style, link[rel = "stylesheet"]');
    for (const cssElement of cssElements) {
      newHead.appendChild(cssElement.cloneNode(true));
    }
    return newHead;
  }

  //Helper function to check if an element or its descendants have text content
  function hasTextContent(node: Node): boolean {
    if (node.nodeType === dom.window.Node.TEXT_NODE){
      const text = node.textContent?.trim() || '';
      return text.length > 0;
    }
    for(const child of node.childNodes){
      if (hasTextContent(child)) {
        return true;
      }
    }
    return false;
  }

  const head = document.head;
  const body = document.body;

  if (!body) {
    return {
      content: '',
      model: 'Meta',
      scrapedAt: new Date().toISOString(),
      sourceHtmlBytes: html.length,
    };
  }

  // Step 1: Get all direct children of body
  const bodyChildren = Array.from(body.childNodes);
  
  // Step 2: Filter to keep only div elements (remove scripts and other elements)
  const divElements = bodyChildren.filter(child => 
    child.nodeType === dom.window.Node.ELEMENT_NODE && 
    (child as Element).tagName.toLowerCase() === 'div'
  ) as Element[];

  // Step 3: For each div, check if it or its descendants have text content
  const selectedDivs = divElements.filter(div => hasTextContent(div));

  // If no divs found, return empty conversation
  if (selectedDivs.length === 0) {
    return {
      content: '',
      model: 'Meta',
      scrapedAt: new Date().toISOString(),
      sourceHtmlBytes: html.length,
    };
  }

  // Step 4: Reconstruct the HTML with preserved head and filtered body content
  const newDOM = new JSDOM('<!DOCTYPE html><html></html>');
  const newDOC = newDOM.window.document;

  // Add head if it exists
  if(head){
    const cleanedHead = cleanHead(head);
    newDOC.head.replaceWith(cleanedHead);
  }
  
  // Create new body with only the selected divs
  const newBody = newDOC.createElement('body');
  
  // Copy body attributes if they exist
  if (body) {
    for (const attr of Array.from(body.attributes)) {
      newBody.setAttribute(attr.name, attr.value);
    }
  }

  // Add only the selected divs to the new body
  for(const div of selectedDivs){
    newBody.appendChild(div.cloneNode(true));
  }
  
  newDOC.body.replaceWith(newBody);
  const filteredHtml = newDOC.documentElement.outerHTML;

  return {
    model: 'Meta',
    content: filteredHtml,
    scrapedAt: new Date().toISOString(),
    sourceHtmlBytes: html.length,
  };
}