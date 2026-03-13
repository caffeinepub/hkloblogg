import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  BookOpen,
  Calendar,
  Check,
  ClipboardCopy,
  Home,
  Loader2,
  LogOut,
  Menu,
  PenSquare,
  Search,
  Settings,
  User,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Post } from "./backend.d";
import LanguageSwitcher from "./components/LanguageSwitcher";
import NotificationBell from "./components/NotificationBell";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import {
  useCategories,
  useCheckIsAdmin,
  useFollowers,
  useFollowing,
  useInitDefaultCategories,
  usePublishedPosts,
  useSearchPosts,
  useSetAlias,
  useUserProfile,
} from "./hooks/useQueries";
import { useLanguage } from "./i18n/LanguageContext";
import AdminPanel from "./pages/AdminPanel";
import MyPosts from "./pages/MyPosts";
import PostEditor from "./pages/PostEditor";
import PostView from "./pages/PostView";
import UserProfile from "./pages/UserProfile";
import type { AppView, NavigateFn } from "./types";

void Bell;

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-8">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-2xl font-bold text-foreground">
              Något gick fel
            </h1>
            <p className="text-muted-foreground text-sm font-mono bg-muted p-3 rounded text-left whitespace-pre-wrap">
              {this.state.error?.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
            >
              Ladda om sidan
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function formatDate(timestamp: bigint): string {
  const ms = Number(timestamp) / 1_000_000;
  return new Date(ms).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function PostCard({
  post,
  index,
  onNavigate,
}: {
  post: Post;
  index: number;
  onNavigate: NavigateFn;
}) {
  return (
    <motion.article
      data-ocid={`post.item.${index + 1}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: "easeOut" }}
      onClick={() => onNavigate({ type: "post", postId: post.id })}
      className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <Badge variant="secondary" className="text-xs font-body">
          {String(post.categoryId)}
        </Badge>
        <time className="text-xs text-muted-foreground font-body">
          {formatDate(post.createdAt)}
        </time>
      </div>
      <h3 className="font-display text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
        {post.title}
      </h3>
      <p className="text-sm text-muted-foreground font-body line-clamp-3 mb-4">
        {post.content.replace(/<[^>]*>/g, "").slice(0, 160)}…
      </p>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-foreground">
          {post.authorAlias.charAt(0).toUpperCase()}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate({
              type: "profile",
              principalId: post.authorPrincipal.toString(),
            });
          }}
          className="text-xs font-body text-muted-foreground hover:text-primary transition-colors"
        >
          {post.authorAlias}
        </button>
      </div>
    </motion.article>
  );
}

function EmptyState() {
  const { t } = useLanguage();
  return (
    <motion.div
      data-ocid="posts.empty_state"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="col-span-full flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-20 h-20 rounded-full bg-accent/60 flex items-center justify-center mb-5">
        <BookOpen className="w-9 h-9 text-primary" />
      </div>
      <h3 className="font-display text-xl font-bold text-foreground mb-2">
        {t("home_no_posts")}
      </h3>
      <p className="text-muted-foreground font-body text-sm max-w-xs">
        {t("home_be_first")}
      </p>
    </motion.div>
  );
}

// ─── Profile Dropdown ─────────────────────────────────────────────────────────
function ProfileDropdown({ principal }: { principal: string }) {
  const { identity } = useInternetIdentity();
  const { t } = useLanguage();
  const principalId = identity?.getPrincipal() ?? null;

  const { data: profile } = useUserProfile(principalId);
  const { data: followers = [] } = useFollowers(principalId);
  const { data: following = [] } = useFollowing(principalId);
  const setAlias = useSetAlias();

  const [aliasInput, setAliasInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (profile?.alias) {
      setAliasInput(profile.alias);
    } else {
      const stored = localStorage.getItem("hklo_alias");
      if (stored) setAliasInput(stored);
    }
  }, [profile]);

  const displayName =
    profile?.alias ||
    localStorage.getItem("hklo_alias") ||
    `${principal.slice(0, 8)}…`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(principal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveAlias = async () => {
    const trimmed = aliasInput.trim();
    if (!trimmed) return;
    try {
      await setAlias.mutateAsync(trimmed);
      toast.success(t("profile_dd_alias_saved"));
    } catch {
      toast.error(t("profile_dd_alias_error"));
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-ocid="nav.profile.button"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-accent rounded-lg text-xs font-body text-foreground/70 hover:bg-accent/80 transition-colors"
        >
          <User className="w-3.5 h-3.5 shrink-0" />
          <span className="max-w-[100px] truncate">{displayName}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        data-ocid="profile.dropdown_menu"
        align="end"
        sideOffset={8}
        className="w-80 p-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-accent/30 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-base font-bold font-display text-primary">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-sm text-foreground truncate">
                {displayName}
              </p>
              <div className="flex items-center gap-3 text-xs font-body text-muted-foreground mt-0.5">
                <span>
                  <strong className="text-foreground">
                    {followers.length}
                  </strong>{" "}
                  {t("profile_dd_followers")}
                </span>
                <span>
                  <strong className="text-foreground">
                    {following.length}
                  </strong>{" "}
                  {t("profile_dd_following")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Principal */}
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {t("profile_dd_principal")}
          </p>
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
            <code className="font-mono text-xs text-foreground/70 flex-1 truncate">
              {principal}
            </code>
            <button
              type="button"
              data-ocid="profile.copy.button"
              onClick={handleCopy}
              className="shrink-0 hover:text-primary transition-colors"
              aria-label="Kopiera Principal-ID"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <ClipboardCopy className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Alias */}
        <div className="px-4 py-3 space-y-1.5">
          <Label
            htmlFor="alias-input"
            className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          >
            {t("profile_dd_alias")}
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="alias-input"
              data-ocid="profile.alias.input"
              value={aliasInput}
              onChange={(e) => setAliasInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveAlias();
              }}
              placeholder={t("profile_dd_alias_placeholder")}
              className="font-body text-sm h-9"
            />
            <Button
              data-ocid="profile.alias.save_button"
              size="sm"
              onClick={handleSaveAlias}
              disabled={setAlias.isPending || !aliasInput.trim()}
              className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3"
            >
              {setAlias.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                t("profile_dd_save")
              )}
            </Button>
          </div>
          <p className="font-body text-xs text-muted-foreground">
            Visas som författarnamn på dina inlägg.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function HomePage({ onNavigate }: { onNavigate: NavigateFn }) {
  const { isInitializing, login, loginStatus, identity } =
    useInternetIdentity();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [langFilter, setLangFilter] = useState<"all" | "sv" | "en">("all");

  const { data: posts = [], isLoading: postsLoading } = usePublishedPosts();
  const { data: categories = [] } = useCategories();

  const isLoggedIn = loginStatus === "success" && !!identity;
  const isLoggingIn = loginStatus === "logging-in";

  const filteredPosts = posts.filter((p) => {
    const category = categories.find(
      (c) => String(c.id) === String(p.categoryId),
    );
    if (!category || !("Public" in category.accessLevel)) return false;
    const matchQuery = searchQuery
      ? p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.content.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchCategory =
      selectedCategory === "all" || String(p.categoryId) === selectedCategory;
    const matchLang =
      langFilter === "all" ||
      (p as any).language === langFilter ||
      (!(p as any).language && langFilter === "sv");
    return matchQuery && matchCategory && matchLang;
  });

  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="hero-gradient py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <p className="font-body text-sm uppercase tracking-widest text-foreground/60 mb-3">
              Välkommen till
            </p>
            <h1 className="font-display text-6xl md:text-8xl font-black text-foreground mb-4 leading-none">
              <span className="hklo-logo text-6xl md:text-8xl italic">
                HKLO
              </span>
            </h1>
            <p className="font-body text-base md:text-lg text-foreground/70 max-w-xl mx-auto mb-8 leading-relaxed">
              {t("home_hero_text")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {isLoggedIn ? (
                <Button
                  data-ocid="hero.create_post.button"
                  size="lg"
                  onClick={() => onNavigate({ type: "create" })}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-body font-semibold px-8"
                >
                  <PenSquare className="w-5 h-5 mr-2" />
                  {t("nav_create")}
                </Button>
              ) : (
                <Button
                  data-ocid="hero.login.button"
                  size="lg"
                  onClick={() => login()}
                  disabled={isLoggingIn || isInitializing}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-body font-semibold px-8"
                >
                  {isLoggingIn ? t("nav_logging_in") : t("nav_login")}
                </Button>
              )}
            </div>
            {!isLoggedIn && (
              <div className="mt-4">
                <a
                  data-ocid="hero.create_identity.link"
                  href="https://identity.ic0.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-body text-muted-foreground hover:text-foreground underline transition-colors"
                >
                  {t("home_no_account")}
                </a>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Posts Section */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="flex items-baseline gap-3 mb-8">
            <h2 className="font-display text-2xl font-bold text-foreground tracking-wide uppercase">
              {t("home_latest_stories")}
            </h2>
            {filteredPosts.length > 0 && (
              <Badge variant="secondary" className="font-body">
                {filteredPosts.length} {t("my_posts_posts")}
              </Badge>
            )}
          </div>

          <Tabs defaultValue="all" className="mb-8">
            <TabsList data-ocid="posts.filter.tab" className="mb-6 bg-muted">
              <TabsTrigger
                data-ocid="posts.all.tab"
                value="all"
                className="font-body"
              >
                {t("home_all_posts")}
              </TabsTrigger>
              <TabsTrigger
                data-ocid="posts.my_feed.tab"
                value="feed"
                className="font-body"
                disabled={!isLoggedIn}
              >
                {t("home_my_feed")}
              </TabsTrigger>
            </TabsList>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  data-ocid="posts.search_input"
                  placeholder={`${t("home_latest_stories")}…`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 font-body bg-card"
                />
              </div>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger
                  data-ocid="posts.category.select"
                  className="w-full sm:w-48 font-body bg-card"
                >
                  <SelectValue placeholder={t("filter_all_categories")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("filter_all_categories")}
                  </SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={String(cat.id)} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Language filter */}
              <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5 border border-border self-start sm:self-auto">
                {(["all", "sv", "en"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    data-ocid={`posts.lang_${lang}.tab`}
                    onClick={() => setLangFilter(lang)}
                    className={[
                      "px-2 py-1 rounded-md text-xs font-body transition-all",
                      langFilter === lang
                        ? "bg-background shadow-sm text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    {lang === "all"
                      ? t("home_lang_all")
                      : lang === "sv"
                        ? "SE"
                        : "EN"}
                  </button>
                ))}
              </div>
            </div>

            <TabsContent value="all">
              {postsLoading ? (
                <div
                  data-ocid="posts.loading_state"
                  className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-card rounded-xl p-6 space-y-3">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ))}
                </div>
              ) : filteredPosts.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredPosts.map((post, i) => (
                    <PostCard
                      key={String(post.id)}
                      post={post}
                      index={i}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="feed">
              {isLoggedIn ? (
                <PersonalFeed onNavigate={onNavigate} />
              ) : (
                <div
                  data-ocid="posts.feed.empty_state"
                  className="py-16 text-center"
                >
                  <p className="font-body text-muted-foreground">
                    {t("home_login_for_feed")}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-xs font-body text-muted-foreground">
            © {new Date().getFullYear()}. Built with ♥ using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}

function PersonalFeed({ onNavigate }: { onNavigate: NavigateFn }) {
  const { data: posts = [], isLoading } = usePublishedPosts();
  const { data: categories = [] } = useCategories();
  const { identity } = useInternetIdentity();
  const { t } = useLanguage();

  const myPrincipal = identity?.getPrincipal().toString();

  const feedPosts = posts.filter((p) => {
    const category = categories.find(
      (c) => String(c.id) === String(p.categoryId),
    );
    if (!category) return false;
    if ("Public" in category.accessLevel) return true;
    if (
      myPrincipal &&
      category.readerList.some((r) => r.toString() === myPrincipal)
    )
      return true;
    return false;
  });

  if (isLoading) {
    return (
      <div
        data-ocid="posts.loading_state"
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-xl p-6 space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (feedPosts.length === 0) {
    return (
      <div
        data-ocid="posts.feed.empty_state"
        className="py-16 text-center text-muted-foreground font-body"
      >
        {t("home_no_posts")}
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {feedPosts.map((post, i) => (
        <PostCard
          key={String(post.id)}
          post={post}
          index={i}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

// ─── Global search dropdown ───────────────────────────────────────────────────
function GlobalSearch({ onNavigate }: { onNavigate: NavigateFn }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: results = [], isFetching } = useSearchPosts(query);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const showDropdown = open && query.length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          data-ocid="nav.search_input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t("nav_search_placeholder")}
          className="pl-9 h-9 font-body text-sm bg-background border-border"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Rensa sökning"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            data-ocid="nav.search_results.popover"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-1.5 left-0 right-0 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden"
          >
            {isFetching ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-sm font-body text-muted-foreground">
                {t("nav_no_results")} "{query}"
              </div>
            ) : (
              <ul className="max-h-72 overflow-y-auto py-1">
                {results.slice(0, 8).map((post) => (
                  <li key={String(post.id)}>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate({ type: "post", postId: post.id });
                        setQuery("");
                        setOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-accent/50 transition-colors flex flex-col gap-0.5"
                    >
                      <span className="font-body font-semibold text-sm text-foreground line-clamp-1">
                        {post.title}
                      </span>
                      <span className="flex items-center gap-2 text-xs font-body text-muted-foreground">
                        <span>{post.authorAlias}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(post.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AppInner() {
  useInitDefaultCategories();
  useActor();
  const { data: isAdmin = false } = useCheckIsAdmin();

  const { login, clear, loginStatus, identity, isInitializing } =
    useInternetIdentity();
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [view, setView] = useState<AppView>({ type: "home" });

  const navigate: NavigateFn = (v) => {
    setView(v);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isLoggedIn = loginStatus === "success" && !!identity;
  const isLoggingIn = loginStatus === "logging-in";
  const principal = identity?.getPrincipal().toString();

  const navLinks = [
    {
      labelKey: "nav_home" as const,
      icon: Home,
      ocid: "nav.home.link",
      view: { type: "home" } as AppView,
      authOnly: false,
    },
    {
      labelKey: "nav_create" as const,
      icon: PenSquare,
      ocid: "nav.create.link",
      view: { type: "create" } as AppView,
      authOnly: true,
    },
    {
      labelKey: "nav_my_posts" as const,
      icon: BookOpen,
      ocid: "nav.my_posts.link",
      view: { type: "my-posts" } as AppView,
      authOnly: true,
    },
    {
      labelKey: "nav_admin" as const,
      icon: Settings,
      ocid: "nav.admin.link",
      view: { type: "admin" } as AppView,
      authOnly: true,
      adminOnly: true,
    },
  ];

  const visibleLinks = navLinks.filter(
    (l) => (!l.authOnly || isLoggedIn) && (!(l as any).adminOnly || isAdmin),
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <button
            type="button"
            data-ocid="nav.home.link"
            onClick={() => navigate({ type: "home" })}
            className="hklo-logo text-2xl shrink-0 cursor-pointer"
          >
            HKLO
          </button>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {visibleLinks.map((link) => (
              <button
                type="button"
                key={link.ocid}
                data-ocid={link.ocid}
                onClick={() => navigate(link.view)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-body rounded-lg transition-colors ${
                  view.type === link.view.type
                    ? "bg-accent text-foreground"
                    : "text-foreground/70 hover:text-foreground hover:bg-accent/50"
                }`}
              >
                <link.icon className="w-4 h-4" />
                {t(link.labelKey)}
              </button>
            ))}
          </nav>

          {/* Global search */}
          <div className="hidden md:flex flex-1 max-w-xs justify-center">
            <GlobalSearch onNavigate={navigate} />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Language switcher */}
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>

            {isLoggedIn && <NotificationBell onNavigate={navigate} />}

            {isLoggedIn && principal ? (
              <div className="flex items-center gap-2">
                <ProfileDropdown principal={principal} />
                <Button
                  data-ocid="nav.logout.button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    clear();
                    navigate({ type: "home" });
                  }}
                  className="hidden sm:flex items-center gap-1.5 text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  {t("nav_logout")}
                </Button>
              </div>
            ) : (
              <Button
                data-ocid="nav.login.button"
                size="sm"
                onClick={() => login()}
                disabled={isLoggingIn || isInitializing}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isLoggingIn ? t("nav_logging_in") : t("nav_login")}
              </Button>
            )}

            <button
              type="button"
              data-ocid="nav.mobile_menu.toggle"
              className="lg:hidden p-2 rounded-lg hover:bg-accent/50 transition-colors"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={t("nav_menu")}
            >
              {mobileOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden overflow-hidden border-t border-border bg-background"
            >
              <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1">
                {/* Mobile search */}
                <div className="py-2">
                  <GlobalSearch onNavigate={navigate} />
                </div>
                {/* Language switcher mobile */}
                <div className="py-2 px-1">
                  <LanguageSwitcher />
                </div>
                {visibleLinks.map((link) => (
                  <button
                    type="button"
                    key={link.ocid}
                    data-ocid={link.ocid}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-body text-foreground/70 hover:text-foreground hover:bg-accent/50 rounded-lg transition-colors text-left"
                    onClick={() => navigate(link.view)}
                  >
                    <link.icon className="w-4 h-4" />
                    {t(link.labelKey)}
                  </button>
                ))}
                {isLoggedIn && principal && (
                  <div className="px-3 py-2 border-t border-border mt-1">
                    <p className="text-xs font-body text-muted-foreground mb-1">
                      {t("nav_logged_in_as")}
                    </p>
                    <p className="font-mono text-xs text-foreground/70 break-all">
                      {principal}
                    </p>
                  </div>
                )}
                {isLoggedIn && (
                  <button
                    type="button"
                    data-ocid="nav.logout.button"
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-body text-foreground/70 hover:text-foreground hover:bg-accent/50 rounded-lg transition-colors text-left"
                    onClick={() => {
                      clear();
                      navigate({ type: "home" });
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    {t("nav_logout")}
                  </button>
                )}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* Main content */}
      <AnimatePresence mode="wait">
        {view.type === "home" && <HomePage key="home" onNavigate={navigate} />}
        {(view.type === "create" || view.type === "edit") && (
          <main key="editor" className="flex-1">
            <PostEditor
              postId={view.type === "edit" ? view.postId : undefined}
              onNavigate={navigate}
            />
          </main>
        )}
        {view.type === "my-posts" && (
          <main key="my-posts" className="flex-1">
            <MyPosts onNavigate={navigate} />
          </main>
        )}
        {view.type === "admin" && (
          <main
            key="admin"
            className="flex-1 max-w-6xl mx-auto w-full px-4 py-8"
          >
            <AdminPanel onNavigate={navigate} />
          </main>
        )}
        {view.type === "post" && (
          <main key={`post-${String(view.postId)}`} className="flex-1">
            <PostView postId={view.postId} onNavigate={navigate} />
          </main>
        )}
        {view.type === "profile" && (
          <UserProfile
            key={`profile-${view.principalId}`}
            principalId={view.principalId}
            onNavigate={navigate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
