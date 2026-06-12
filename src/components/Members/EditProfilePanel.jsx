"use client";

import { useState } from "react";
import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";
import Panel from "@/components/Panel";
import { updateCurrentUser } from "@/store/features/financeSlice";

export default function EditProfilePanel() {
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.finance.currentUser);

  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name ?? "",
    jobTitle: currentUser?.jobTitle ?? "",
    avatarUrl: currentUser?.avatarUrl ?? "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [profileStatus, setProfileStatus] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");
  const [deleteStatus, setDeleteStatus] = useState("");

  const handleProfileSubmit = (event) => {
    event.preventDefault();

    if (!profileForm.name.trim() || !profileForm.jobTitle.trim()) {
      setProfileStatus("Name and job description are required.");
      return;
    }

    dispatch(
      updateCurrentUser({
        name: profileForm.name.trim(),
        jobTitle: profileForm.jobTitle.trim(),
        avatarUrl: profileForm.avatarUrl.trim() || null,
      })
    );

    setProfileStatus("Profile updated successfully.");
  };

  const handlePasswordSubmit = (event) => {
    event.preventDefault();

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      setPasswordStatus("Fill in all password fields.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordStatus("New password and confirmation do not match.");
      return;
    }

    setPasswordStatus("Password changed. Connect this to your auth backend.");
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };

  const handleDeleteAccount = () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this account? This action cannot be undone."
    );

    if (!confirmDelete) {
      return;
    }

    setDeleteStatus("Delete account requested. Connect this to your backend delete flow.");
  };

  return (
    <Panel
      title="Edit profile"
      subtitle="Update your profile picture, personal details, and account security settings."
      className="flex h-full min-h-0 flex-col"
      contentClassName="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1"
    >
      <form className="space-y-4" onSubmit={handleProfileSubmit}>
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-3">
          {profileForm.avatarUrl ? (
            <Image
              src={profileForm.avatarUrl}
              alt={profileForm.name || "Profile"}
              width={52}
              height={52}
              className="h-13 w-13 rounded-full object-cover ring-2 ring-white/10"
            />
          ) : (
            <div className="flex h-13 w-13 items-center justify-center rounded-full bg-linear-to-br from-cyan-500 to-violet-600 text-sm font-semibold text-white">
              {(profileForm.name || "U")
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <label className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              Edit profile picture (image URL)
            </label>
            <input
              type="url"
              value={profileForm.avatarUrl}
              onChange={(event) =>
                setProfileForm((prev) => ({ ...prev, avatarUrl: event.target.value }))
              }
              placeholder="https://example.com/avatar.jpg"
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400/40"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
            Edit name
          </label>
          <input
            type="text"
            value={profileForm.name}
            onChange={(event) =>
              setProfileForm((prev) => ({ ...prev, name: event.target.value }))
            }
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400/40"
          />
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
            Edit job description
          </label>
          <input
            type="text"
            value={profileForm.jobTitle}
            onChange={(event) =>
              setProfileForm((prev) => ({ ...prev, jobTitle: event.target.value }))
            }
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400/40"
          />
        </div>

        <button
          type="submit"
          className="inline-flex rounded-full border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20"
        >
          Save profile
        </button>
        {profileStatus ? <p className="text-xs text-slate-300">{profileStatus}</p> : null}
      </form>

      <form className="space-y-3 border-t border-white/10 pt-4" onSubmit={handlePasswordSubmit}>
        <p className="text-sm font-medium text-white">Change password</p>
        <input
          type="password"
          value={passwordForm.currentPassword}
          onChange={(event) =>
            setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
          }
          placeholder="Current password"
          className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400/40"
        />
        <input
          type="password"
          value={passwordForm.newPassword}
          onChange={(event) =>
            setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
          }
          placeholder="New password"
          className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400/40"
        />
        <input
          type="password"
          value={passwordForm.confirmPassword}
          onChange={(event) =>
            setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
          }
          placeholder="Confirm new password"
          className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400/40"
        />
        <button
          type="submit"
          className="inline-flex rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-500/20"
        >
          Update password
        </button>
        {passwordStatus ? <p className="text-xs text-slate-300">{passwordStatus}</p> : null}
      </form>

      <div className="border-t border-white/10 pt-4">
        <p className="text-sm font-medium text-rose-200">Delete account</p>
        <p className="mt-1 text-xs text-slate-400">
          This is a destructive action and should permanently remove profile access.
        </p>
        <button
          type="button"
          onClick={handleDeleteAccount}
          className="mt-3 inline-flex rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20"
        >
          Delete account
        </button>
        {deleteStatus ? <p className="mt-2 text-xs text-slate-300">{deleteStatus}</p> : null}
      </div>
    </Panel>
  );
}
