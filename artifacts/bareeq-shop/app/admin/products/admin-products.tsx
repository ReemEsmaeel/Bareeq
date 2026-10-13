"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AdminHeader, AdminLoadState, ConfirmDialog, Notice, RowsSkeleton, adminInput, adminLabel } from "@/components/admin-ui";
import { ProductImage, StateBlock, ghostBtn, primaryBtn } from "@/components/shop-ui";
import { useShop } from "@/components/shop-provider";
import { useScopedResource } from "@/components/use-fresh";
import { ApiError, api } from "@/lib/client";
import { CATEGORIES, CATEGORY_AR, formatPrice, type Category } from "@/lib/format";
import type { ShopProduct } from "@/lib/types";

type Draft = { name: string; nameAr: string; description: string; descriptionAr: string; price: string; image: string; category: Category };
const empty: Draft = { name: "", nameAr: "", description: "", descriptionAr: "", price: "", image: "", category: "Lujain" };

const t = {
  en: { kicker: "Pieces", title: "The collection.", add: "Add piece", search: "Search pieces", edit: "Edit", del: "Delete", newT: "New piece", editT: "Edit piece", name: "Name (English)", nameAr: "Name (Arabic)", desc: "Description (English)", descAr: "Description (Arabic)", price: "Price (SAR)", image: "Image URL or local path", imageHint: "An HTTPS URL, or a path such as /pieces/ring.jpg", category: "Collection", save: "Save piece", saving: "Saving", cancel: "Cancel", created: "Piece added to the collection.", updated: "Piece updated.", deleted: "Piece removed.", delT: "Remove this piece?", delBody: "It will be removed from the storefront and from every customer's bag. Orders that already include it keep their saved record.", delConfirm: "Remove piece", emptyT: "No pieces yet.", emptyX: "Add the first piece to open the collection.", noMatch: "No pieces match this search.", priceErr: "Enter a price greater than zero with at most two decimals." },
  ar: { kicker: "القطع", title: "المجموعة.", add: "إضافة قطعة", search: "ابحثي في القطع", edit: "تعديل", del: "حذف", newT: "قطعة جديدة", editT: "تعديل القطعة", name: "الاسم (إنجليزي)", nameAr: "الاسم (عربي)", desc: "الوصف (إنجليزي)", descAr: "الوصف (عربي)", price: "السعر (ريال)", image: "رابط الصورة أو المسار المحلي", imageHint: "رابط HTTPS أو مسار مثل /pieces/ring.jpg", category: "المجموعة", save: "حفظ القطعة", saving: "جارٍ الحفظ", cancel: "إلغاء", created: "أُضيفت القطعة إلى المجموعة.", updated: "تم تحديث القطعة.", deleted: "أُزيلت القطعة.", delT: "إزالة هذه القطعة؟", delBody: "ستُزال من المتجر ومن حقائب جميع العملاء. تحتفظ الطلبات السابقة التي تتضمنها بسجلّها المحفوظ.", delConfirm: "إزالة القطعة", emptyT: "لا قطع بعد.", emptyX: "أضيفي أول قطعة لافتتاح المجموعة.", noMatch: "لا قطع تطابق هذا البحث.", priceErr: "أدخلي سعراً أكبر من صفر بخانتين عشريتين كحد أقصى." },
};

export function AdminProducts() {
  const { language, user } = useShop();
  const c = t[language];
  const ar = language === "ar";
  const r = useScopedResource<ShopProduct[]>("/admin/products");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ShopProduct | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(empty);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [toDelete, setToDelete] = useState<ShopProduct | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { setEditing(null); setToDelete(null); setNotice(null); }, [user?.id]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return r.data?.filter((p) => !q || p.name.toLowerCase().includes(q) || p.nameAr.includes(query.trim()) || p.category.toLowerCase().includes(q)) ?? null;
  }, [r.data, query]);

  function open(target: ShopProduct | "new") {
    setEditing(target);
    setFormError("");
    setNotice(null);
    setDraft(target === "new" ? empty : { name: target.name, nameAr: target.nameAr, description: target.description, descriptionAr: target.descriptionAr, price: String(target.price), image: target.image, category: target.category });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const price = Number(draft.price);
    if (!Number.isFinite(price) || price <= 0 || !/^\d+(\.\d{1,2})?$/.test(draft.price.trim())) { setFormError(c.priceErr); return; }
    const guard = r.scopeGuard();
    setSaving(true);
    setFormError("");
    const body = { name: draft.name.trim(), nameAr: draft.nameAr.trim(), description: draft.description.trim(), descriptionAr: draft.descriptionAr.trim(), price, image: draft.image.trim(), category: draft.category };
    try {
      const isNew = editing === "new";
      await api<ShopProduct>(isNew ? "/admin/products" : `/admin/products/${(editing as ShopProduct).id}`, { method: isNew ? "POST" : "PUT", body });
      if (!guard()) return;
      setEditing(null);
      setNotice({ tone: "ok", text: isNew ? c.created : c.updated });
      await r.reload();
    } catch (err) {
      if (guard()) setFormError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      if (guard()) setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const guard = r.scopeGuard();
    setDeleting(true);
    try {
      await api<{ success: true }>(`/admin/products/${toDelete.id}`, { method: "DELETE" });
      if (!guard()) return;
      setNotice({ tone: "ok", text: c.deleted });
      if (editing !== "new" && editing?.id === toDelete.id) setEditing(null);
      await r.reload();
    } catch (err) {
      if (guard()) setNotice({ tone: "error", text: err instanceof ApiError ? err.message : "Something went wrong." });
    } finally {
      if (guard()) { setDeleting(false); setToDelete(null); }
    }
  }

  const set = (k: keyof Draft) => (e: { target: { value: string } }) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  return (
    <>
      <AdminHeader kicker={c.kicker} title={c.title}>
        {!editing && r.data && <button className={primaryBtn} onClick={() => open("new")}>{c.add}</button>}
      </AdminHeader>
      <div className="mt-8">
        {notice && <Notice tone={notice.tone} text={notice.text} />}
        {editing && (
          <form onSubmit={save} className="reveal mb-10 border border-[#2a0006]/10 bg-[#f0f5f0] p-5 sm:p-8" aria-labelledby="product-form-title">
            <h2 id="product-form-title" className="font-display text-2xl text-[#2a0006]">{editing === "new" ? c.newT : c.editT}</h2>
            <fieldset disabled={saving} className="mt-6 grid gap-5 sm:grid-cols-2">
              <div><label htmlFor="p-name" className={adminLabel}>{c.name}</label><input id="p-name" required maxLength={150} dir="ltr" value={draft.name} onChange={set("name")} className={adminInput} /></div>
              <div><label htmlFor="p-nameAr" className={adminLabel}>{c.nameAr}</label><input id="p-nameAr" required maxLength={150} dir="rtl" value={draft.nameAr} onChange={set("nameAr")} className={`${adminInput} font-arabic text-[16px]`} /></div>
              <div><label htmlFor="p-desc" className={adminLabel}>{c.desc}</label><textarea id="p-desc" required maxLength={3000} rows={4} dir="ltr" value={draft.description} onChange={set("description")} className={adminInput} /></div>
              <div><label htmlFor="p-descAr" className={adminLabel}>{c.descAr}</label><textarea id="p-descAr" required maxLength={3000} rows={4} dir="rtl" value={draft.descriptionAr} onChange={set("descriptionAr")} className={`${adminInput} font-arabic text-[16px]`} /></div>
              <div><label htmlFor="p-price" className={adminLabel}>{c.price}</label><input id="p-price" required inputMode="decimal" dir="ltr" value={draft.price} onChange={set("price")} className={`${adminInput} tabular-nums`} /></div>
              <div>
                <label htmlFor="p-cat" className={adminLabel}>{c.category}</label>
                <select id="p-cat" value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as Category }))} className={adminInput}>
                  {CATEGORIES.map((cat) => <option key={cat} value={cat}>{ar ? `${CATEGORY_AR[cat]} · ${cat}` : cat}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="p-image" className={adminLabel}>{c.image}</label>
                <input id="p-image" required maxLength={2000} dir="ltr" value={draft.image} onChange={set("image")} aria-describedby="p-image-hint" className={adminInput} />
                <p id="p-image-hint" className="mt-1.5 text-[11px] text-[#796d68]">{c.imageHint}</p>
              </div>
            </fieldset>
            {formError && <p role="alert" className="mt-5 border-s-2 border-[#4a0e17] bg-[#4a0e17]/5 px-4 py-3 text-[13px] text-[#4a0e17]">{formError}</p>}
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" className={ghostBtn} onClick={() => setEditing(null)} disabled={saving}>{c.cancel}</button>
              <button type="submit" className={primaryBtn} disabled={saving}>{saving ? c.saving : c.save}</button>
            </div>
          </form>
        )}
        <AdminLoadState status={r.status} errorStatus={r.errorStatus} error={r.error} hasData={!!r.data} onRetry={() => void r.reload()} next="/admin/products" skeleton={<RowsSkeleton />} />
        {r.data && r.errorStatus !== 403 && (
          r.data.length === 0 ? (
            !editing && <StateBlock title={c.emptyT} text={c.emptyX} action={<button className={primaryBtn} onClick={() => open("new")}>{c.add}</button>} />
          ) : (
            <>
              <label htmlFor="p-search" className="sr-only">{c.search}</label>
              <input id="p-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={c.search} className="mb-5 w-full border-0 border-b border-[#2a0006]/25 bg-transparent py-2 text-[14px] outline-none focus:border-[#456553] sm:w-72" />
              {list && list.length === 0 ? <p className="py-8 text-[13px] text-[#796d68]">{c.noMatch}</p> : (
                <ul className="divide-y divide-[#2a0006]/10 border-y border-[#2a0006]/10">
                  {list?.map((p) => (
                    <li key={p.id} className="flex items-center gap-4 py-4">
                      <ProductImage product={p} className="aspect-square w-14 shrink-0 sm:w-16" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-lg text-[#2a0006]">{p.name} <span className="font-arabic text-[#796d68]">· {p.nameAr}</span></p>
                        <p className="text-[12px] text-[#796d68]">{ar ? CATEGORY_AR[p.category] : p.category} · <span className="tabular-nums">{formatPrice(p.price, language)}</span></p>
                      </div>
                      <div className="flex shrink-0 gap-4">
                        <button className="eyebrow text-[#2a0006] hover:text-[#456553]" onClick={() => open(p)} aria-label={`${c.edit} ${p.name}`}>{c.edit}</button>
                        <button className="eyebrow text-[#4a0e17]/80 hover:text-[#4a0e17]" onClick={() => setToDelete(p)} aria-label={`${c.del} ${p.name}`}>{c.del}</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )
        )}
      </div>
      <ConfirmDialog open={!!toDelete} title={c.delT} body={<><strong className="text-[#2a0006]">{toDelete && (ar ? toDelete.nameAr : toDelete.name)}</strong><br />{c.delBody}</>} confirmLabel={deleting ? c.saving : c.delConfirm} cancelLabel={c.cancel} busy={deleting} onConfirm={() => void confirmDelete()} onCancel={() => !deleting && setToDelete(null)} />
    </>
  );
}
