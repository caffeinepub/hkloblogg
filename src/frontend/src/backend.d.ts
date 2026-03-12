import type { Principal } from "@icp-sdk/core/principal";
import type { ActorMethod } from "@icp-sdk/core/actor";

export type AccessLevel = { Public: null } | { Restricted: null } | { Private: null };

export interface Category {
  id: bigint;
  name: string;
  description: string;
  accessLevel: AccessLevel;
  readerList: Principal[];
  createdBy: Principal;
  createdAt: bigint;
  updatedAt: bigint;
}

export interface Post {
  id: bigint;
  title: string;
  content: string;
  authorAlias: string;
  authorPrincipal: Principal;
  categoryId: bigint;
  createdAt: bigint;
  updatedAt: bigint;
  status: { Draft: null } | { Published: null };
  coverImageKey: [] | [string];
  galleryImageKeys: string[];
}

export interface UserProfile {
  principalId: Principal;
  alias: string;
  email: [] | [string];
  createdAt: bigint;
  updatedAt: bigint;
}

export interface ModerationLog {
  id: bigint;
  action: string;
  admin: Principal;
  targetUser: [] | [Principal];
  contentType: string;
  snippet: string;
  reason: string;
  timestamp: bigint;
}

export interface backendInterface {
  initDefaultCategories: ActorMethod<[], undefined>;
  createCategory: ActorMethod<[string, string, AccessLevel], bigint>;
  updateCategory: ActorMethod<[bigint, string, string, AccessLevel], boolean>;
  addReaderToCategory: ActorMethod<[bigint, Principal], boolean>;
  addReaderAliasToCategory: ActorMethod<[bigint, string, Principal], boolean>;
  getReaderAliases: ActorMethod<[Principal[]], [Principal, string][]>;
  getCategories: ActorMethod<[], Category[]>;
  getCategoryById: ActorMethod<[bigint], [] | [Category]>;
  createPost: ActorMethod<[string, string, bigint], { ok: bigint } | { err: string }>;
  updatePost: ActorMethod<[bigint, string, string, bigint], { ok: boolean } | { err: string }>;
  updatePostImages: ActorMethod<[bigint, [] | [string], string[]], boolean>;
  deletePost: ActorMethod<[bigint], boolean>;
  publishPost: ActorMethod<[bigint], boolean>;
  getPublishedPosts: ActorMethod<[], Post[]>;
  getPostById: ActorMethod<[bigint], [] | [Post]>;
  getPostsByAuthor: ActorMethod<[], Post[]>;
  getPostsForUser: ActorMethod<[], Post[]>;
  getDiscoverPosts: ActorMethod<[], Post[]>;
  searchPosts: ActorMethod<[string], Post[]>;
  getUserProfile: ActorMethod<[Principal], [] | [UserProfile]>;
  setAlias: ActorMethod<[string], boolean>;
  updateUserAliasAdmin: ActorMethod<[Principal, string], boolean>;
  getAllUsers: ActorMethod<[], UserProfile[]>;
  getModerationLogs: ActorMethod<[], ModerationLog[]>;
  containsBlockedContent: ActorMethod<[string], [] | [string]>;
  _initializeAccessControlWithSecret: ActorMethod<[string], undefined>;
}

export interface CreateActorOptions {
  agentOptions?: {
    identity?: any;
    host?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export class ExternalBlob {
  static fromURL(url: string): ExternalBlob;
  getBytes(): Promise<Uint8Array>;
  onProgress?: (progress: number) => void;
}

export declare function createActor(
  canisterId: string,
  uploadFile: (file: ExternalBlob) => Promise<Uint8Array>,
  downloadFile: (bytes: Uint8Array) => Promise<ExternalBlob>,
  options?: CreateActorOptions
): Promise<backendInterface>;
