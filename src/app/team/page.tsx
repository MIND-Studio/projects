"use client";

// Team & Partner — every project participant, grouped by organisation.
// Owners manage the consortium here: invite, change role, remove (the pod's
// WAC is recompiled from the new membership list on every change).

import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
  NativeSelect,
  NativeSelectOption,
  Spinner,
} from "@mind-studio/ui";
import {
  Bot,
  Building2,
  ChevronRight,
  MoreHorizontal,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Shell, useHub } from "@/components/Shell";
import { ROLE_LABEL } from "@/lib/labels";
import { ORG_ROLE_LABEL, orgsOf } from "@/lib/orgs";
import { profile } from "@/lib/profile";
import { usernameOf } from "@/lib/solid/auth";
import { loadTracker } from "@/lib/solid/data";
import {
  addParticipant,
  changeParticipantRole,
  removalBlocker,
  removeParticipant,
} from "@/lib/solid/participants";
import type { Membership, ProjectMeta, Role, Tracker } from "@/lib/solid/turtle";
import { t } from "@/lib/strings";

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const ROLE_BADGE_VARIANT: Record<Role, "default" | "secondary" | "outline"> = {
  Owner: "default",
  Member: "secondary",
  Guest: "outline",
};

function InviteDialog({
  open,
  onOpenChange,
  orgs,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  orgs: string[];
  onDone: (p: ProjectMeta) => void;
}) {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [role, setRole] = useState<Role>("Guest");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !name.trim() || !org.trim()) return;
    setBusy(true);
    try {
      const project = await addParticipant({
        username: username.trim(),
        name: name.trim(),
        org: org.trim(),
        role,
      });
      toast.success(t.roleNow(name.trim(), ROLE_LABEL[role]));
      onOpenChange(false);
      setUsername("");
      setName("");
      setOrg("");
      setRole("Guest");
      onDone(project);
    } catch (err) {
      toast.error(
        (err as { status?: number }).status === 403 ? t.inviteForbidden : t.inviteFailed(err),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{t.invitePartner}</DialogTitle>
          <DialogDescription>
            {t.inviteDialogDesc(profile.appName, username.trim() || t.usernamePlaceholder)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="inv-username">{t.username}</Label>
              <Input
                id="inv-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.usernameExample}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-name">{t.displayName}</Label>
              <Input
                id="inv-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.nameExample}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="inv-org">{t.organization}</Label>
            <Input
              id="inv-org"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              placeholder={t.organization}
              list="inv-orgs"
            />
            <datalist id="inv-orgs">
              {orgs.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
          </div>
          <div className="space-y-2 [&>div]:w-full">
            <Label htmlFor="inv-role">{t.role}</Label>
            <NativeSelect
              id="inv-role"
              value={role}
              className="w-full"
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <NativeSelectOption value="Guest">
                {t.roleGuestDesc(ROLE_LABEL.Guest)}
              </NativeSelectOption>
              <NativeSelectOption value="Member">
                {t.roleMemberDesc(ROLE_LABEL.Member)}
              </NativeSelectOption>
              <NativeSelectOption value="Owner">
                {t.roleOwnerDesc(ROLE_LABEL.Owner)}
              </NativeSelectOption>
            </NativeSelect>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button
              type="submit"
              disabled={busy || !username.trim() || !name.trim() || !org.trim()}
            >
              {busy && <Spinner data-icon="inline-start" />}
              {t.invite}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MemberRow({
  m,
  isOwner,
  openTasks,
  project,
  selfWebId,
  onChanged,
}: {
  m: Membership;
  isOwner: boolean;
  openTasks: number | null;
  project: ProjectMeta;
  selfWebId: string;
  onChanged: (p: ProjectMeta) => void;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const username = usernameOf(m.agent);
  const name = m.name ?? username;
  const blocker = removalBlocker(project, m, selfWebId);

  const setRole = async (role: Role) => {
    if (role === m.role) return;
    // never demote the last owner (also guards demoting yourself as last owner)
    if (m.role === "Owner" && project.members.filter((x) => x.role === "Owner").length <= 1) {
      toast.error(t.lastOwner);
      return;
    }
    setBusy(true);
    try {
      const p = await changeParticipantRole(m.agent, role);
      toast.success(t.roleNow(name, ROLE_LABEL[role]));
      onChanged(p);
    } catch (e) {
      toast.error(t.roleChangeFailed(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const p = await removeParticipant(m.agent);
      toast(t.memberRemoved(name));
      setConfirmRemove(false);
      onChanged(p);
    } catch (e) {
      toast.error(t.removeFailed(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent/60">
      <Link href={`/team/${username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar className="size-8">
          <AvatarFallback className="bg-primary/15 text-[11px] font-semibold text-primary">
            {initialsOf(name)}
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <span className="truncate">{name}</span>
            {m.agent === selfWebId && (
              <Badge variant="outline" className="px-1.5 text-[10px] text-muted-foreground">
                {t.you}
              </Badge>
            )}
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
          </span>
          <span className="block truncate font-mono text-xs text-muted-foreground">
            {username}
            {openTasks !== null && openTasks > 0 && (
              <span className="ml-2">{t.openCount(openTasks)}</span>
            )}
          </span>
        </span>
      </Link>
      <Badge variant={ROLE_BADGE_VARIANT[m.role]} className="shrink-0">
        {ROLE_LABEL[m.role]}
      </Badge>
      {isOwner && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-muted-foreground"
              disabled={busy}
              aria-label={t.manageMember(name)}
            >
              {busy ? <Spinner className="size-3.5" /> : <MoreHorizontal className="size-4" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs">{t.changeRole}</DropdownMenuLabel>
            {(["Owner", "Member", "Guest"] as Role[]).map((r) => (
              <DropdownMenuItem key={r} disabled={r === m.role} onClick={() => void setRole(r)}>
                <ShieldCheck className={r === m.role ? "text-primary" : ""} />
                {ROLE_LABEL[r]}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={!!blocker}
              onClick={() => setConfirmRemove(true)}
              title={blocker ?? undefined}
            >
              <Trash2 /> {t.removeFromProject}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Dialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">{t.removeMemberTitle(name)}</DialogTitle>
            <DialogDescription>{t.removeMemberDesc(name, m.org ?? "")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmRemove(false)} disabled={busy}>
              {t.cancel}
            </Button>
            <Button variant="destructive" onClick={() => void remove()} disabled={busy}>
              {busy && <Spinner data-icon="inline-start" />}
              {t.remove}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Team() {
  const hub = useHub();
  const isOwner = hub.role === "Owner";
  const [project, setProject] = useState<ProjectMeta>(hub.project);
  const [tracker, setTracker] = useState<Tracker | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    loadTracker()
      .then(setTracker)
      .catch(() => setTracker(null));
  }, []);

  const orgs = orgsOf(project.members);
  const kai = project.members.find((m) => m.kind === "Worker");
  const openCount = (agent: string) =>
    tracker === null
      ? null
      : tracker.issues.filter(
          (i) => i.assignee === agent && !["done", "cancelled"].includes(i.state),
        ).length;

  return (
    <div className="stagger space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-lg font-semibold tracking-tight">{t.teamAndPartner}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.orgsAndPeople(
              orgs.length,
              project.members.filter((m) => m.kind !== "Worker").length,
            )}
          </p>
        </div>
        {isOwner && (
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus /> {t.invitePartner}
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {orgs.map((org) => (
          <Card key={org.slug} className="glow-hover gap-3 py-4">
            <CardContent className="space-y-2 px-4">
              <Link
                href={`/orgs/${org.slug}`}
                className="group flex items-center justify-between gap-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="size-4" />
                  </span>
                  <span className="truncate font-display text-sm font-semibold transition-colors group-hover:text-primary">
                    {org.name}
                  </span>
                </span>
                <Badge variant="outline" className="shrink-0 text-muted-foreground">
                  {ORG_ROLE_LABEL[org.role]}
                </Badge>
              </Link>
              <div>
                {org.members.map((m) => (
                  <MemberRow
                    key={m.agent}
                    m={m}
                    isOwner={isOwner}
                    openTasks={openCount(m.agent)}
                    project={project}
                    selfWebId={hub.webId}
                    onChanged={setProject}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {kai && (
          <Card className="glow-hover gap-3 border-dashed py-4">
            <CardContent className="flex items-center gap-3 px-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bot className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  {kai.name ?? profile.assistantName}
                </span>
                <span className="block text-xs text-muted-foreground">{t.assistantSubtitle}</span>
              </span>
              <Button variant="outline" size="sm" asChild>
                <Link href="/chat">{t.askAssistant(profile.assistantName)}</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {isOwner && (
        <InviteDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          orgs={[...new Set(orgs.map((o) => o.name))]}
          onDone={setProject}
        />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Shell>
      <Team />
    </Shell>
  );
}
