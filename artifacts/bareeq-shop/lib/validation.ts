import { z } from "zod";

export const nameInput = z.string().trim().min(1, "Name is required.").max(80);
export const emailInput = z.string().trim().email("Enter a valid email address.").max(254).transform((value) => value.toLowerCase());
export const passwordInput = z.string().min(8, "Password must contain at least 8 characters.").max(72).refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Password must be at most 72 bytes.");

export const signupInput = z.object({
  name: nameInput,
  email: emailInput,
  password: passwordInput,
}).strict();

export const loginInput = z.object({
  email: emailInput,
  password: passwordInput,
}).strict();

export const profileInput = z.object({
  name: nameInput,
  currentPassword: passwordInput.optional(),
  newPassword: passwordInput.optional(),
}).strict();

export const productInput = z.object({
  name: z.string().trim().min(1).max(150),
  nameAr: z.string().trim().min(1).max(150),
  description: z.string().trim().min(1).max(3000),
  descriptionAr: z.string().trim().min(1).max(3000),
  price: z.number().finite().min(0.01).max(1000000).refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.00001, "Use at most two decimal places for the price."),
  image: z.string().max(2000).refine((value) => {
    if (/^\/[a-zA-Z0-9/_\-.]+$/.test(value) && !value.includes("..")) return true;
    try { return new URL(value).protocol === "https:"; } catch { return false; }
  }, "Use an HTTPS image URL or a local image path."),
  category: z.enum(["Lujain", "Rawnaq", "Wahaj"]),
}).strict();
