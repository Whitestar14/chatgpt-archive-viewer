import type { Conversation, ContentPart } from '../types';

/**
 * Extracts all searchable text content from a conversation.
 */
export const getConversationText = (conv: Conversation): string => {
  const parts: string[] = [conv.title || ''];
  const nodes = Object.values(conv.mapping);
  
  for (const node of nodes) {
      if (node.message && node.message.content && node.message.content.parts) {
        const contentParts = node.message.content.parts;
        contentParts.forEach((part: ContentPart) => {
          if (typeof part === 'string') {
            parts.push(part);
          } else if (typeof part === 'object') {
             if ('text' in part && typeof part.text === 'string') {
               parts.push(part.text);
             } 
             else if ('content_type' in part && part.content_type === 'audio_transcription') {
               parts.push(part.text);
             }
          }
        });
      }
  }
  return parts.join(' ');
};

/**
 * Generates a flat array of lowercased text content for each conversation.
 * This includes title and all message parts (user, assistant, system) from the mapping.
 * Optimized for "archive" searching where finding a keyword anywhere in the history is desired.
 */
export const generateSearchIndex = (conversations: Conversation[]): string[] => {
  return conversations.map(conv => getConversationText(conv).toLowerCase());
};
