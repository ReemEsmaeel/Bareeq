"use client";

import { useEffect, useRef, useState } from "react";
import { adminInput, adminLabel } from "./admin-ui";
import { ApiError, api } from "@/lib/client";
import { useShop } from "./shop-provider";

const MAX_BYTES = 8 * 1024 * 1024;
const text = {
  en: {
    url: "Image URL or local path", hint: "Keep an HTTPS URL or local path, or upload a photo below.",
    upload: "Upload product photo", formats: "JPEG, PNG or WebP · up to 8 MB · still photos up to 24 megapixels",
    preview: "Product photo preview", preparing: "Preparing upload…", uploading: "Uploading photo",
    checking: "Checking and saving photo…", done: "Photo uploaded. Save the piece to use it in the shop.",
    invalid: "Choose a JPEG, PNG or WebP photo of 8 MB or smaller.",
    network: "The photo upload failed. Check your connection and select the photo again.",
    auth: "Your admin access has changed or expired. Sign in again before uploading.",
    validation: "This photo could not be accepted. Use an undamaged, still JPEG, PNG or WebP photo of up to 8 MB and 24 megapixels.",
    storage: "Photo storage is temporarily unavailable. Try again shortly.",
    limit: "Too many uploads. Wait a few minutes and try again.",
    previewError: "The image preview could not load. Check the image URL or upload a photo.",
  },
  ar: {
    url: "رابط الصورة أو المسار المحلي", hint: "استخدمي رابط HTTPS أو مساراً محلياً، أو ارفعي صورة أدناه.",
    upload: "رفع صورة القطعة", formats: "JPEG أو PNG أو WebP · حتى 8 ميغابايت · صورة ثابتة حتى 24 ميغابكسل",
    preview: "معاينة صورة القطعة", preparing: "جارٍ تجهيز الرفع…", uploading: "جارٍ رفع الصورة",
    checking: "جارٍ التحقق من الصورة وحفظها…", done: "تم رفع الصورة. احفظي القطعة لعرضها في المتجر.",
    invalid: "اختاري صورة JPEG أو PNG أو WebP بحجم 8 ميغابايت أو أقل.",
    network: "تعذّر رفع الصورة. تحققي من الاتصال واختاري الصورة مرة أخرى.",
    auth: "انتهت الجلسة أو تغيّرت صلاحيات الإدارة. سجّلي الدخول مجدداً قبل الرفع.",
    validation: "تعذّر قبول الصورة. استخدمي صورة ثابتة وسليمة بصيغة JPEG أو PNG أو WebP حتى 8 ميغابايت و24 ميغابكسل.",
    storage: "تخزين الصور غير متاح مؤقتاً. حاولي مجدداً بعد قليل.",
    limit: "عدد محاولات الرفع كبير. انتظري بضع دقائق وحاولي مجدداً.",
    previewError: "تعذّر تحميل المعاينة. تحققي من الرابط أو ارفعي صورة.",
  },
};

export function AdminPhotoInput({ image, onChange, onBusy, canUpload }: {
  image: string; onChange: (image: string) => void; onBusy: (busy: boolean) => void; canUpload: boolean;
}) {
  const { language } = useShop();
  const c = text[language];
  const [phase, setPhase] = useState<"idle" | "preparing" | "uploading" | "checking" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<{ kind: "invalid" | "network" | "api"; status?: number; message?: string } | null>(null);
  const [preview, setPreview] = useState("");
  const [broken, setBroken] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const xhr = useRef<XMLHttpRequest | null>(null);
  const objectURL = useRef("");
  const busy = phase === "preparing" || phase === "uploading" || phase === "checking";
  const errorMessage = !error ? "" : error.kind === "invalid" ? c.invalid : error.kind === "network" ? c.network
    : language === "en" ? error.message || c.network
      : error.status === 401 || error.status === 403 ? c.auth
        : error.status === 400 ? c.validation : error.status === 429 ? c.limit : c.storage;

  useEffect(() => () => {
    controller.current?.abort();
    xhr.current?.abort();
    if (objectURL.current) URL.revokeObjectURL(objectURL.current);
    onBusy(false);
  }, [onBusy]);
  useEffect(() => { setBroken(false); }, [image, preview]);

  async function upload(file: File) {
    if (!canUpload) return;
    setError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || !file.size || file.size > MAX_BYTES) {
      setError({ kind: "invalid" });
      return;
    }
    const abort = new AbortController();
    controller.current = abort;
    if (objectURL.current) URL.revokeObjectURL(objectURL.current);
    objectURL.current = URL.createObjectURL(file);
    setPreview(objectURL.current);
    setPhase("preparing");
    setProgress(0);
    onBusy(true);
    try {
      const request = await api<{ uploadURL: string; ticket: string }>("/admin/photos/request", {
        method: "POST", body: { size: file.size, contentType: file.type }, signal: abort.signal,
      });
      if (abort.signal.aborted) return;
      setPhase("uploading");
      await new Promise<void>((resolve, reject) => {
        const upload = new XMLHttpRequest();
        xhr.current = upload;
        upload.open("PUT", request.uploadURL);
        upload.timeout = 120_000;
        upload.setRequestHeader("Content-Type", file.type);
        upload.upload.onprogress = (event) => {
          if (event.lengthComputable) setProgress(Math.round(event.loaded / event.total * 100));
        };
        upload.onload = () => upload.status >= 200 && upload.status < 300 ? resolve() : reject(new Error(c.network));
        upload.onerror = upload.ontimeout = () => reject(new Error(c.network));
        upload.onabort = () => reject(new DOMException("Aborted", "AbortError"));
        upload.send(file);
      });
      if (abort.signal.aborted) return;
      setPhase("checking");
      const result = await api<{ image: string }>("/admin/photos/finalize", {
        method: "POST", body: { ticket: request.ticket }, signal: abort.signal,
      });
      if (abort.signal.aborted) return;
      onChange(result.image);
      setPhase("done");
      setPreview("");
    } catch (err) {
      if (abort.signal.aborted) return;
      setError(err instanceof ApiError ? { kind: "api", status: err.status, message: err.message } : { kind: "network" });
      setPhase("idle");
      setPreview("");
    } finally {
      if (objectURL.current) { URL.revokeObjectURL(objectURL.current); objectURL.current = ""; }
      if (!abort.signal.aborted) onBusy(false);
    }
  }

  return (
    <div className="sm:col-span-2">
      <label htmlFor="p-image" className={adminLabel}>{c.url}</label>
      <input id="p-image" required maxLength={2000} dir="ltr" value={image} disabled={busy}
        onChange={(e) => { onChange(e.target.value); setPhase("idle"); setError(null); }}
        aria-describedby="p-image-hint" className={adminInput} />
      <p id="p-image-hint" className="mt-1.5 text-[11px] text-[#796d68]">{c.hint}</p>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row">
        {(preview || image) && (
          <div className="h-28 w-28 shrink-0 overflow-hidden border border-[#2a0006]/10 bg-white">
            {!broken && <img src={preview || image} alt={c.preview} onError={() => setBroken(true)} className="h-full w-full object-cover" />}
          </div>
        )}
        {canUpload && <div className="min-w-0 flex-1">
          <label htmlFor="p-photo" className={adminLabel}>{c.upload}</label>
          <input id="p-photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy}
            aria-describedby="p-photo-hint" className={`${adminInput} file:me-3 file:border-0 file:bg-[#456553] file:px-3 file:py-2 file:text-white`}
            onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void upload(file); }} />
          <p id="p-photo-hint" className="mt-1.5 text-[11px] text-[#796d68]">{c.formats}</p>
          <div aria-live="polite" role="status" className="mt-2 text-[12px] text-[#456553]">
            {phase === "preparing" ? c.preparing : phase === "uploading" ? `${c.uploading} · ${progress}%` : phase === "checking" ? c.checking : phase === "done" ? c.done : ""}
          </div>
          {busy && <progress aria-label={c.uploading} max={100} value={phase === "preparing" ? 0 : phase === "uploading" ? progress : 100} className="mt-2 h-2 w-full accent-[#456553]" />}
        </div>}
      </div>
      {(error || broken) && <p role="alert" className="mt-3 text-[13px] text-[#4a0e17]">{errorMessage || c.previewError}</p>}
    </div>
  );
}
