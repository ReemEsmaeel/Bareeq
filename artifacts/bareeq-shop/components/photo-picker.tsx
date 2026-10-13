"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, api } from "@/lib/client";
import type { AdminPhoto } from "@/lib/types";
import { useShop } from "@/components/shop-provider";
import { useScopedResource } from "@/components/use-fresh";
import { ghostBtn } from "@/components/shop-ui";
import { hasPermission } from "@/lib/permissions";

type UploadUrl = { id: string; uploadURL: string };
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export async function uploadPhotoFile(file: File, onProgress?: (progress: number) => void): Promise<AdminPhoto> {
  if (!ACCEPTED.includes(file.type)) throw new Error("Choose a JPEG, PNG or WebP image.");
  if (file.size > MAX_SIZE) throw new Error("Images must be 5 MiB or smaller.");
  if (file.size <= 0) throw new Error("This image is empty.");
  const signed = await api<UploadUrl>("/admin/photos/upload-url", {
    method: "POST",
    body: { name: file.name, size: file.size, contentType: file.type },
  });
  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", signed.uploadURL);
    request.timeout = 120_000;
    request.setRequestHeader("Content-Type", file.type);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error("The image could not be uploaded. Try again."));
    request.onerror = () => reject(new Error("The image could not be uploaded. Check your connection and try again."));
    request.onabort = () => reject(new Error("The upload was cancelled."));
    request.ontimeout = () => reject(new Error("The image upload timed out. Please try again."));
    request.send(file);
  });
  onProgress?.(100);
  return api<AdminPhoto>(`/admin/photos/${signed.id}/complete`, { method: "POST", body: {} });
}

const words = {
  en: { choose: "Choose from photo library", upload: "Upload a photo", hint: "Public product photos only. Do not upload sensitive files.", empty: "No ready photos yet.", searching: "Loading photo library…", retry: "Try again", use: "Use photo", busy: "Uploading", verifying: "Verifying photo", error: "Could not load photos." },
  ar: { choose: "اختيار من مكتبة الصور", upload: "رفع صورة", hint: "صور المنتجات عامة. لا ترفعي ملفات حساسة.", empty: "لا توجد صور جاهزة بعد.", searching: "جارٍ تحميل مكتبة الصور…", retry: "إعادة المحاولة", use: "استخدام الصورة", busy: "جارٍ الرفع", verifying: "جارٍ التحقق من الصورة", error: "تعذّر تحميل الصور." },
};

export function PhotoPicker({ value, onSelect, onBusyChange }: { value: string; onSelect: (url: string) => void; onBusyChange: (busy: boolean) => void }) {
  const { language, user, authLoading } = useShop();
  const t = words[language];
  const ar = language === "ar";
  const canUsePhotos = hasPermission(user, "photos");
  const permissionsKey = user?.permissions.join(",") ?? "";
  const photos = useScopedResource<AdminPhoto[]>("/admin/photos");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const onBusyChangeRef = useRef(onBusyChange);
  const identityRef = useRef({ id: user?.id, role: user?.role, roleId: user?.roleId, permissionsKey, active: user?.active, authLoading });
  onBusyChangeRef.current = onBusyChange;
  identityRef.current = { id: user?.id, role: user?.role, roleId: user?.roleId, permissionsKey, active: user?.active, authLoading };
  useEffect(() => {
    setOpen(false);
    setBusy(false);
    setProgress(0);
    setError("");
    onBusyChangeRef.current(false);
  }, [user?.id, user?.role, user?.roleId, permissionsKey, user?.active, authLoading]);

  async function upload(file?: File) {
    if (!file) return;
    const resourceGuard = photos.scopeGuard();
    const scopeId = user?.id;
    const roleId = user?.roleId;
    const guard = () => resourceGuard() && identityRef.current.id === scopeId && identityRef.current.roleId === roleId && identityRef.current.permissionsKey === permissionsKey && hasPermission(user, "photos") && identityRef.current.active && !identityRef.current.authLoading;
    setBusy(true); setProgress(0); setError("");
    onBusyChangeRef.current(true);
    try {
      const photo = await uploadPhotoFile(file, (value) => { if (guard()) setProgress(value); });
      if (!guard()) return;
      await photos.reload();
      if (!guard()) return;
      onSelect(photo.url);
      setOpen(false);
    } catch (err) {
      if (guard()) setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Upload failed.");
    } finally {
      if (guard()) {
        setBusy(false);
        onBusyChangeRef.current(false);
      }
    }
  }
  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={ghostBtn} onClick={() => setOpen((v) => !v)} aria-expanded={open} disabled={busy || !canUsePhotos}>{t.choose}</button>
        <button type="button" className={ghostBtn} onClick={() => fileRef.current?.click()} disabled={busy || !canUsePhotos}>{t.upload}</button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={t.upload} onChange={(e) => { void upload(e.target.files?.[0]); e.currentTarget.value = ""; }} />
        {busy && <span role="status" className="text-[12px] text-[#456553]">{progress >= 100 ? t.verifying : `${t.busy} · ${progress}%`}</span>}
      </div>
      <p className="mt-2 text-[11px] leading-5 text-[#796d68]">{t.hint}</p>
      {error && <p role="alert" className="mt-3 text-[12px] text-[#4a0e17]">{error}</p>}
      {busy && <div className="mt-3 h-1.5 overflow-hidden bg-[#2a0006]/10" aria-label={progress >= 100 ? t.verifying : `${progress}%`}><div className="h-full w-full origin-left bg-[#456553] transition-transform" style={{ transform: `scaleX(${progress / 100})`, transformOrigin: ar ? "right" : "left" }} /></div>}
      {open && (
        <div className="mt-4 border border-[#2a0006]/10 bg-[#f6fbf5] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow text-[#456553]">{t.choose}</p>
            <button type="button" onClick={() => void photos.reload()} className="text-[11px] text-[#456553] underline" disabled={busy}>{t.retry}</button>
          </div>
          {photos.status === "loading" && <p className="py-6 text-[12px] text-[#796d68]">{t.searching}</p>}
          {photos.error && <p role="alert" className="py-4 text-[12px] text-[#4a0e17]">{photos.error || t.error}</p>}
          {photos.data && (
            photos.data.filter((photo) => photo.status === "ready").length === 0
              ? <p className="py-6 text-[12px] text-[#796d68]">{t.empty}</p>
              : <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {photos.data.filter((photo) => photo.status === "ready").map((photo) => (
                  <li key={photo.id}>
                    <button type="button" onClick={() => { onSelect(photo.url); setOpen(false); }} aria-pressed={value === photo.url} disabled={!canUsePhotos} className={`group w-full border text-start transition-colors disabled:opacity-50 ${value === photo.url ? "border-[#456553] bg-[#f0f5f0]" : "border-[#2a0006]/10 hover:border-[#456553]"}`}>
                      <img src={photo.url} alt={photo.name} className="aspect-square w-full object-cover" />
                      <span className="block truncate px-2 py-2 text-[11px] text-[#2a0006]">{photo.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
          )}
        </div>
      )}
    </div>
  );
}
