"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdminHeader, AdminLoadState, ConfirmDialog, Notice, RowsSkeleton, adminInput } from "@/components/admin-ui";
import { ghostBtn, primaryBtn } from "@/components/shop-ui";
import { useShop } from "@/components/shop-provider";
import { useScopedResource } from "@/components/use-fresh";
import { ApiError, api } from "@/lib/client";
import { uploadPhotoFile } from "@/components/photo-picker";
import type { AdminPhoto } from "@/lib/types";
import { hasPermission } from "@/lib/permissions";

const t = {
  en: {
    kicker: "Image archive", title: "Photo library.", upload: "Upload photo", search: "Search by file name", count: "photographs", emptyTitle: "A quiet shelf, for now.", emptyText: "Upload the first public product photograph to begin the library.", noMatch: "No photographs match that name.",
    public: "Public product photography", warning: "Product photos are publicly viewable on the storefront. Upload product imagery only—never private, customer, or otherwise sensitive files.",
    usage: "Used on", unused: "Not assigned to a piece", products: "View pieces", deleting: "Removal in progress", delete: "Delete image", retry: "Retry removal", deleteTitle: "Permanently remove this image?", deleteCopy: "This cannot be undone. Any products using this image will return to the illustrative default photo. You can also replace an image on its product form.", confirm: "Remove permanently", cancel: "Keep image", busy: "Uploading", verifying: "Verifying photo", success: "Photograph added to the library.", deleted: "Photograph permanently removed.", uploadError: "The image could not be uploaded.", deleteError: "Removal could not be completed. The image remains marked for deletion; retry when ready.", format: "JPEG, PNG or WebP · up to 4 MiB", retryLabel: "Try again",
  },
  ar: {
    kicker: "أرشيف الصور", title: "مكتبة الصور.", upload: "رفع صورة", search: "البحث باسم الملف", count: "صورة", emptyTitle: "رفّ هادئ في الوقت الحالي.", emptyText: "ارفعي أول صورة منتج عامة لبدء المكتبة.", noMatch: "لا توجد صور بهذا الاسم.",
    public: "صور المنتجات العامة", warning: "تظهر صور المنتجات للعامة في المتجر. ارفعي صور المنتجات فقط، ولا ترفعي صوراً خاصة أو بيانات عملاء أو ملفات حساسة.",
    usage: "تُستخدم في", unused: "غير مرتبطة بقطعة", products: "عرض القطع", deleting: "جارٍ الحذف", delete: "حذف الصورة", retry: "إعادة محاولة الحذف", deleteTitle: "إزالة هذه الصورة نهائياً؟", deleteCopy: "لا يمكن التراجع عن ذلك. ستعود المنتجات التي تستخدم هذه الصورة إلى الصورة التوضيحية الافتراضية. ويمكنك أيضاً استبدال الصورة من نموذج المنتج.", confirm: "إزالة نهائياً", cancel: "الإبقاء على الصورة", busy: "جارٍ الرفع", verifying: "جارٍ التحقق من الصورة", success: "أُضيفت الصورة إلى المكتبة.", deleted: "أُزيلت الصورة نهائياً.", uploadError: "تعذّر رفع الصورة.", deleteError: "تعذّر إكمال الحذف. ستبقى الصورة معلّمة للحذف؛ أعيدي المحاولة عند الاستعداد.", format: "JPEG أو PNG أو WebP · حتى ٤ ميبيبايت", retryLabel: "إعادة المحاولة",
  },
};

function sizeLabel(size: number, ar: boolean) {
  return new Intl.NumberFormat(ar ? "ar-SA" : "en", { maximumFractionDigits: 1 }).format(size / (1024 * 1024)) + " MiB";
}

export function AdminPhotos() {
  const { language, user, authLoading } = useShop();
  const c = t[language];
  const ar = language === "ar";
  const canManagePhotos = hasPermission(user, "photos");
  const permissionsKey = user?.permissions.join(",") ?? "";
  const resource = useScopedResource<AdminPhoto[]>("/admin/photos");
  const [query, setQuery] = useState("");
  const [toDelete, setToDelete] = useState<AdminPhoto | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);
  const [busyUpload, setBusyUpload] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const identityRef = useRef({ id: user?.id, role: user?.role, roleId: user?.roleId, permissionsKey, active: user?.active, authLoading });
  identityRef.current = { id: user?.id, role: user?.role, roleId: user?.roleId, permissionsKey, active: user?.active, authLoading };

  useEffect(() => {
    setToDelete(null); setNotice(null); setError(""); setQuery(""); setBusyUpload(false); setProgress(0);
  }, [user?.id, user?.role, user?.roleId, permissionsKey, user?.active, authLoading]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return (resource.data ?? []).filter((photo) => !needle || photo.name.toLocaleLowerCase().includes(needle));
  }, [resource.data, query]);

  async function upload(file?: File) {
    if (!file) return;
    const resourceGuard = resource.scopeGuard();
    const scopeId = user?.id;
    const roleId = user?.roleId;
    const guard = () => resourceGuard() && identityRef.current.id === scopeId && identityRef.current.roleId === roleId && identityRef.current.permissionsKey === permissionsKey && identityRef.current.role === user?.role && hasPermission(user, "photos") && identityRef.current.active && !identityRef.current.authLoading;
    setBusyUpload(true); setProgress(0); setError(""); setNotice(null);
    try {
      await uploadPhotoFile(file, (value) => { if (guard()) setProgress(value); });
      if (!guard()) return;
      await resource.reload();
      if (guard()) setNotice({ tone: "ok", text: c.success });
    } catch (err) {
      if (guard()) setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : c.uploadError);
    } finally {
      if (guard()) setBusyUpload(false);
    }
  }

  async function remove() {
    if (!toDelete) return;
    const photo = toDelete;
    const resourceGuard = resource.scopeGuard();
    const scopeId = user?.id;
    const roleId = user?.roleId;
    const guard = () => resourceGuard() && identityRef.current.id === scopeId && identityRef.current.roleId === roleId && identityRef.current.permissionsKey === permissionsKey && identityRef.current.role === user?.role && identityRef.current.active && !identityRef.current.authLoading;
    if (!canManagePhotos) return;
    setBusyDelete(true); setError("");
    try {
      await api<{ success: true }>(`/admin/photos/${photo.id}`, { method: "DELETE" });
      if (!guard()) return;
      setToDelete(null);
      setNotice({ tone: "ok", text: c.deleted });
      await resource.reload();
    } catch (err) {
      if (!guard()) return;
      resource.setData((current) => current?.map((item) => item.id === photo.id ? { ...item, status: "deleting" } : item) ?? null);
      setToDelete(null);
      setNotice({ tone: "error", text: err instanceof ApiError ? err.message : c.deleteError });
    } finally {
      if (guard()) setBusyDelete(false);
    }
  }

  return (
    <>
      <AdminHeader kicker={c.kicker} title={c.title}>
        <button className={primaryBtn} onClick={() => fileRef.current?.click()} disabled={busyUpload || !canManagePhotos || resource.status !== "ready"}>{busyUpload ? progress >= 100 ? c.verifying : `${c.busy} · ${progress}%` : c.upload}</button>
      </AdminHeader>
      <div className="mt-8">
        {notice && <Notice tone={notice.tone} text={notice.text} />}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={c.upload} onChange={(e) => { void upload(e.target.files?.[0]); e.currentTarget.value = ""; }} />
        <section className="mb-8 grid gap-4 border-y border-[#2a0006]/10 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <div><p className="eyebrow text-[#456553]">{c.public}</p><p className="mt-2 max-w-3xl text-[12px] leading-[1.8] text-[#796d68]">{c.warning}</p></div>
          <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#796d68]">{c.format}</p>
        </section>
        {error && <p role="alert" className="mb-5 border-s-2 border-[#4a0e17] bg-[#4a0e17]/5 px-4 py-3 text-[13px] text-[#4a0e17]">{error}</p>}
        {busyUpload && <div className="mb-5 h-1.5 overflow-hidden bg-[#2a0006]/10" role="progressbar" aria-label={progress >= 100 ? c.verifying : undefined} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div className="h-full w-full origin-left bg-[#456553] transition-transform" style={{ transform: `scaleX(${progress / 100})`, transformOrigin: ar ? "right" : "left" }} /></div>}
        <AdminLoadState status={resource.status} errorStatus={resource.errorStatus} error={resource.error} hasData={!!resource.data} onRetry={() => void resource.reload()} next="/admin/photos" skeleton={<RowsSkeleton rows={3} />} />
        {resource.data && resource.errorStatus !== 403 && (
          <>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <label className="block w-full sm:w-80">
                <span className="eyebrow mb-2 block text-[#456553]">{c.search}</span>
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={c.search} className={adminInput} />
              </label>
              <p className="text-[11px] text-[#796d68]">{resource.data.length} {c.count}</p>
            </div>
            {resource.data.length === 0 ? <div className="border border-dashed border-[#2a0006]/20 bg-[#f0f5f0] px-6 py-12 text-center"><p className="font-display text-2xl text-[#2a0006]">{c.emptyTitle}</p><p className="mx-auto mt-2 max-w-md text-[12px] leading-6 text-[#796d68]">{c.emptyText}</p><button className={`${primaryBtn} mt-5`} onClick={() => fileRef.current?.click()}>{c.upload}</button></div>
              : visible.length === 0 ? <p className="py-10 text-[13px] text-[#796d68]">{c.noMatch}</p>
              : <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {visible.map((photo) => (
                  <li key={photo.id} className={`overflow-hidden border bg-[#f0f5f0] ${photo.status === "deleting" ? "border-[#4a0e17]/30" : "border-[#2a0006]/10"}`}>
                    <div className="relative aspect-square bg-[#e8eee7]">
                      {photo.status === "deleting"
                        ? <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#e6e1dc] p-4 text-center text-[#796d68]"><span className="block h-9 w-9 border border-[#796d68]/40" aria-hidden="true" /><span className="text-[10px] font-semibold uppercase tracking-[.12em]">{c.deleting}</span></div>
                        : <img src={photo.url} alt={photo.name} loading="lazy" className="h-full w-full object-cover" />}
                    </div>
                    <div className="p-3 sm:p-4">
                      <p className="truncate text-[12px] font-semibold text-[#2a0006]" title={photo.name}>{photo.name}</p>
                      <p className="mt-1 text-[10px] text-[#796d68]">{sizeLabel(photo.size, ar)} · {new Intl.DateTimeFormat(ar ? "ar-SA" : "en", { dateStyle: "medium" }).format(new Date(photo.createdAt))}</p>
                      {photo.usedBy.length ? (
                        <div className="mt-3 border-t border-[#2a0006]/10 pt-3">
                          <p className="text-[10px] text-[#796d68]">{c.usage} {photo.usedBy.map((product) => ar ? product.nameAr : product.name).join(", ")}</p>
                          <Link href="/admin/products" className="mt-1 inline-block text-[10px] font-semibold text-[#456553] underline underline-offset-2">{c.products}</Link>
                        </div>
                      ) : <p className="mt-3 border-t border-[#2a0006]/10 pt-3 text-[10px] text-[#796d68]">{c.unused}</p>}
                      <button type="button" className="mt-3 w-full border-t border-[#2a0006]/10 pt-3 text-start text-[10px] font-semibold text-[#4a0e17] underline underline-offset-2 disabled:opacity-50" onClick={() => setToDelete(photo)} disabled={busyDelete || !canManagePhotos}>
                        {photo.status === "deleting" ? c.retry : c.delete}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>}
          </>
        )}
      </div>
      <ConfirmDialog open={!!toDelete} title={c.deleteTitle} body={<><strong className="text-[#2a0006]">{toDelete?.name}</strong><br />{c.deleteCopy}</>} confirmLabel={busyDelete ? c.deleting : toDelete?.status === "deleting" ? c.retry : c.confirm} cancelLabel={c.cancel} busy={busyDelete} onConfirm={() => void remove()} onCancel={() => !busyDelete && setToDelete(null)} />
    </>
  );
}
