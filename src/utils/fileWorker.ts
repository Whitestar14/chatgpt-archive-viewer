
/* eslint-disable no-restricted-globals */

export const fileWorkerScript = () => {

    // Store data in worker scope
    let cachedConversations: any[] = [];
    let cachedSearchIndex: string[] = [];

    // Detailed Stop Words List to improve "Top Words" quality
    const STOP_WORDS = new Set([
        // Articles, Prepositions, Conjunctions
        "the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for", "not", "on", "with", "he", "as", "you", "do", "at", 
        "this", "but", "his", "by", "from", "they", "we", "say", "her", "she", "or", "an", "will", "my", "one", "all", "would", "there", "their", "what", 
        "so", "up", "out", "if", "about", "who", "get", "which", "go", "me", "when", "make", "can", "like", "time", "no", "just", "him", "know", "take", 
        "people", "into", "year", "your", "good", "some", "could", "them", "see", "other", "than", "then", "now", "look", "only", "come", "its", "over", 
        "think", "also", "back", "after", "use", "two", "how", "our", "work", "first", "well", "way", "even", "new", "want", "because", "any", "these", 
        "give", "day", "most", "us", "are", "is", "was", "were", "been", "has", "had", "am", "does", "did", "doing", "should", "could", "would", "might", "must",
        "really", "very", "much", "more", "many", "such", "those", "being", "under", "where", "why", "here", "there", "through", "down", "left", "right",
        "said", "ask", "told", "asked", "yes", "yeah", "okay", "sure", "maybe", "please", "thanks", "thank", "hello", "hey", "hi", "help", "from", "subject", "re",
        "write", "writing", "wrote", "usage", "using", "uses", "used", "need", "needs", "needed", "want", "wants", "wanted", "got", "get", "getting",
        "make", "makes", "made", "making", "create", "creates", "created", "creating", "let", "lets", "let's", "bit", "lot", "little", "big", "small",
        "large", "quite", "rather", "kind", "sort", "type", "part", "thing", "things", "stuff", "point", "points", "idea", "ideas", "something",
        "anything", "everything", "nothing", "someone", "anyone", "everyone", "noone", "always", "never", "sometimes", "often", "rarely", "usually",
        "actually", "basically", "literally", "seriously", "honestly", "probably", "possibly", "maybe", "perhaps", "definitely", "certainly",
        "however", "although", "though", "unless", "until", "while", "since", "during", "before", "after", "above", "below", "between", "among",
        "around", "against", "within", "without", "beside", "besides", "beyond", "behind", "across", "along", "near", "far", "away", "off",
        "again", "once", "twice", "thrice", "able", "enable", "disable", "allow", "disallow", "start", "stop", "begin", "end", "finish", "continue",
        "change", "modify", "update", "edit", "delete", "remove", "add", "insert", "append", "prepend", "replace", "swap", "move", "copy", "paste",
        "show", "hide", "display", "view", "open", "close", "read", "write", "print", "log", "send", "receive", "fetch", "get", "post", "put",
        "true", "false", "null", "undefined", "nan", "yes", "no", "ok", "cancel", "submit", "confirm", "error", "success", "fail", "pass",
        "user", "assistant", "system", "model", "prompt", "response", "input", "output", "question", "answer", "query", "result", "chat", "conversation"
    ]);

    // --- Search Logic Inlined ---
    
    const getConversationText = (conv: any): string => {
        const parts: string[] = [conv.title || ''];
        const nodes = Object.values(conv.mapping);
        
        for (const node of nodes as any[]) {
            if (node.message && node.message.content && node.message.content.parts) {
              const contentParts = node.message.content.parts;
              contentParts.forEach((part: any) => {
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
      
    const generateSearchIndex = (conversations: any[]): string[] => {
        return conversations.map(conv => getConversationText(conv).toLowerCase());
    };

    const extractModels = (conv: any): string[] => {
        const models = new Set<string>();
        const nodes = Object.values(conv.mapping || {});
        
        for (const node of nodes as any[]) {
            if (node.message && node.message.metadata && node.message.metadata.model_slug) {
                models.add(node.message.metadata.model_slug);
            }
        }
        return Array.from(models);
    };

    const extractFeatures = (conv: any) => {
        const features = {
            hasTools: false,
            hasVoice: false,
            hasDictation: false,
            hasImages: false
        };
        
        const nodes = Object.values(conv.mapping || {});
        for (const node of nodes as any[]) {
            const msg = node.message;
            if (!msg) continue;
            
            // Tool use
            if (msg.author.role === 'tool') features.hasTools = true;
            
            // Dictation
            if (msg.metadata?.dictation) features.hasDictation = true;
            
            // Content Parts Check
            if (msg.content?.parts) {
                for (const part of msg.content.parts) {
                    if (typeof part === 'object') {
                        if (part.content_type === 'image_asset_pointer') features.hasImages = true;
                        if (part.content_type === 'audio_asset_pointer') features.hasVoice = true;
                    }
                }
            }
            
            // Metadata Voice Check
            if (msg.metadata?.voice_name) features.hasVoice = true;
            
            // Early exit if all found
            if (features.hasTools && features.hasVoice && features.hasDictation && features.hasImages) break; 
        }
        return features;
    };

    // --- Worker Handler ---

    self.onmessage = async (e: MessageEvent) => {
        const { type } = e.data;

        if (type === 'SEARCH') {
            const { query } = e.data;
            if (!query || typeof query !== 'string' || query.trim() === '') {
                self.postMessage({ type: 'SEARCH_RESULTS', results: null });
                return;
            }

            const tokens = query.toLowerCase().trim().split(/\s+/);
            
            // Score and sort results
            const results = cachedConversations
                .map((conv, idx) => {
                    let score = 0;
                    const title = (conv.title || '').toLowerCase();
                    const content = cachedSearchIndex[idx];

                    // Check Title: Do all tokens exist?
                    if (tokens.every(t => title.includes(t))) {
                        score += 10;
                    }
                    
                    // Check Content: Do all tokens exist?
                    if (tokens.every(t => content.includes(t))) {
                        score += 1;
                    }

                    if (score > 0) return { idx, score };
                    return null;
                })
                .filter(item => item !== null)
                .sort((a, b) => b!.score - a!.score)
                .map(item => item!.idx);
            
            self.postMessage({ type: 'SEARCH_RESULTS', results });
            return;
        }

        if (type === 'GENERATE_INSIGHTS') {
            try {
                if (!cachedConversations.length) {
                    self.postMessage({ type: 'INSIGHTS_ERROR', error: 'No data loaded' });
                    return;
                }

                let totalUserMessages = 0;
                let totalModelMessages = 0;
                let totalUserWords = 0;
                let totalModelWords = 0;
                const modelUsage: Record<string, number> = {};
                const voiceUsage: Record<string, number> = {};
                const hourlyActivity = new Array(24).fill(0);
                const dailyActivity = new Array(7).fill(0);
                
                // Advanced Stats
                const monthlyActivity: Record<string, number> = {}; // "YYYY-MM" -> count
                const userWordCounts: Record<string, number> = {};
                const modelWordCounts: Record<string, number> = {};
                
                // User Profile Data
                let userBio = '';
                let userInstructions = '';
                
                // Top Chats (by message count)
                const chatLengths: { id: string; title: string; count: number; date: number }[] = [];

                // Helper to count words
                const processWords = (str: string, targetMap: Record<string, number>) => {
                    const words = str.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
                    let count = 0;
                    words.forEach(w => {
                        // Strict filtering: Length > 3, No Numbers, Not in extended STOP_WORDS
                        if (w.length > 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w) && !/^_+$/.test(w)) {
                            targetMap[w] = (targetMap[w] || 0) + 1;
                        }
                        if (w) count++;
                    });
                    return count;
                };

                cachedConversations.forEach((conv, index) => {
                    const nodes = Object.values(conv.mapping || {}) as any[];
                    let msgCount = 0;

                    nodes.forEach(node => {
                        const msg = node.message;
                        if (!msg) return;

                        // Extract Profile Data (User Context)
                        if (msg.content?.content_type === 'user_editable_context') {
                            const metaData = msg.metadata?.user_context_message_data;
                            const content = msg.content;
                            
                            if (!userBio) {
                                userBio = metaData?.about_user_message || content?.user_profile || '';
                            }
                            if (!userInstructions) {
                                userInstructions = metaData?.about_model_message || content?.user_instructions || '';
                            }
                        }

                        // Extract Voice Usage
                        if (msg.metadata) {
                            if (msg.metadata.voice_name) {
                                voiceUsage[msg.metadata.voice_name] = (voiceUsage[msg.metadata.voice_name] || 0) + 1;
                            } else if (msg.metadata.voice) {
                                voiceUsage[msg.metadata.voice] = (voiceUsage[msg.metadata.voice] || 0) + 1;
                            }
                        }

                        if (!msg.create_time) return;
                        msgCount++;

                        // Activity Heatmap
                        const dateObj = new Date(msg.create_time * 1000);
                        
                        // Validation: Check if valid date and not epoch start (unless explicitly close)
                        if (isNaN(dateObj.getTime()) || dateObj.getFullYear() < 2020) return;

                        hourlyActivity[dateObj.getHours()]++;
                        dailyActivity[dateObj.getDay()]++;
                        
                        const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                        monthlyActivity[monthKey] = (monthlyActivity[monthKey] || 0) + 1;

                        if (msg.author.role === 'user') {
                            totalUserMessages++;
                            const parts = msg.content?.parts || [];
                            parts.forEach((p: any) => {
                                let text = '';
                                if (typeof p === 'string') text = p;
                                else if (p.text) text = p.text;
                                
                                if (text) totalUserWords += processWords(text, userWordCounts);
                            });
                        } else if (msg.author.role === 'assistant') {
                            totalModelMessages++;
                            const parts = msg.content?.parts || [];
                            parts.forEach((p: any) => {
                                let text = '';
                                if (typeof p === 'string') text = p;
                                else if (p.text) text = p.text;

                                if (text) totalModelWords += processWords(text, modelWordCounts);
                            });

                            // Model Tracking
                            const slug = msg.metadata?.model_slug || 'unknown';
                            modelUsage[slug] = (modelUsage[slug] || 0) + 1;
                        }
                    });
                    
                    chatLengths.push({
                        id: String(index), // Using index as ID for mapping back in UI
                        title: conv.title || 'Untitled',
                        count: msgCount,
                        date: conv.create_time
                    });
                });

                // Top Words
                const getTopWords = (map: Record<string, number>) => Object.entries(map).sort(([,a], [,b]) => b - a).slice(0, 20);
                
                // Top Chats
                const topChats = chatLengths.sort((a, b) => b.count - a.count).slice(0, 3);

                // Sort Monthly Activity - Ensure keys exist
                const sortedMonthly = Object.keys(monthlyActivity).length > 0 
                    ? Object.entries(monthlyActivity).sort((a, b) => a[0].localeCompare(b[0]))
                    : [];

                const stats = {
                    totalConversations: cachedConversations.length,
                    totalUserMessages,
                    totalModelMessages,
                    totalUserWords,
                    totalModelWords,
                    modelUsage,
                    voiceUsage,
                    userProfile: { bio: userBio, instructions: userInstructions },
                    hourlyActivity,
                    dailyActivity,
                    avgUserLength: totalUserMessages ? Math.round(totalUserWords / totalUserMessages) : 0,
                    avgModelLength: totalModelMessages ? Math.round(totalModelWords / totalModelMessages) : 0,
                    topUserWords: getTopWords(userWordCounts),
                    topModelWords: getTopWords(modelWordCounts),
                    monthlyActivity: sortedMonthly,
                    topChats
                };

                self.postMessage({ type: 'INSIGHTS_RESULT', stats });

            } catch (error) {
                self.postMessage({ type: 'INSIGHTS_ERROR', error: 'Analysis failed' });
            }
            return;
        }

        // Handle File Parsing (New Import)
        if (e.data.file) {
            try {
                const { file } = e.data;
                const text = await file.text();
                let data = JSON.parse(text);
                
                if (!Array.isArray(data)) {
                    if (data.mapping) {
                        data = [data];
                    } else {
                        throw new Error("Invalid JSON structure");
                    }
                }

                const sorted = data.sort((a: any, b: any) => b.create_time - a.create_time);

                sorted.forEach((conv: any) => {
                    conv.models = extractModels(conv);
                    conv.features = extractFeatures(conv);
                });

                const index = generateSearchIndex(sorted);
                
                cachedConversations = sorted;
                cachedSearchIndex = index;

                self.postMessage({
                    type: 'SUCCESS',
                    conversations: sorted,
                    searchIndex: index
                });

            } catch (error) {
                self.postMessage({
                    type: 'ERROR',
                    error: error instanceof Error ? error.message : "Unknown parsing error"
                });
            }
        }

        // Handle Loading Existing Data (Profile Switch)
        if (type === 'INDEX') {
            try {
                const { conversations } = e.data;
                // We assume conversations are already sorted and enriched from DB
                const index = generateSearchIndex(conversations);
                
                cachedConversations = conversations;
                cachedSearchIndex = index;

                self.postMessage({
                    type: 'INDEX_READY',
                    searchIndex: index
                });
            } catch (error) {
                console.error("Indexing error", error);
            }
        }
    };
};
