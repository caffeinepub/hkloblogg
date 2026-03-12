import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Globe,
  Home,
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
import type { Post } from "./backend.d";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import {
  useCategories,
  useInitDefaultCategories,
  usePublishedPosts,
  useSearchPosts,
} from "./hooks/useQueries";
import AdminPanel from "./pages/AdminPanel";
import Discover from "./pages/Discover";
import MyPosts from "./pages/MyPosts";
import PostEditor from "./pages/PostEditor";
import PostView from "./pages/PostView";
import type { AppView, NavigateFn } from "./types";

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
        <span className="text-xs font-body text-muted-foreground">
          {post.authorAlias}
        </span>
      </div>
    </motion.article>
  );
}

function EmptyState() {
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
        Inga publicerade inlägg ännu
      </h3>
      <p className="text-muted-foreground font-body text-sm max-w-xs">
        Bli den första att dela din historia!
      </p>
    </motion.div>
  );
}

function HomePage({ onNavigate }: { onNavigate: NavigateFn }) {
  const { isInitializing, login, loginStatus, identity } =
    useInternetIdentity();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: posts = [], isLoading: postsLoading } = usePublishedPosts();
  const { data: categories = [] } = useCategories();

  const isLoggedIn = loginStatus === "success" && !!identity;
  const isLoggingIn = loginStatus === "logging-in";

  const filteredPosts = posts.filter((p) => {
    const matchQuery = searchQuery
      ? p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.content.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchCategory =
      selectedCategory === "all" || String(p.categoryId) === selectedCategory;
    return matchQuery && matchCategory;
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
              En plattform för berättelser, tankar och gemenskap. Dela din
              historia med världen.
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
                  Skapa inlägg
                </Button>
              ) : (
                <Button
                  data-ocid="hero.login.button"
                  size="lg"
                  onClick={() => login()}
                  disabled={isLoggingIn || isInitializing}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-body font-semibold px-8"
                >
                  {isLoggingIn ? "Loggar in…" : "Logga in för att skriva"}
                </Button>
              )}
              <Button
                data-ocid="hero.discover.button"
                size="lg"
                variant="outline"
                onClick={() => onNavigate({ type: "discover" })}
                className="font-body border-foreground/20 hover:bg-accent/50"
              >
                <Globe className="w-5 h-5 mr-2" />
                Utforska berättelser
              </Button>
            </div>
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
              Senaste berättelserna
            </h2>
            {posts.length > 0 && (
              <Badge variant="secondary" className="font-body">
                {posts.length} inlägg
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
                Alla inlägg
              </TabsTrigger>
              <TabsTrigger
                data-ocid="posts.my_feed.tab"
                value="feed"
                className="font-body"
                disabled={!isLoggedIn}
              >
                Mitt flöde
              </TabsTrigger>
            </TabsList>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  data-ocid="posts.search_input"
                  placeholder="Sök efter berättelser…"
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
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla kategorier</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={String(cat.id)} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <TabsContent value="all">
              {postsLoading ? (
                <div
                  data-ocid="posts.loading_state"
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="bg-card border border-border rounded-xl p-6 space-y-3"
                    >
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredPosts.length > 0 ? (
                    filteredPosts.map((post, i) => (
                      <PostCard
                        key={String(post.id)}
                        post={post}
                        index={i}
                        onNavigate={onNavigate}
                      />
                    ))
                  ) : (
                    <EmptyState />
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="feed">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isLoggedIn ? (
                  filteredPosts.length > 0 ? (
                    filteredPosts.map((post, i) => (
                      <PostCard
                        key={String(post.id)}
                        post={post}
                        index={i}
                        onNavigate={onNavigate}
                      />
                    ))
                  ) : (
                    <EmptyState />
                  )
                ) : (
                  <div
                    data-ocid="feed.empty_state"
                    className="col-span-full text-center py-20"
                  >
                    <p className="font-body text-muted-foreground">
                      Logga in för att se ditt personliga flöde.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </section>
    </main>
  );
}

// ─── Global search dropdown ───────────────────────────────────────────────────
function GlobalSearch({ onNavigate }: { onNavigate: NavigateFn }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: results = [], isFetching } = useSearchPosts(query);

  // Close on outside click
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

  // Close on Escape
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
          placeholder="Sök inlägg, författare…"
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
                Inga resultat för "{query}"
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
  // Fire-and-forget: seed default categories once actor is ready
  useInitDefaultCategories();
  // Actor needed for useSearchPosts inside GlobalSearch — kept top-level
  useActor();

  const { login, clear, loginStatus, identity, isInitializing } =
    useInternetIdentity();
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
      label: "Hem",
      icon: Home,
      ocid: "nav.home.link",
      view: { type: "home" } as AppView,
    },
    {
      label: "Upptäck",
      icon: Globe,
      ocid: "nav.discover.link",
      view: { type: "discover" } as AppView,
    },
    {
      label: "Skapa inlägg",
      icon: PenSquare,
      ocid: "nav.create.link",
      view: { type: "create" } as AppView,
      authOnly: true,
    },
    {
      label: "Mina inlägg",
      icon: BookOpen,
      ocid: "nav.my_posts.link",
      view: { type: "my-posts" } as AppView,
      authOnly: true,
    },
    {
      label: "Admin",
      icon: Settings,
      ocid: "nav.admin.link",
      view: { type: "admin" } as AppView,
      authOnly: true,
    },
  ];

  const visibleLinks = navLinks.filter((l) => !l.authOnly || isLoggedIn);

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
                {link.label}
              </button>
            ))}
          </nav>

          {/* Global search */}
          <div className="hidden md:flex flex-1 max-w-xs justify-center">
            <GlobalSearch onNavigate={navigate} />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            {isLoggedIn && (
              <button
                type="button"
                data-ocid="nav.notifications.button"
                className="relative p-2 rounded-lg hover:bg-accent/50 transition-colors"
                aria-label="Notifikationer"
              >
                <Bell className="w-5 h-5 text-foreground/70" />
              </button>
            )}

            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-accent rounded-lg text-xs font-body text-foreground/70">
                  <User className="w-3.5 h-3.5" />
                  <span className="max-w-[100px] truncate">
                    {principal?.slice(0, 8)}…
                  </span>
                </div>
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
                  Logga ut
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
                {isLoggingIn ? "Loggar in…" : "Logga in"}
              </Button>
            )}

            <button
              type="button"
              data-ocid="nav.mobile_menu.toggle"
              className="lg:hidden p-2 rounded-lg hover:bg-accent/50 transition-colors"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Meny"
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
                {visibleLinks.map((link) => (
                  <button
                    type="button"
                    key={link.ocid}
                    data-ocid={link.ocid}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-body text-foreground/70 hover:text-foreground hover:bg-accent/50 rounded-lg transition-colors text-left"
                    onClick={() => navigate(link.view)}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </button>
                ))}
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
                    Logga ut
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
        {view.type === "discover" && (
          <main key="discover" className="flex-1">
            <Discover onNavigate={navigate} />
          </main>
        )}
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
        {view.type === "post" && (
          <main key={`post-${String(view.postId)}`} className="flex-1">
            <PostView postId={view.postId} onNavigate={navigate} />
          </main>
        )}
        {view.type === "admin" && (
          <main key="admin" className="flex-1">
            <AdminPanel onNavigate={navigate} />
          </main>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="hklo-logo text-xl">HKLO</span>
          <p className="font-body text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()}. Byggd med{" "}
            <span aria-label="kärlek">❤️</span> med{" "}
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
