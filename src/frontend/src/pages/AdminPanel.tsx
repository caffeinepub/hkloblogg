import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Principal } from "@icp-sdk/core/principal";
import {
  BookOpen,
  ChevronDown,
  ClipboardList,
  Copy,
  Edit2,
  FileText,
  Globe,
  Loader2,
  Lock,
  Plus,
  Search,
  Settings,
  Shield,
  ShieldOff,
  Trash2,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type {
  AccessLevel,
  Category,
  ModerationLog,
  Post,
  UserProfile,
} from "../backend.d";
import {
  useAddReaderAlias,
  useAllPosts,
  useAllUsers,
  useBlockUser,
  useBlockedUsers,
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useDeletePost,
  useModerationLogs,
  useUnblockUser,
  useUpdateCategory,
  useUpdateUserAlias,
} from "../hooks/useQueries";
import type { NavigateFn } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function accessLevelLabel(level: AccessLevel): string {
  if ("Public" in level) return "Offentlig";
  if ("Restricted" in level) return "Begränsad";
  return "Privat";
}

function accessLevelColor(level: AccessLevel): string {
  if ("Public" in level)
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if ("Restricted" in level)
    return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-rose-100 text-rose-800 border-rose-200";
}

function accessLevelFromString(s: string): AccessLevel {
  if (s === "Public") return { Public: null };
  if (s === "Restricted") return { Restricted: null };
  return { Private: null };
}

function accessLevelToString(level: AccessLevel): string {
  if ("Public" in level) return "Public";
  if ("Restricted" in level) return "Restricted";
  return "Private";
}

function truncatePrincipal(p: string): string {
  if (p.length <= 20) return p;
  return `${p.slice(0, 10)}…${p.slice(-6)}`;
}

function formatDate(ts: bigint): string {
  const ms = Number(ts / 1_000_000n);
  return new Date(ms).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function translateAction(action: string): string {
  const map: Record<string, string> = {
    block_user: "Blockerade användare",
    unblock_user: "Avblockerade användare",
    alias_update: "Uppdaterade alias",
    block: "Blockerat innehåll",
  };
  return map[action] ?? action;
}

// ─── CategoryForm ─────────────────────────────────────────────────────────────

interface CategoryFormValues {
  name: string;
  description: string;
  accessLevel: string;
}

function CategoryForm({
  initial,
  onSubmit,
  isPending,
  submitLabel,
}: {
  initial: CategoryFormValues;
  onSubmit: (v: CategoryFormValues) => void;
  isPending: boolean;
  submitLabel: string;
}) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [accessLevel, setAccessLevel] = useState(initial.accessLevel);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="cat-name" className="font-body text-sm">
          Namn
        </Label>
        <Input
          id="cat-name"
          data-ocid="admin.category_name.input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="T.ex. Vänner"
          className="font-body"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cat-desc" className="font-body text-sm">
          Beskrivning
        </Label>
        <Input
          id="cat-desc"
          data-ocid="admin.category_desc.input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Kort beskrivning…"
          className="font-body"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cat-access" className="font-body text-sm">
          Åtkomstnivå
        </Label>
        <Select value={accessLevel} onValueChange={setAccessLevel}>
          <SelectTrigger
            id="cat-access"
            data-ocid="admin.category_access.select"
            className="font-body"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Public">Offentlig</SelectItem>
            <SelectItem value="Restricted">Begränsad</SelectItem>
            <SelectItem value="Private">Privat</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button
          data-ocid="admin.save_category.submit_button"
          onClick={() => onSubmit({ name, description, accessLevel })}
          disabled={isPending || !name.trim()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-body"
        >
          {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── AddReaderDialog ──────────────────────────────────────────────────────────

function AddReaderDialog({ category }: { category: Category }) {
  const [open, setOpen] = useState(false);
  const [alias, setAlias] = useState("");
  const [principalStr, setPrincipalStr] = useState("");
  const addReader = useAddReaderAlias();

  const handleSubmit = async () => {
    if (!alias.trim()) {
      toast.error("Ange ett alias");
      return;
    }
    if (!principalStr.trim()) {
      toast.error("Ange ett Principal-ID");
      return;
    }
    let principal: Principal;
    try {
      principal = Principal.fromText(principalStr.trim());
    } catch {
      toast.error("Ogiltigt Principal-ID");
      return;
    }
    try {
      await addReader.mutateAsync({
        categoryId: category.id,
        alias: alias.trim(),
        principal,
      });
      toast.success(`${alias} har lagts till i "${category.name}"`);
      setAlias("");
      setPrincipalStr("");
      setOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Något gick fel");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="font-body text-xs gap-1.5"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          Läsare ({category.readerList.length})
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">
            Hantera läsare – {category.name}
          </DialogTitle>
        </DialogHeader>
        {category.readerList.length > 0 && (
          <div className="mb-2">
            <p className="text-xs font-body font-semibold text-foreground/70 uppercase tracking-wider mb-2">
              Nuvarande läsare
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {category.readerList.map((p) => (
                <Badge
                  key={p.toString()}
                  variant="secondary"
                  className="font-mono text-xs"
                >
                  {truncatePrincipal(p.toString())}
                </Badge>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-3 pt-2 border-t border-border">
          <p className="text-xs font-body font-semibold text-foreground/70 uppercase tracking-wider">
            Lägg till läsare
          </p>
          <div className="space-y-2">
            <Input
              data-ocid="admin.reader_alias.input"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Alias"
              className="font-body text-sm"
            />
            <Input
              data-ocid="admin.reader_principal.input"
              value={principalStr}
              onChange={(e) => setPrincipalStr(e.target.value)}
              placeholder="Principal-ID"
              className="font-body text-sm font-mono"
            />
          </div>
          <Button
            data-ocid="admin.add_reader.button"
            size="sm"
            onClick={handleSubmit}
            disabled={addReader.isPending}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-body text-sm"
          >
            {addReader.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Lägg till
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tab: Kategorier ──────────────────────────────────────────────────────────

function KategorierTab() {
  const { data: categories = [], isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);

  const handleCreate = async (v: CategoryFormValues) => {
    try {
      await createCategory.mutateAsync({
        name: v.name.trim(),
        description: v.description.trim(),
        accessLevel: accessLevelFromString(v.accessLevel),
      });
      toast.success("Kategori skapad");
      setCreateOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Något gick fel");
    }
  };

  const handleUpdate = async (v: CategoryFormValues) => {
    if (!editTarget) return;
    try {
      await updateCategory.mutateAsync({
        id: editTarget.id,
        name: v.name.trim(),
        description: v.description.trim(),
        accessLevel: accessLevelFromString(v.accessLevel),
      });
      toast.success("Kategori uppdaterad");
      setEditTarget(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Något gick fel");
    }
  };

  const handleDelete = async (cat: Category) => {
    try {
      await deleteCategory.mutateAsync(cat.id);
      toast.success(`"${cat.name}" har tagits bort`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Något gick fel");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="font-body text-sm text-muted-foreground">
          {categories.length} kategorier totalt
        </p>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button
              data-ocid="admin.new_category.button"
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-body gap-1.5"
            >
              <Plus className="w-4 h-4" /> Ny kategori
            </Button>
          </DialogTrigger>
          <DialogContent data-ocid="admin.new_category.dialog">
            <DialogHeader>
              <DialogTitle className="font-display">Skapa kategori</DialogTitle>
            </DialogHeader>
            <CategoryForm
              initial={{ name: "", description: "", accessLevel: "Public" }}
              onSubmit={handleCreate}
              isPending={createCategory.isPending}
              submitLabel="Skapa"
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div data-ocid="admin.loading_state" className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div
          data-ocid="admin.categories.empty_state"
          className="text-center py-16 text-muted-foreground font-body"
        >
          Inga kategorier hittades.
        </div>
      ) : (
        <Card className="border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-body font-semibold text-foreground/70">
                  Namn
                </TableHead>
                <TableHead className="font-body font-semibold text-foreground/70">
                  Beskrivning
                </TableHead>
                <TableHead className="font-body font-semibold text-foreground/70">
                  Åtkomstnivå
                </TableHead>
                <TableHead className="font-body font-semibold text-foreground/70">
                  Läsare
                </TableHead>
                <TableHead className="font-body font-semibold text-foreground/70 text-right">
                  Åtgärder
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat, i) => (
                <TableRow
                  key={String(cat.id)}
                  data-ocid={`admin.categories.item.${i + 1}`}
                  className="font-body"
                >
                  <TableCell className="font-semibold text-foreground">
                    {cat.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                    {cat.description || "–"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`text-xs font-body border ${accessLevelColor(cat.accessLevel)}`}
                    >
                      {accessLevelLabel(cat.accessLevel)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {"Restricted" in cat.accessLevel ||
                    "Private" in cat.accessLevel ? (
                      <AddReaderDialog category={cat} />
                    ) : (
                      <span className="text-muted-foreground text-sm">–</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Dialog
                        open={editTarget?.id === cat.id}
                        onOpenChange={(o) => setEditTarget(o ? cat : null)}
                      >
                        <DialogTrigger asChild>
                          <Button
                            data-ocid={`admin.category.edit_button.${i + 1}`}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="font-display">
                              Redigera kategori
                            </DialogTitle>
                          </DialogHeader>
                          {editTarget && (
                            <CategoryForm
                              initial={{
                                name: editTarget.name,
                                description: editTarget.description,
                                accessLevel: accessLevelToString(
                                  editTarget.accessLevel,
                                ),
                              }}
                              onSubmit={handleUpdate}
                              isPending={updateCategory.isPending}
                              submitLabel="Spara"
                            />
                          )}
                        </DialogContent>
                      </Dialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            data-ocid={`admin.category.delete_button.${i + 1}`}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-display">
                              Ta bort kategori?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="font-body">
                              Är du säker på att du vill ta bort kategorin{" "}
                              <span className="font-semibold">
                                "{cat.name}"
                              </span>
                              ? Denna åtgärd kan inte ångras.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel
                              data-ocid="admin.delete_category.cancel_button"
                              className="font-body"
                            >
                              Avbryt
                            </AlertDialogCancel>
                            <AlertDialogAction
                              data-ocid="admin.delete_category.confirm_button"
                              className="font-body bg-rose-600 hover:bg-rose-700 text-white"
                              onClick={() => handleDelete(cat)}
                            >
                              Ta bort
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// ─── Tab: Användare ────────────────────────────────────────────────────────────

function AnvandareTab() {
  const { data: users = [], isLoading: usersLoading } = useAllUsers();
  const { data: blockedPrincipals = [], isLoading: blockedLoading } =
    useBlockedUsers();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const updateAlias = useUpdateUserAlias();

  const [search, setSearch] = useState("");
  const [editAliasUser, setEditAliasUser] = useState<UserProfile | null>(null);
  const [newAlias, setNewAlias] = useState("");

  const isLoading = usersLoading || blockedLoading;
  const blockedSet = new Set(blockedPrincipals.map((p) => p.toString()));

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.alias.toLowerCase().includes(q) ||
      u.principalId.toString().toLowerCase().includes(q)
    );
  });

  const handleBlock = async (user: UserProfile) => {
    try {
      await blockUser.mutateAsync(user.principalId);
      toast.success(`${user.alias || "Användaren"} har blockerats.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Något gick fel");
    }
  };

  const handleUnblock = async (user: UserProfile) => {
    try {
      await unblockUser.mutateAsync(user.principalId);
      toast.success(`${user.alias || "Användaren"} har avblockerats.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Något gick fel");
    }
  };

  const handleSaveAlias = async () => {
    if (!editAliasUser) return;
    try {
      await updateAlias.mutateAsync({
        principal: editAliasUser.principalId,
        alias: newAlias.trim(),
      });
      toast.success("Alias uppdaterat");
      setEditAliasUser(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Något gick fel");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="font-body text-sm text-muted-foreground">
          {users.length} användare totalt
        </p>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-ocid="admin.users.search_input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sök alias eller principal…"
            className="pl-9 font-body text-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div data-ocid="admin.loading_state" className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          data-ocid="admin.users.empty_state"
          className="text-center py-16 text-muted-foreground font-body"
        >
          {search
            ? "Inga användare matchar sökningen."
            : "Inga registrerade användare hittades."}
        </div>
      ) : (
        <Card className="border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-body font-semibold text-foreground/70">
                  Alias
                </TableHead>
                <TableHead className="font-body font-semibold text-foreground/70">
                  Principal-ID
                </TableHead>
                <TableHead className="font-body font-semibold text-foreground/70">
                  Status
                </TableHead>
                <TableHead className="font-body font-semibold text-foreground/70">
                  Skapad
                </TableHead>
                <TableHead className="font-body font-semibold text-foreground/70 text-right">
                  Åtgärder
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user, i) => {
                const principalStr = user.principalId.toString();
                const isBlocked = blockedSet.has(principalStr);

                return (
                  <TableRow
                    key={principalStr}
                    data-ocid={`admin.users.item.${i + 1}`}
                    className="font-body"
                  >
                    <TableCell className="font-semibold text-foreground">
                      {user.alias || (
                        <span className="text-muted-foreground italic text-sm">
                          Inget alias
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-muted-foreground">
                          {truncatePrincipal(principalStr)}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            navigator.clipboard.writeText(principalStr);
                            toast.success("Principal-ID kopierat");
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs font-body border ${
                          isBlocked
                            ? "bg-rose-100 text-rose-800 border-rose-200"
                            : "bg-emerald-100 text-emerald-800 border-emerald-200"
                        }`}
                      >
                        {isBlocked ? "Blockerad" : "Aktiv"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Edit alias */}
                        <Dialog
                          open={
                            editAliasUser?.principalId.toString() ===
                            principalStr
                          }
                          onOpenChange={(o) => {
                            if (o) {
                              setEditAliasUser(user);
                              setNewAlias(user.alias);
                            } else setEditAliasUser(null);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              data-ocid={`admin.users.edit_button.${i + 1}`}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle className="font-display">
                                Redigera alias
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3">
                              <p className="text-sm font-body text-muted-foreground font-mono">
                                {principalStr}
                              </p>
                              <div className="space-y-1.5">
                                <Label className="font-body text-sm">
                                  Nytt alias
                                </Label>
                                <Input
                                  data-ocid="admin.users.alias_input"
                                  value={newAlias}
                                  onChange={(e) => setNewAlias(e.target.value)}
                                  placeholder="Ange alias…"
                                  className="font-body"
                                  onKeyDown={(e) =>
                                    e.key === "Enter" && handleSaveAlias()
                                  }
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                data-ocid="admin.users.save_button"
                                onClick={handleSaveAlias}
                                disabled={
                                  updateAlias.isPending || !newAlias.trim()
                                }
                                className="bg-primary text-primary-foreground hover:bg-primary/90 font-body"
                              >
                                {updateAlias.isPending ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : null}
                                Spara
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        {/* Block / Unblock */}
                        {isBlocked ? (
                          <Button
                            data-ocid={`admin.users.unblock_button.${i + 1}`}
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUnblock(user)}
                            disabled={unblockUser.isPending}
                            className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                          >
                            <ShieldOff className="w-3.5 h-3.5" />
                          </Button>
                        ) : (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                data-ocid={`admin.users.block_button.${i + 1}`}
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              >
                                <Shield className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent data-ocid="admin.block_user.dialog">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="font-display">
                                  Blockera användare?
                                </AlertDialogTitle>
                                <AlertDialogDescription className="font-body">
                                  Är du säker på att du vill blockera{" "}
                                  <span className="font-semibold">
                                    {user.alias || "denna användare"}
                                  </span>
                                  ? Användaren kommer inte längre kunna använda
                                  tjänsten.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel
                                  data-ocid="admin.block_user.cancel_button"
                                  className="font-body"
                                >
                                  Avbryt
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  data-ocid="admin.block_user.confirm_button"
                                  className="font-body bg-rose-600 hover:bg-rose-700 text-white"
                                  onClick={() => handleBlock(user)}
                                >
                                  Ja, blockera
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// ─── Tab: Moderering ──────────────────────────────────────────────────────────

function ModereringTab() {
  const { data: logs = [], isLoading } = useModerationLogs();

  const sorted = [...logs].sort((a, b) => Number(b.timestamp - a.timestamp));

  return (
    <div className="space-y-5">
      <p className="font-body text-sm text-muted-foreground">
        {logs.length} loggposter totalt
      </p>

      {isLoading ? (
        <div data-ocid="admin.loading_state" className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div
          data-ocid="admin.moderation.empty_state"
          className="text-center py-16 text-muted-foreground font-body"
        >
          Inga modereringsloggar hittades.
        </div>
      ) : (
        <Card className="border-border">
          <Table data-ocid="admin.moderation.table">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-body font-semibold text-foreground/70">
                  Tidpunkt
                </TableHead>
                <TableHead className="font-body font-semibold text-foreground/70">
                  Åtgärd
                </TableHead>
                <TableHead className="font-body font-semibold text-foreground/70">
                  Admin
                </TableHead>
                <TableHead className="font-body font-semibold text-foreground/70">
                  Målanvändare
                </TableHead>
                <TableHead className="font-body font-semibold text-foreground/70">
                  Typ
                </TableHead>
                <TableHead className="font-body font-semibold text-foreground/70">
                  Detalj
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((log: ModerationLog, _i) => (
                <TableRow key={String(log.id)} className="font-body">
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(log.timestamp)}
                  </TableCell>
                  <TableCell>
                    <Badge className="text-xs font-body bg-amber-100 text-amber-800 border border-amber-200">
                      {translateAction(log.action)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {truncatePrincipal(log.admin.toString())}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {log.targetUser.length > 0
                      ? truncatePrincipal(log.targetUser[0]!.toString())
                      : "–"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.contentType || "–"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {log.snippet || log.reason || "–"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// ─── Tab: Inlägg ──────────────────────────────────────────────────────────────

function InlaggTab({ onNavigate }: { onNavigate: NavigateFn }) {
  const { data: posts = [], isLoading } = useAllPosts();
  const { data: categories = [] } = useCategories();
  const deletePost = useDeletePost();

  const [search, setSearch] = useState("");

  const categoryMap = new Map(categories.map((c) => [String(c.id), c.name]));

  const filtered = posts.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.authorAlias.toLowerCase().includes(q)
    );
  });

  const handleDelete = async (post: Post) => {
    try {
      await deletePost.mutateAsync(post.id);
      toast.success(`"${post.title}" har tagits bort`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Något gick fel");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="font-body text-sm text-muted-foreground">
          {posts.length} inlägg totalt
        </p>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-ocid="admin.posts.search_input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sök titel eller författare…"
            className="pl-9 font-body text-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div data-ocid="admin.loading_state" className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          data-ocid="admin.posts.empty_state"
          className="text-center py-16 text-muted-foreground font-body"
        >
          {search
            ? "Inga inlägg matchar sökningen."
            : "Inga publicerade inlägg hittades."}
        </div>
      ) : (
        <Card className="border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-body font-semibold text-foreground/70">
                  Titel
                </TableHead>
                <TableHead className="font-body font-semibold text-foreground/70">
                  Författare
                </TableHead>
                <TableHead className="font-body font-semibold text-foreground/70">
                  Kategori
                </TableHead>
                <TableHead className="font-body font-semibold text-foreground/70">
                  Status
                </TableHead>
                <TableHead className="font-body font-semibold text-foreground/70">
                  Datum
                </TableHead>
                <TableHead className="font-body font-semibold text-foreground/70 text-right">
                  Åtgärder
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((post, i) => (
                <TableRow
                  key={String(post.id)}
                  data-ocid={`admin.posts.item.${i + 1}`}
                  className="font-body"
                >
                  <TableCell className="font-semibold text-foreground max-w-xs truncate">
                    {post.title}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {post.authorAlias || "–"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {categoryMap.get(String(post.categoryId)) ??
                      `ID ${String(post.categoryId)}`}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`text-xs font-body border ${
                        "Published" in post.status
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {"Published" in post.status ? "Publicerad" : "Utkast"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(post.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        data-ocid={`admin.posts.edit_button.${i + 1}`}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() =>
                          onNavigate({ type: "edit", postId: post.id })
                        }
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            data-ocid={`admin.posts.delete_button.${i + 1}`}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-display">
                              Ta bort inlägg?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="font-body">
                              Är du säker på att du vill ta bort inlägget{" "}
                              <span className="font-semibold">
                                "{post.title}"
                              </span>
                              ? Denna åtgärd kan inte ångras.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel
                              data-ocid="admin.delete_post.cancel_button"
                              className="font-body"
                            >
                              Avbryt
                            </AlertDialogCancel>
                            <AlertDialogAction
                              data-ocid="admin.delete_post.confirm_button"
                              className="font-body bg-rose-600 hover:bg-rose-700 text-white"
                              onClick={() => handleDelete(post)}
                            >
                              Ta bort
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// ─── AdminPanel ───────────────────────────────────────────────────────────────

interface AdminPanelProps {
  onNavigate: NavigateFn;
}

export default function AdminPanel({ onNavigate }: AdminPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="max-w-6xl mx-auto px-4 py-10"
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Adminpanel
          </h1>
        </div>
        <p className="font-body text-muted-foreground">
          Hantera kategorier, användare, moderering och inlägg.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="kategorier">
        <TabsList className="mb-8 bg-muted/60 border border-border rounded-xl h-auto p-1 flex flex-wrap gap-1">
          <TabsTrigger
            data-ocid="admin.kategorier.tab"
            value="kategorier"
            className="font-body text-sm rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <BookOpen className="w-4 h-4" />
            Kategorier
          </TabsTrigger>
          <TabsTrigger
            data-ocid="admin.anvandare.tab"
            value="anvandare"
            className="font-body text-sm rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Users className="w-4 h-4" />
            Användare
          </TabsTrigger>
          <TabsTrigger
            data-ocid="admin.moderering.tab"
            value="moderering"
            className="font-body text-sm rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <ClipboardList className="w-4 h-4" />
            Moderering
          </TabsTrigger>
          <TabsTrigger
            data-ocid="admin.inlagg.tab"
            value="inlagg"
            className="font-body text-sm rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <FileText className="w-4 h-4" />
            Inlägg
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kategorier">
          <KategorierTab />
        </TabsContent>

        <TabsContent value="anvandare">
          <AnvandareTab />
        </TabsContent>

        <TabsContent value="moderering">
          <ModereringTab />
        </TabsContent>

        <TabsContent value="inlagg">
          <InlaggTab onNavigate={onNavigate} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
