/**
 * Admin user list — the web's mobile card branch of AdminUsersTable.
 * The guards live on the backend; this only explains why a button is
 * missing ("This is you") so an admin isn't left tapping something that
 * will always 400. There is no role control: admin comes from AUTH_ADMINS.
 */
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText, Button } from "@/ui";
import type { ManagedUser } from "@/shared/api";

interface Actions {
  onSendReset: (u: ManagedUser) => void;
  onToggleActive: (u: ManagedUser) => void;
  onDelete: (u: ManagedUser) => void;
  busyId: string | null;
  currentUserId: string | undefined;
}

function formatAdded(raw: string): string {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function MethodBadge({ label }: { label: string }) {
  return (
    <View className="rounded-md border border-white/10 px-1.5 py-0.5">
      <AppText className="text-[10px] text-white/60">{label}</AppText>
    </View>
  );
}

const METHOD_LABEL = { password: "Password", google: "Google", apple: "Apple" } as const;

function RoleBadge({ role }: { role: ManagedUser["role"] }) {
  if (role !== "admin") return <AppText className="text-xs text-white/40">User</AppText>;
  return (
    <View className="rounded-md border border-accent/30 bg-accent/10 px-1.5 py-0.5">
      <AppText className="font-sans-semibold text-[10px] uppercase tracking-[0.5px] text-accent">Admin</AppText>
    </View>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className={`h-1.5 w-1.5 rounded-full ${active ? "bg-gain" : "bg-white/25"}`} />
      <AppText className={`text-xs ${active ? "text-white/70" : "text-white/40"}`}>{active ? "Active" : "Disabled"}</AppText>
    </View>
  );
}

function UserActions({ u, onSendReset, onToggleActive, onDelete, busyId, currentUserId }: Actions & { u: ManagedUser }) {
  const busy = busyId === u.id;
  const isSelf = u.id === currentUserId;
  return (
    <View className="flex-row flex-wrap items-center gap-2">
      <Button variant="secondary" label="Send reset email" onPress={() => onSendReset(u)} disabled={busy} />
      {isSelf ? (
        <AppText className="text-[11px] text-white/30">This is you</AppText>
      ) : (
        <>
          <Button variant="secondary" label={u.is_active ? "Disable" : "Enable"} onPress={() => onToggleActive(u)} disabled={busy} />
          <Button variant="danger" label="Delete" onPress={() => onDelete(u)} disabled={busy} />
        </>
      )}
    </View>
  );
}

export function UsersList({ users, ...actions }: Actions & { users: ManagedUser[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!users.length) {
    return (
      <View className="items-center rounded-xl border border-white/10 bg-charcoal p-6">
        <AppText className="text-sm text-white/40">No users yet.</AppText>
      </View>
    );
  }

  return (
    <View className="gap-3">
      {users.map((u) => {
        const open = expanded === u.id;
        return (
          <View key={u.id} className="rounded-xl border border-white/10 bg-charcoal p-4">
            <Pressable
              onPress={() => setExpanded(open ? null : u.id)}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              accessibilityLabel={`${u.email}, ${open ? "hide" : "show"} actions`}
              className="min-h-[44px] flex-row items-center justify-between gap-3"
            >
              <View className="min-w-0 flex-1">
                <View className="flex-row items-center gap-2">
                  <AppText numberOfLines={1} className="shrink font-mono text-sm text-white">{u.name || u.email}</AppText>
                  <RoleBadge role={u.role} />
                </View>
                {u.name ? (
                  <AppText numberOfLines={1} className="mt-0.5 text-xs text-white/50">{u.email}</AppText>
                ) : null}
                <View className="mt-1.5 flex-row flex-wrap items-center gap-1.5">
                  {u.methods.map((m) => <MethodBadge key={m} label={METHOD_LABEL[m]} />)}
                  {u.email_verified ? null : <MethodBadge label={u.methods.length ? "Unverified" : "Pending"} />}
                </View>
                <View className="mt-1 flex-row items-center gap-3">
                  <StatusDot active={u.is_active} />
                  <AppText className="text-xs text-white/40">
                    {`${u.holdings_count} holding${u.holdings_count === 1 ? "" : "s"}`}
                  </AppText>
                </View>
              </View>
              <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color="rgba(255,255,255,0.3)" />
            </Pressable>
            {open ? (
              <View className="mt-3 border-t border-white/10 pt-3">
                <AppText className="mb-3 text-xs text-white/40">{`Added ${formatAdded(u.created_at)}`}</AppText>
                <UserActions u={u} {...actions} />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
