/**
 * Shared XML utilities for OOXML post-processors
 * Eliminates duplication between docx-post.ts and pptx-post.ts
 */

/**
 * Escape special XML characters
 */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Update or insert an XML element value
 */
export function updateXmlElement(xml: string, tagName: string, value: string): string {
  const escapedValue = escapeXml(value);
  const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'g');

  if (regex.test(xml)) {
    // Update existing element
    return xml.replace(regex, `<${tagName}>${escapedValue}</${tagName}>`);
  }

  // Element doesn't exist - try to insert before closing tag of parent
  // For core.xml, the parent is cp:coreProperties
  const closingTag = '</cp:coreProperties>';
  if (xml.includes(closingTag)) {
    const newElement = `  <${tagName}>${escapedValue}</${tagName}>\n`;
    return xml.replace(closingTag, newElement + closingTag);
  }

  return xml;
}
