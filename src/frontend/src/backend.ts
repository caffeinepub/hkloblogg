import { Actor, HttpAgent } from "@icp-sdk/core/agent";
import type { backendInterface, CreateActorOptions } from "./backend.d";

export type { backendInterface, CreateActorOptions, AccessLevel, Category, Post, UserProfile, ModerationLog } from "./backend.d";

export class ExternalBlob {
  private url: string | null = null;
  private bytes: Uint8Array | null = null;
  onProgress?: (progress: number) => void;

  static fromURL(url: string): ExternalBlob {
    const blob = new ExternalBlob();
    blob.url = url;
    return blob;
  }

  static fromBytes(bytes: Uint8Array): ExternalBlob {
    const blob = new ExternalBlob();
    blob.bytes = bytes;
    return blob;
  }

  async getBytes(): Promise<Uint8Array> {
    if (this.bytes) return this.bytes;
    if (this.url) {
      const res = await fetch(this.url);
      const buf = await res.arrayBuffer();
      return new Uint8Array(buf);
    }
    return new Uint8Array();
  }
}

// IDL factory for the backend canister
const idlFactory = ({ IDL }: any) => {
  const AccessLevel = IDL.Variant({
    Public: IDL.Null,
    Restricted: IDL.Null,
    Private: IDL.Null,
  });
  const Category = IDL.Record({
    id: IDL.Nat,
    name: IDL.Text,
    description: IDL.Text,
    accessLevel: AccessLevel,
    readerList: IDL.Vec(IDL.Principal),
    createdBy: IDL.Principal,
    createdAt: IDL.Int,
    updatedAt: IDL.Int,
  });
  const PostStatus = IDL.Variant({ Draft: IDL.Null, Published: IDL.Null });
  const Post = IDL.Record({
    id: IDL.Nat,
    title: IDL.Text,
    content: IDL.Text,
    authorAlias: IDL.Text,
    authorPrincipal: IDL.Principal,
    categoryId: IDL.Nat,
    createdAt: IDL.Int,
    updatedAt: IDL.Int,
    status: PostStatus,
    coverImageKey: IDL.Opt(IDL.Text),
    galleryImageKeys: IDL.Vec(IDL.Text),
  });
  const UserProfile = IDL.Record({
    principalId: IDL.Principal,
    alias: IDL.Text,
    email: IDL.Opt(IDL.Text),
    createdAt: IDL.Int,
    updatedAt: IDL.Int,
  });
  const ModerationLog = IDL.Record({
    id: IDL.Nat,
    action: IDL.Text,
    admin: IDL.Principal,
    targetUser: IDL.Opt(IDL.Principal),
    contentType: IDL.Text,
    snippet: IDL.Text,
    reason: IDL.Text,
    timestamp: IDL.Int,
  });
  const CreatePostResult = IDL.Variant({ ok: IDL.Nat, err: IDL.Text });
  const UpdatePostResult = IDL.Variant({ ok: IDL.Bool, err: IDL.Text });

  return IDL.Service({
    initDefaultCategories: IDL.Func([], [], []),
    createCategory: IDL.Func([IDL.Text, IDL.Text, AccessLevel], [IDL.Nat], []),
    updateCategory: IDL.Func([IDL.Nat, IDL.Text, IDL.Text, AccessLevel], [IDL.Bool], []),
    addReaderToCategory: IDL.Func([IDL.Nat, IDL.Principal], [IDL.Bool], []),
    addReaderAliasToCategory: IDL.Func([IDL.Nat, IDL.Text, IDL.Principal], [IDL.Bool], []),
    getReaderAliases: IDL.Func([IDL.Vec(IDL.Principal)], [IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Text))], ["query"]),
    getCategories: IDL.Func([], [IDL.Vec(Category)], ["query"]),
    getCategoryById: IDL.Func([IDL.Nat], [IDL.Opt(Category)], ["query"]),
    createPost: IDL.Func([IDL.Text, IDL.Text, IDL.Nat], [CreatePostResult], []),
    updatePost: IDL.Func([IDL.Nat, IDL.Text, IDL.Text, IDL.Nat], [UpdatePostResult], []),
    updatePostImages: IDL.Func([IDL.Nat, IDL.Opt(IDL.Text), IDL.Vec(IDL.Text)], [IDL.Bool], []),
    deletePost: IDL.Func([IDL.Nat], [IDL.Bool], []),
    publishPost: IDL.Func([IDL.Nat], [IDL.Bool], []),
    getPublishedPosts: IDL.Func([], [IDL.Vec(Post)], ["query"]),
    getPostById: IDL.Func([IDL.Nat], [IDL.Opt(Post)], ["query"]),
    getPostsByAuthor: IDL.Func([], [IDL.Vec(Post)], ["query"]),
    getPostsForUser: IDL.Func([], [IDL.Vec(Post)], ["query"]),
    getDiscoverPosts: IDL.Func([], [IDL.Vec(Post)], ["query"]),
    searchPosts: IDL.Func([IDL.Text], [IDL.Vec(Post)], ["query"]),
    getUserProfile: IDL.Func([IDL.Principal], [IDL.Opt(UserProfile)], ["query"]),
    setAlias: IDL.Func([IDL.Text], [IDL.Bool], []),
    updateUserAliasAdmin: IDL.Func([IDL.Principal, IDL.Text], [IDL.Bool], []),
    getAllUsers: IDL.Func([], [IDL.Vec(UserProfile)], ["query"]),
    getModerationLogs: IDL.Func([], [IDL.Vec(ModerationLog)], ["query"]),
    containsBlockedContent: IDL.Func([IDL.Text], [IDL.Opt(IDL.Text)], ["query"]),
    _initializeAccessControlWithSecret: IDL.Func([IDL.Text], [], []),
  });
};

export async function createActor(
  canisterId: string,
  _uploadFile: (file: ExternalBlob) => Promise<Uint8Array>,
  _downloadFile: (bytes: Uint8Array) => Promise<ExternalBlob>,
  options?: CreateActorOptions
): Promise<backendInterface> {
  const agent = options?.agent ?? new HttpAgent({
    ...options?.agentOptions,
  });

  return Actor.createActor(idlFactory, {
    agent,
    canisterId,
  }) as unknown as backendInterface;
}
