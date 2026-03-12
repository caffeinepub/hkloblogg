import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Principal } from "@icp-sdk/core/principal";
import { Globe, Loader2, Lock, Plus, Settings, Users } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { AccessLevel, Category } from "../backend.d";
import { useAddReaderAlias, useCategories } from "../hooks/useQueries";
import type { NavigateFn } from "../types";

function accessLevelIcon(level: AccessLevel) {
  if ("Public" in level) return Globe;
  if ("Restricted" in level) return Users;
  return Lock;
}

function accessLevelLabel(level: AccessLevel) {
  if ("Public" in level) return "Offentlig";
  if ("Restricted" in level) return "Begränsad";
  return "Privat";
}

function accessLevelColor(level: AccessLevel) {
  if ("Public" in level) return "bg-emerald-100 text-emerald-800";
  if ("Restricted" in level) return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

function AddReaderForm({ category }: { category: Category }) {
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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Något gick fel");
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-border space-y-3">
      <p className="text-xs font-body font-semibold text-foreground/70 uppercase tracking-wider">
        Lägg till läsare
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label
            htmlFor={`alias-${String(category.id)}`}
            className="font-body text-xs"
          >
            Alias
          </Label>
          <Input
            id={`alias-${String(category.id)}`}
            data-ocid="admin.reader_alias.input"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="T.ex. Anna"
            className="font-body text-sm h-9"
          />
        </div>
        <div className="space-y-1">
          <Label
            htmlFor={`principal-${String(category.id)}`}
            className="font-body text-xs"
          >
            Principal-ID
          </Label>
          <Input
            id={`principal-${String(category.id)}`}
            data-ocid="admin.reader_principal.input"
            value={principalStr}
            onChange={(e) => setPrincipalStr(e.target.value)}
            placeholder="xxxx-xxxx-xxxx-xxxx-xxx"
            className="font-body text-sm h-9 font-mono"
          />
        </div>
      </div>
      <Button
        data-ocid="admin.add_reader.button"
        size="sm"
        onClick={handleSubmit}
        disabled={addReader.isPending}
        className="bg-primary text-primary-foreground hover:bg-primary/90 font-body text-xs"
      >
        {addReader.isPending ? (
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
        ) : (
          <Plus className="w-3.5 h-3.5 mr-1.5" />
        )}
        Lägg till läsare
      </Button>
    </div>
  );
}

interface AdminPanelProps {
  onNavigate: NavigateFn;
}

export default function AdminPanel({
  onNavigate: _onNavigate,
}: AdminPanelProps) {
  const { data: categories = [], isLoading } = useCategories();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto px-4 py-10"
    >
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Adminpanel
          </h1>
        </div>
        <p className="font-body text-muted-foreground">
          Hantera kategorier och läsarrättigheter.
        </p>
      </div>

      <section>
        <h2 className="font-display text-xl font-bold text-foreground mb-4">
          Kategorier
        </h2>

        {isLoading ? (
          <div data-ocid="admin.loading_state" className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-xl p-6 space-y-3"
              >
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div
            data-ocid="admin.empty_state"
            className="text-center py-16 text-muted-foreground font-body"
          >
            Inga kategorier hittades.
          </div>
        ) : (
          <div className="space-y-4">
            {categories.map((cat, i) => {
              const Icon = accessLevelIcon(cat.accessLevel);
              const isRestricted = "Restricted" in cat.accessLevel;
              return (
                <motion.div
                  key={String(cat.id)}
                  data-ocid={`admin.item.${i + 1}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
                        <CardTitle className="font-display text-base font-bold text-foreground">
                          {cat.name}
                        </CardTitle>
                        <Badge
                          className={`text-xs font-body ${accessLevelColor(cat.accessLevel)}`}
                        >
                          {accessLevelLabel(cat.accessLevel)}
                        </Badge>
                      </div>
                      {cat.description && (
                        <p className="text-sm font-body text-muted-foreground mt-1">
                          {cat.description}
                        </p>
                      )}
                    </CardHeader>
                    {isRestricted && (
                      <CardContent>
                        {cat.readerList.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-body font-semibold text-foreground/70 uppercase tracking-wider mb-2">
                              Nuvarande läsare ({cat.readerList.length})
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {cat.readerList.map((p) => (
                                <Badge
                                  key={p.toString()}
                                  variant="secondary"
                                  className="font-mono text-xs"
                                >
                                  {p.toString().slice(0, 10)}…
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        <AddReaderForm category={cat} />
                      </CardContent>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </motion.div>
  );
}
