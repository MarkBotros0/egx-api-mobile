/**
 * User management. The backend 403s non-admins regardless (and the route is
 * guarded in the root navigator); the in-screen check just avoids an
 * admin-shaped page full of errors. No role picker: admin comes only from
 * AUTH_ADMINS on the server.
 */
import { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText, Button, CardSkeleton, Screen, confirm } from "@/ui";
import { useAuth } from "@/auth/AuthProvider";
import { errorMessage } from "@/lib/errors";
import { routes } from "@/lib/links";
import { COLORS } from "@/shared/theme";
import { deleteUser, fetchUsers, inviteUser, sendUserReset, setUserActive, type ManagedUser } from "@/shared/api";
import { InviteUserSheet } from "./InviteUserSheet";
import { UsersList } from "./UsersList";

export function AdminScreen() {
  const { isAdmin, isLoading: authLoading, user } = useAuth();
  const insets = useSafeAreaInsets();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  // Bumped on every open: a fresh form each time, while the sheet stays
  // mounted (hidden) long enough to animate out.
  const [inviteKey, setInviteKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchUsers();
      setUsers(data.users);
      setError(null);
    } catch (e: unknown) {
      setError(errorMessage(e, "Could not load users"));
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount once the admin session is known, as usePortfolioData does
    if (!authLoading && isAdmin) void load();
  }, [authLoading, isAdmin, load]);

  const handleInvite = async (email: string, name: string) => {
    const res = await inviteUser(email, name);
    setShowInvite(false);
    setError(null);
    setNotice(`Invitation sent to ${res.user.email}.`);
    await load();
  };

  const handleSendReset = async (u: ManagedUser) => {
    const ok = await confirm({
      title: "Send reset email",
      message: `Email ${u.email} a link to choose a new password?`,
      confirmLabel: "Send",
    });
    if (!ok) return;
    setBusyId(u.id);
    setError(null);
    try {
      const res = await sendUserReset(u.id);
      setNotice(res.sent === "invite" ? `Invitation re-sent to ${u.email}.` : `Reset link sent to ${u.email}.`);
    } catch (e: unknown) {
      setNotice(null);
      setError(errorMessage(e, "Could not send the email"));
    } finally {
      setBusyId(null);
    }
  };

  const handleToggle = async (u: ManagedUser) => {
    setBusyId(u.id);
    setError(null);
    try {
      await setUserActive(u.id, !u.is_active);
      await load();
    } catch (e: unknown) {
      setError(errorMessage(e, "Could not update the user"));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (u: ManagedUser) => {
    // Spelled out because it is irreversible and takes their data with it.
    const ok = await confirm({
      title: "Delete user",
      message: `Delete ${u.email}? This permanently removes their portfolio, sale history and watchlist. This cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    setBusyId(u.id);
    setError(null);
    try {
      await deleteUser(u.id);
      await load();
    } catch (e: unknown) {
      setError(errorMessage(e, "Could not delete the user"));
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading) {
    return (
      <Screen edges={[]}>
        <View className="py-8">
          <CardSkeleton />
        </View>
      </Screen>
    );
  }

  if (!isAdmin) {
    return (
      <Screen edges={[]}>
        <View className="items-center py-16">
          <AppText accessibilityRole="header" className="font-sans-bold text-xl text-white">Admins only</AppText>
          <AppText className="mt-2 text-center text-sm text-white/50">
            Your account does not have access to user management.
          </AppText>
          <View className="mt-6">
            <Button variant="secondary" label="Back to dashboard" onPress={() => router.replace(routes.dashboard)} />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <View className="flex-1 bg-charcoal-dark">
      <Screen edges={[]}>
        <View className="pb-28 pt-6">
          <View className="mb-6">
            <AppText accessibilityRole="header" className="font-sans-bold text-2xl text-white">Users</AppText>
            <AppText className="mt-1 text-sm text-white/50">
              {`${users.length} account${users.length === 1 ? "" : "s"}.`}
            </AppText>
          </View>

          {notice ? (
            <View className="mb-4 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2.5">
              <AppText className="text-sm text-white/80">{notice}</AppText>
            </View>
          ) : null}

          {error ? (
            <View className="mb-4 rounded-lg border border-loss/30 bg-loss/10 px-3 py-2.5">
              <AppText className="text-sm text-loss">{error}</AppText>
            </View>
          ) : null}

          {loaded ? (
            <UsersList
              users={users}
              busyId={busyId}
              currentUserId={user?.id}
              onSendReset={handleSendReset}
              onToggleActive={handleToggle}
              onDelete={handleDelete}
            />
          ) : (
            <CardSkeleton />
          )}
        </View>
      </Screen>

      {/* FAB, matching the portfolio screen. Offset by the bottom inset: this
          is a stack screen above the tabs, so there is no tab bar to clear. */}
      <Pressable
        onPress={() => {
          setInviteKey((k) => k + 1);
          setShowInvite(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="Invite user"
        className="absolute right-4 h-14 w-14 items-center justify-center rounded-full bg-accent"
        style={{ bottom: insets.bottom + 16 }}
      >
        <Ionicons name="add" size={28} color={COLORS["charcoal-dark"]} />
      </Pressable>

      {inviteKey > 0 ? (
        <InviteUserSheet
          key={inviteKey}
          visible={showInvite}
          onInvite={handleInvite}
          onClose={() => setShowInvite(false)}
        />
      ) : null}
    </View>
  );
}
