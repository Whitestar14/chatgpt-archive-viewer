
/* eslint-disable no-restricted-globals */

// We export this function to be stringified and run in a Blob Worker.
// This works around build environment issues with new URL('./worker', import.meta.url).
export const chatWorkerScript = () => {
    
    // Helper to sanitize/guess filenames from sediment pointers
    const resolveAssetUrl = (pointer: string): string => {
        if (!pointer) return '';
        const cleanId = pointer.replace('sediment://', '').replace('file-service://', '');
        if (pointer.startsWith('sediment://')) {
            return `${cleanId}-sanitized.jpg`; 
        }
        return cleanId;
    };
  
    // Helper to find the latest leaf node starting from a specific node
    const findMostRecentLeaf = (mapping: any, startNodeId: string): string => {
        let currentId = startNodeId;
        while (true) {
            const node = mapping[currentId];
            if (!node || !node.children || node.children.length === 0) {
                return currentId;
            }
            currentId = node.children[node.children.length - 1];
        }
    };
  
    // Main parsing logic
    const getConversationMessages = (conversation: any, currentLeafId?: string): any[] => {
      const { mapping } = conversation;
      const messages: any[] = [];
  
      let currentNodeId = currentLeafId || conversation.current_node;
  
      if (!currentNodeId || !mapping[currentNodeId]) {
         const keys = Object.keys(mapping);
         currentNodeId = keys[keys.length - 1];
      }
  
      while (currentNodeId) {
        const node = mapping[currentNodeId];
        if (!node) break; 
  
        const { message } = node;
        
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
          
          // Strict filtering logic matched with parser.ts
          // UPDATED: Allow tool roles and non-parts content for "Thinking"
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
  
            const messageParts: any[] = [];
            const contentRefs = message.metadata?.content_references || [];
            const sortedRefs = [...contentRefs].sort((a: any, b: any) => b.start_idx - a.start_idx);
            const content = message.content;
  
            if (content.parts && content.parts.length > 0) {
                content.parts.forEach((part: any) => {
                if (typeof part === 'string' || (typeof part === 'object' && 'text' in part && typeof part.text === 'string')) {
                    let text = typeof part === 'string' ? part : part.text || '';
                    
                    if (sortedRefs.length > 0) {
                        sortedRefs.forEach((ref: any) => {
                            if (text.includes(ref.matched_text)) {
                                let linkMarkdown = '';
                                if (ref.type === 'webpage' || ref.type === 'grouped_webpages') {
                                    const items = ref.items || [];
                                    items.forEach((item: any, idx: number) => {
                                        linkMarkdown += ` [${idx + 1}](${item.url}) `;
                                    });
                                    if (!linkMarkdown && ref.url) {
                                        linkMarkdown = ` [Ref](${ref.url}) `;
                                    }
                                } else if (ref.items && Array.isArray(ref.items)) {
                                    ref.items.forEach((item: any, idx: number) => {
                                        if (item.url) linkMarkdown += ` [${idx + 1}](${item.url}) `;
                                    });
                                }
                                if (!linkMarkdown) linkMarkdown = ''; 
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
            } else if (content.text) {
                // Fallback for tool calls that just have 'text'
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
                    recipient: message.recipient,
                    // Additional helpful flags
                    contentType: content.content_type
                });
            }
          }
        }
  
        currentNodeId = node.parent || undefined;
      }
  
      return messages.reverse();
    };
  
    // Worker Event Listener
    self.onmessage = (e: MessageEvent) => {
        const { conversation, currentLeafId, type } = e.data;
        
        if (type === 'PARSE') {
            const leaf = currentLeafId || conversation.current_node;
            // If we need to recalculate the leaf based on a branch switch
            const finalLeaf = currentLeafId ? findMostRecentLeaf(conversation.mapping, currentLeafId) : leaf;
            
            const messages = getConversationMessages(conversation, finalLeaf);
            
            self.postMessage({
                type: 'PARSE_COMPLETE',
                messages: messages,
                leafId: finalLeaf
            });
        }
    };
  };
