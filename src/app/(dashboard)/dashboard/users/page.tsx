"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { CardSkeleton } from "@/components/ui/skeleton";
import {
  Users,
  Search,
  Edit2,
  Ban,
  Trash2,
  X,
  AlertTriangle,
  Building2,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";

type RoleFilter = "ALL" | "DEVELOPER" | "ADMIN" | "ORGANIZER" | "USER";

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image: string | null;
  bannedAt: Date | string | null;
  banReason: string | null;
  createdAt: Date | string;
  userProfile: {
    fullName: string;
    nationality: string;
  } | null;
  activeOrganization: {
    id: string;
    companyName: string;
  } | null;
  _count: {
    orders: number;
  };
}

function UsersManagementContent() {
  const { data: session } = trpc.settings.getMyProfile.useQuery();
  const currentUserRole = session?.role || "USER";
  const isDev = currentUserRole === "DEVELOPER";

  // Filter & Search states
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<RoleFilter>("ALL");
  const [page, setPage] = useState(1);

  // Modal states
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [banningUser, setBanningUser] = useState<UserItem | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);

  // Edit form states
  const [editName, setEditName] = useState("");
  const [editFullName, setEditFullName] = useState("");
  const [editNationality, setEditNationality] = useState("Malaysian");
  const [editRole, setEditRole] = useState<"DEVELOPER" | "ADMIN" | "ORGANIZER" | "USER">("USER");

  // Ban form state
  const [banReason, setBanReason] = useState("");

  // Delete form state
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("");

  // Queries & Mutations
  const { data: usersData, isLoading, refetch } = trpc.admin.getUsersList.useQuery({
    search: search.trim() || undefined,
    role: selectedRole,
    page,
    limit: 20,
  });

  const updateUserMutation = trpc.admin.updateUserByAdmin.useMutation({
    onSuccess: () => {
      toast.success("User profile and role updated.");
      setEditingUser(null);
      refetch();
    },
    onError: (err) => toast.error(err.message || "Failed to update user."),
  });

  const toggleBanMutation = trpc.admin.toggleUserBan.useMutation({
    onSuccess: (_, variables) => {
      toast.success(variables.banned ? "User has been banned." : "User has been unbanned.");
      setBanningUser(null);
      setBanReason("");
      refetch();
    },
    onError: (err) => toast.error(err.message || "Failed to change user ban status."),
  });

  const deleteUserMutation = trpc.admin.deleteUserByDev.useMutation({
    onSuccess: () => {
      toast.success("User permanently deleted.");
      setDeletingUser(null);
      setDeleteConfirmationInput("");
      refetch();
    },
    onError: (err) => toast.error(err.message || "Failed to delete user."),
  });

  const handleOpenEdit = (user: UserItem) => {
    setEditingUser(user);
    setEditName(user.name || "");
    setEditFullName(user.userProfile?.fullName || user.name || "");
    setEditNationality(user.userProfile?.nationality || "Malaysian");
    setEditRole(user.role as typeof editRole);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    updateUserMutation.mutate({
      userId: editingUser.id,
      name: editName,
      fullName: editFullName,
      nationality: editNationality,
      role: editRole,
    });
  };

  const handleConfirmBanToggle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!banningUser) return;
    const isBannedCurrently = !!banningUser.bannedAt;
    toggleBanMutation.mutate({
      userId: banningUser.id,
      banned: !isBannedCurrently,
      reason: banReason || undefined,
    });
  };

  const handleConfirmDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingUser) return;
    deleteUserMutation.mutate({
      userId: deletingUser.id,
      confirmationEmail: deleteConfirmationInput.trim(),
    });
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "DEVELOPER":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "ADMIN":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "ORGANIZER":
        return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
      default:
        return "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20";
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-2">
      {/* Page Header */}
      <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 flex items-center gap-2.5">
            <Users className="h-8 w-8 text-primary-500" />
            <span>User Management</span>
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            View, search, edit roles, suspend accounts, and manage platform users.
          </p>
        </div>
        {usersData && (
          <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 px-4 py-2 rounded-xl">
            <span className="text-xs font-semibold text-neutral-500">Total Registered:</span>
            <span className="text-sm font-bold text-neutral-900 dark:text-neutral-50">{usersData.total} Users</span>
          </div>
        )}
      </div>

      {/* Filters & Search Controls */}
      <Card className="rounded-2xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-xs">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          {/* Search Bar */}
          <div className="relative w-full md:w-80 flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-neutral-400 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, email, NRIC..."
              className="pl-9 bg-neutral-50 dark:bg-neutral-800 text-xs rounded-xl"
            />
          </div>

          {/* Role Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            {(["ALL", "DEVELOPER", "ADMIN", "ORGANIZER", "USER"] as RoleFilter[]).map((r) => (
              <button
                key={r}
                onClick={() => {
                  setSelectedRole(r);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedRole === r
                    ? "bg-primary-500 text-white shadow-xs"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Users Table */}
      {isLoading ? (
        <CardSkeleton />
      ) : !usersData || usersData.users.length === 0 ? (
        <Card className="p-12 text-center rounded-2xl border-dashed border-neutral-300 dark:border-neutral-800">
          <Users className="h-10 w-10 text-neutral-400 mx-auto mb-2" />
          <h3 className="font-bold text-neutral-900 dark:text-neutral-100">No users found</h3>
          <p className="text-xs text-neutral-500 mt-1">Try adjusting your search criteria or role filters.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden rounded-2xl border-neutral-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div data-testid="users-mobile-list" className="divide-y divide-neutral-100 md:hidden dark:divide-neutral-800">
            {usersData.users.map((u) => {
              const isTargetDev = u.role === "DEVELOPER";
              const isBanned = !!u.bannedAt;
              const isAdminBlockedFromTarget = !isDev && isTargetDev;
              return (
                <article key={u.id} className="space-y-3 p-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-950/50 dark:text-primary-300">{(u.name || u.email).slice(0, 2).toUpperCase()}</div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-bold text-neutral-900 dark:text-neutral-100">{u.name || "No Display Name"}</h3>
                      <p className="overflow-wrap-anywhere text-xs text-neutral-500">{u.email}</p>
                      <p className="mt-1 text-[11px] text-neutral-400">Joined {new Date(u.createdAt).toLocaleDateString("en-MY", { dateStyle: "medium" })}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${getRoleBadgeStyle(u.role)}`}>{u.role}</span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${isBanned ? "border-red-500/20 bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300" : "border-emerald-500/20 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"}`}>{isBanned ? "Banned" : "Active"}</span>
                    {u.activeOrganization && <span className="inline-flex min-w-0 items-center gap-1 text-[10px] text-neutral-500"><Building2 className="h-3 w-3 shrink-0" /><span className="truncate">{u.activeOrganization.companyName}</span></span>}
                  </div>
                  <div className={`grid gap-2 ${isDev && u.id !== session?.id ? "grid-cols-3" : "grid-cols-2"}`}>
                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(u as UserItem)} className="min-h-11 rounded-lg text-xs" title={isAdminBlockedFromTarget ? "Developer accounts are protected" : "Edit User"}><Edit2 className="mr-1 h-3.5 w-3.5" />Edit</Button>
                    <Button variant="outline" size="sm" disabled={isAdminBlockedFromTarget || u.id === session?.id} onClick={() => { setBanningUser(u as UserItem); setBanReason(u.banReason || ""); }} className="min-h-11 rounded-lg text-xs"><Ban className="mr-1 h-3.5 w-3.5" />{isBanned ? "Unban" : "Ban"}</Button>
                    {isDev && u.id !== session?.id && <Button variant="outline" size="sm" onClick={() => { setDeletingUser(u as UserItem); setDeleteConfirmationInput(""); }} className="min-h-11 rounded-lg border-red-200 text-xs text-red-600 dark:border-red-900"><Trash2 className="mr-1 h-3.5 w-3.5" />Delete</Button>}
                  </div>
                </article>
              );
            })}
          </div>
          <div data-testid="users-desktop-table" role="region" aria-label="Users, scroll horizontally for all columns" tabIndex={0} className="dashboard-scroll-region hidden outline-none focus-visible:ring-2 focus-visible:ring-primary-500 md:block">
            <table className="min-w-[52rem] w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/50 text-neutral-500 font-bold uppercase tracking-wider">
                  <th className="p-4">User</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Joined Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {usersData.users.map((u) => {
                  const isTargetDev = u.role === "DEVELOPER";
                  const isBanned = !!u.bannedAt;
                  const isAdminBlockedFromTarget = !isDev && isTargetDev;

                  return (
                    <tr key={u.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300 flex items-center justify-center font-bold text-sm shrink-0">
                            {(u.name || u.email).slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-neutral-900 dark:text-neutral-100 truncate">
                              {u.name || "No Display Name"}
                            </p>
                            <p className="text-[11px] text-neutral-500 truncate">{u.email}</p>
                            {u.userProfile?.fullName && (
                              <p className="text-[10px] text-neutral-400 truncate">NRIC: {u.userProfile.fullName}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${getRoleBadgeStyle(u.role)}`}>
                          {u.role}
                        </span>
                        {u.activeOrganization && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-neutral-400">
                            <Building2 className="h-3 w-3" />
                            <span className="truncate max-w-[120px]">{u.activeOrganization.companyName}</span>
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        {isBanned ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-500/20 px-2.5 py-0.5 text-[10px] font-bold">
                            <Ban className="h-3 w-3" /> Banned
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-neutral-500 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString("en-MY", { dateStyle: "medium" })}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(u as UserItem)}
                            className="h-8 px-2.5 text-xs font-semibold rounded-lg border-neutral-200 dark:border-neutral-800"
                            title={isAdminBlockedFromTarget ? "Developer accounts are protected" : "Edit User"}
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>

                          {/* Ban / Unban Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isAdminBlockedFromTarget || u.id === session?.id}
                            onClick={() => {
                              setBanningUser(u as UserItem);
                              setBanReason(u.banReason || "");
                            }}
                            className={`h-8 px-2.5 text-xs font-semibold rounded-lg ${
                              isBanned
                                ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-950"
                                : "border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-900 dark:hover:bg-amber-950"
                            }`}
                          >
                            <Ban className="h-3.5 w-3.5 mr-1" />
                            {isBanned ? "Unban" : "Ban"}
                          </Button>

                          {/* Delete Button (DEV ONLY) */}
                          {isDev && u.id !== session?.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDeletingUser(u as UserItem);
                                setDeleteConfirmationInput("");
                              }}
                              className="h-8 px-2.5 text-xs font-semibold rounded-lg border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
                              title="Permanently Delete User (Dev Only)"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {usersData.totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 p-4 dark:border-neutral-800">
              <span className="text-xs text-neutral-500">
                Page {usersData.page} of {usersData.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="text-xs rounded-xl"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= usersData.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="text-xs rounded-xl"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* 1. EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-neutral-950/60 p-3 backdrop-blur-xs sm:p-4">
          <Card role="dialog" aria-modal="true" className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border-neutral-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 dark:border-neutral-800 dark:bg-neutral-900">
            <CardHeader className="border-b border-neutral-100 bg-neutral-50/70 p-5 dark:border-neutral-800 dark:bg-neutral-950/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Edit2 className="h-4 w-4 text-primary-500" />
                  <span>Edit User: {editingUser.email}</span>
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500 mt-0.5">
                  Update account display name, full name, nationality, and user role.
                </CardDescription>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-neutral-400 hover:text-neutral-600">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>

            <CardContent className="min-h-0 overflow-y-auto p-4 sm:p-6">
              {!isDev && editingUser.role === "DEVELOPER" ? (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
                  <div>
                    <strong className="font-bold block mb-0.5">Developer Account Protected</strong>
                    This account has Developer privileges. Admin roles cannot modify Developer accounts or change their permissions.
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveEdit} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                      Display Name
                    </label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="e.g. Alex Tan"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                      Full Name (NRIC / Passport)
                    </label>
                    <Input
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      placeholder="e.g. Tan Ah Kow"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                      Nationality
                    </label>
                    <Input
                      value={editNationality}
                      onChange={(e) => setEditNationality(e.target.value)}
                      placeholder="e.g. Malaysian"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                      Account Role
                    </label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as typeof editRole)}
                      className="w-full h-9 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 text-xs font-medium"
                    >
                      <option value="USER">USER — Regular Participant</option>
                      <option value="ORGANIZER">ORGANIZER — Event Manager</option>
                      <option value="ADMIN">ADMIN — Platform Administrator</option>
                      {isDev && <option value="DEVELOPER">DEVELOPER — Root SuperAdmin</option>}
                    </select>
                    {!isDev && (
                      <span className="text-[10px] text-neutral-400 mt-1 block">
                        Admin role can assign USER, ORGANIZER, or ADMIN. Only Developers can assign DEVELOPER role.
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingUser(null)}
                      className="text-xs rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateUserMutation.isPending}
                      className="bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl"
                    >
                      {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. BAN / UNBAN CONFIRMATION MODAL */}
      {banningUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-neutral-950/60 p-3 backdrop-blur-xs sm:p-4">
          <Card role="dialog" aria-modal="true" className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-xl border-neutral-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 dark:border-neutral-800 dark:bg-neutral-900">
            <CardHeader className="border-b border-neutral-100 bg-neutral-50/70 p-5 dark:border-neutral-800 dark:bg-neutral-950/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Ban className="h-5 w-5 text-amber-500" />
                  <span>{banningUser.bannedAt ? "Unban Account" : "Ban Account"}</span>
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500 mt-0.5">
                  Target User: <strong>{banningUser.email}</strong>
                </CardDescription>
              </div>
              <button onClick={() => setBanningUser(null)} className="text-neutral-400 hover:text-neutral-600">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>

            <CardContent className="min-h-0 overflow-y-auto p-4 sm:p-6">
              <form onSubmit={handleConfirmBanToggle} className="space-y-4">
                {banningUser.bannedAt ? (
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    Are you sure you want to unban this account? The user will regain normal login and registration access.
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                      Banning this user will immediately invalidate active login sessions and block race registration access.
                    </p>
                    <div>
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                        Reason for Suspension
                      </label>
                      <Input
                        value={banReason}
                        onChange={(e) => setBanReason(e.target.value)}
                        placeholder="e.g. Terms violation, Fraudulent activity, Spam"
                        required
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBanningUser(null)}
                    className="text-xs rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={toggleBanMutation.isPending}
                    className={`font-bold text-xs rounded-xl text-white ${
                      banningUser.bannedAt ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"
                    }`}
                  >
                    {toggleBanMutation.isPending
                      ? "Processing..."
                      : banningUser.bannedAt
                      ? "Confirm Unban"
                      : "Confirm Ban User"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. DESTRUCTIVE PERMANENT DELETE MODAL (DEV ONLY + DOUBLE-TYPING GUARD) */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-neutral-950/70 p-3 backdrop-blur-xs sm:p-4">
          <Card role="alertdialog" aria-modal="true" className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-xl border-2 border-red-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 dark:border-red-900 dark:bg-neutral-900">
            <CardHeader className="border-b border-red-100 bg-red-50/70 p-5 dark:border-red-900/50 dark:bg-red-950/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Permanently Delete User (Dev Only)</span>
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500 mt-0.5">
                  Target: <strong className="font-mono text-red-600 dark:text-red-400">{deletingUser.email}</strong>
                </CardDescription>
              </div>
              <button onClick={() => setDeletingUser(null)} className="text-neutral-400 hover:text-neutral-600">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>

            <CardContent className="min-h-0 overflow-y-auto p-4 sm:p-6">
              <form onSubmit={handleConfirmDelete} className="space-y-4">
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-300 text-xs leading-relaxed">
                  <strong className="block font-bold mb-1">⚠️ Warning: Irreversible Action</strong>
                  This will permanently erase user account identity and database records. This action cannot be undone.
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    To confirm deletion, type <strong className="font-mono text-red-600">{deletingUser.email}</strong> or <strong className="font-mono">DELETE</strong>:
                  </label>
                  <Input
                    value={deleteConfirmationInput}
                    onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                    placeholder={deletingUser.email}
                    className="font-mono text-xs border-red-300 dark:border-red-800 focus:border-red-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDeletingUser(null)}
                    className="text-xs rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      deleteUserMutation.isPending ||
                      (deleteConfirmationInput.trim().toLowerCase() !== deletingUser.email.toLowerCase() &&
                        deleteConfirmationInput.trim() !== "DELETE")
                    }
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleteUserMutation.isPending ? "Deleting..." : "Permanently Delete Account"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function UsersManagementPage() {
  return (
    <ErrorBoundary>
      <UsersManagementContent />
    </ErrorBoundary>
  );
}
