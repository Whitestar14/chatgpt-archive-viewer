
export interface Author {
  role: 'system' | 'user' | 'assistant' | 'tool';
  name: string | null;
  metadata: any;
}

export interface AssetPointer {
  content_type: 'audio_asset_pointer' | 'image_asset_pointer' | 'video_container_asset_pointer';
  asset_pointer: string;
  metadata?: any;
}

export interface AudioTranscription {
  content_type: 'audio_transcription';
  text: string;
}

export interface RealTimeUserAsset {
  content_type: 'real_time_user_audio_video_asset_pointer';
  audio_asset_pointer?: AssetPointer;
  video_container_asset_pointer?: AssetPointer;
  frames_asset_pointers?: AssetPointer[];
}

export type ContentPart = string | AssetPointer | AudioTranscription | RealTimeUserAsset | { text: string };

export interface Content {
  content_type: 'text' | 'multimodal_text' | 'user_editable_context' | 'code' | 'execution_output';
  parts?: ContentPart[];
  text?: string;
}

export interface MessageMetadata {
  is_visually_hidden_from_conversation?: boolean;
  is_user_system_message?: boolean;
  model_slug?: string;
  finish_details?: {
    type: string;
    stop_tokens?: number[];
  };
  content_references?: any[];
  [key: string]: any;
}

export interface Message {
  id: string;
  author: Author;
  create_time: number | null;
  update_time: number | null;
  content: Content;
  status: string;
  end_turn: boolean | null;
  weight: number;
  metadata: MessageMetadata;
  recipient: string;
}

export interface MappingNode {
  id: string;
  message: Message | null;
  parent: string | null;
  children: string[];
}

export interface Mapping {
  [key: string]: MappingNode;
}

export interface ConversationFeatures {
  hasTools: boolean;
  hasImages: boolean;
  hasVoice: boolean;
  hasDictation: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  create_time: number;
  update_time: number;
  mapping: Mapping;
  current_node?: string;
  models?: string[]; 
  features?: ConversationFeatures;
}

export interface MessagePart {
  type: 'text' | 'image' | 'audio' | 'video' | 'mixed' | 'tool_use' | 'tool_result' | 'thinking' | 'artifact';
  text?: string;
  assetUrl?: string;
  transcript?: string;
  name?: string;
  input?: any;
  content?: any;
  thinking?: string;
}

export interface SiblingInfo {
  current: number; // 1-based index
  total: number;
  parent: string;
  ids: string[];
}

export interface FormattedMessage {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  parts: MessagePart[];
  createdAt: number | null;
  model?: string;
  isHidden: boolean;
  authorName?: string;
  status?: string;
  metadata?: MessageMetadata;
  sibling?: SiblingInfo;
  recipient?: string;
}
