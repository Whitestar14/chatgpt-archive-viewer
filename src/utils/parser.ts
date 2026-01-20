import type { Conversation, FormattedMessage, MappingNode, ContentPart, MessagePart, Mapping } from '../types';

// Helper to sanitize/guess filenames from sediment pointers if explicit mapping isn't available.
const resolveAssetUrl = (pointer: string): string => {
  if (!pointer) return '';
  const cleanId = pointer.replace('sediment://', '').replace('file-service://', '');
  if (pointer.startsWith('sediment://')) {
    return `${cleanId}-sanitized.jpg`; 
  }
  return cleanId;
};

// Helper to find the latest leaf node starting from a specific node
// This is used when switching branches to find the end of the new branch
export const findMostRecentLeaf = (mapping: Mapping, startNodeId: string): string => {
    let currentId = startNodeId;
    while (true) {
        const node = mapping[currentId];
        if (!node || !node.children || node.children.length === 0) {
            return currentId;
        }
        // Heuristic: Take the last child (most recently created version usually)
        currentId = node.children[node.children.length - 1];
    }
};

/**
 * Traverses the conversation mapping backwards from the current_node to the root.
 * Supports custom leaf node for branch navigation.
 */
export const getConversationMessages = (conversation: Conversation, currentLeafId?: string): FormattedMessage[] => {
  const { mapping } = conversation;
  const messages: FormattedMessage[] = [];

  let currentNodeId = currentLeafId || conversation.current_node;

  // Fallback if no valid node
  if (!currentNodeId || !mapping[currentNodeId]) {
     const keys = Object.keys(mapping);
     currentNodeId = keys[keys.length - 1];
  }

  while (currentNodeId) {
    const node: MappingNode = mapping[currentNodeId];
    if (!node) break; 

    const { message } = node;
    
    // Determine Sibling Info
    let siblingInfo = undefined;
    if (node.parent) {
        const parentNode = mapping[node.parent];
        if (parentNode && parentNode.children && parentNode.children.length > 1) {
            const children = parentNode.children;
            const idx = children.indexOf(node.id);
            if (idx !== -1) {
                siblingInfo = {
                    current: idx + 1,
                    total: children.length,
                    parent: node.parent,
                    ids: children
                };
            }
        }
    }

    if (message && message.content && message.author) {
      const role = message.author.role;
      const isSystem = role === 'system';
      const isTool = role === 'tool';
      const isUserSystem = message.metadata?.is_user_system_message;
      const isHidden = message.metadata?.is_visually_hidden_from_conversation;
      
      // Filter logic:
      // 1. Visually hidden metadata (keep strict)
      // 2. System messages (unless user_system_message)
      // 3. Keep Tool messages (role='tool') and 'code'/'execution_output' content types for "Thinking" display
      const shouldSkip = 
          isHidden || 
          (isSystem && !isUserSystem);

      if (!shouldSkip) {
        let authorName = message.author.name || undefined;

        if (role === 'system' && isUserSystem) {
          authorName = "Custom User Info";
        } else if (role === 'tool') {
          authorName = "Tool Output";
        }

        const messageParts: MessagePart[] = [];
        const content = message.content;
        
        // Handle Content References (Citations)
        const contentRefs = message.metadata?.content_references || [];
        const sortedRefs = [...contentRefs].sort((a, b) => b.start_idx - a.start_idx);

        // CASE 1: Standard Parts Array
        if (content.parts && content.parts.length > 0) {
            content.parts.forEach((part: ContentPart) => {
              if (typeof part === 'string' || (typeof part === 'object' && 'text' in part && typeof part.text === 'string')) {
                 let text = typeof part === 'string' ? part : part.text || '';
                 
                 // Apply citations if any
                 if (sortedRefs.length > 0) {
                    sortedRefs.forEach(ref => {
                        if (text.includes(ref.matched_text)) {
                            // Generate Markdown Link
                            let linkMarkdown = '';
                            if (ref.type === 'webpage' || ref.type === 'grouped_webpages') {
                                 // Grouped web pages
                                 const items = ref.items || [];
                                 items.forEach((item: any, idx: number) => {
                                     linkMarkdown += ` [${idx + 1}](${item.url}) `;
                                 });
                                 if (!linkMarkdown && ref.url) {
                                     linkMarkdown = ` [Ref](${ref.url}) `;
                                 }
                            } else if (ref.items && Array.isArray(ref.items)) {
                                 // Generic items
                                 ref.items.forEach((item: any, idx: number) => {
                                    if (item.url) linkMarkdown += ` [${idx + 1}](${item.url}) `;
                                 });
                            }

                            if (!linkMarkdown) linkMarkdown = ''; // fallback
                            
                            // Replace the unicode marker with the markdown
                            text = text.replace(ref.matched_text, linkMarkdown);
                        }
                    });
                 }
                 
                 if (text.length > 0) messageParts.push({ type: 'text', text: text });
              } else if (typeof part === 'object') {
                 if ('content_type' in part) {
                    switch (part.content_type) {
                      case 'audio_transcription':
                        messageParts.push({ type: 'text', text: `*[Transcript]*: ${part.text}` });
                        break;
                      case 'image_asset_pointer':
                        messageParts.push({ type: 'image', assetUrl: resolveAssetUrl(part.asset_pointer) });
                        break;
                      case 'audio_asset_pointer':
                        messageParts.push({ type: 'audio', assetUrl: resolveAssetUrl(part.asset_pointer) });
                        break;
                       case 'video_container_asset_pointer':
                        messageParts.push({ type: 'video', assetUrl: resolveAssetUrl(part.asset_pointer) });
                        break;
                      case 'real_time_user_audio_video_asset_pointer':
                         if (part.audio_asset_pointer) {
                            messageParts.push({ type: 'audio', assetUrl: resolveAssetUrl(part.audio_asset_pointer.asset_pointer) });
                         }
                         if (part.video_container_asset_pointer) {
                            messageParts.push({ type: 'video', assetUrl: resolveAssetUrl(part.video_container_asset_pointer.asset_pointer) });
                         }
                         break;
                    }
                 }
              }
            });
        } 
        // CASE 2: Text property but no Parts (Common in Tool Calls / Code execution)
        else if (content.text) {
            messageParts.push({ type: 'text', text: content.text });
        }

        if (messageParts.length > 0 || role === 'tool') {
            messages.push({
                id: message.id,
                role: role,
                parts: messageParts,
                createdAt: message.create_time,
                model: message.metadata?.model_slug,
                isHidden: message.metadata?.is_visually_hidden_from_conversation || false,
                authorName,
                status: message.status,
                metadata: message.metadata,
                sibling: siblingInfo,
                recipient: message.recipient
            });
        }
      }
    }

    // Move upwards
    currentNodeId = node.parent || undefined;
  }

  return messages.reverse();
};

export const conversationToMarkdown = (conversation: Conversation): string => {
    const messages = getConversationMessages(conversation);
    const dateStr = formatDate(conversation.create_time);
    
    let md = `# ${conversation.title || 'Untitled Conversation'}\n`;
    md += `*Date: ${dateStr}*\n\n`;
    
    messages.forEach(msg => {
        const role = msg.role.toUpperCase();
        const text = msg.parts
            .map(p => {
                if (p.type === 'text') return p.text;
                if (p.type === 'image') return `![Image](${p.assetUrl || 'Image'})`;
                return `[${p.type}]`;
            })
            .join('\n');
        
        md += `**${role}**:\n${text}\n\n---\n\n`;
    });
    
    return md;
};

export const formatDate = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatTime = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
};