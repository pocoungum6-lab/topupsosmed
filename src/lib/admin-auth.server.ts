import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";

const COOKIE_NAME = "ts_admin";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret() {
  return process.env["ADMIN_PASSWORD"] || null;
}

export function isAdminConfigured() {
  return Boolean(getSecret());
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", `ts-admin-session:${secret}`).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function verifyPassword(password: string) {
  const secret = getSecret();
  if (!secret) return false;
  return safeEqual(password, secret);
}

export function createAdminSession() {
  const secret = getSecret();
  if (!secret) throw new Error("ADMIN_PASSWORD belum diatur");
  const payload = String(Date.now() + SESSION_TTL_MS);
  setCookie(COOKIE_NAME, `${payload}.${sign(payload, secret)}`, {
    httpOnly: true,
    secure: true,
    // "none" lets the session work inside the editor preview frame too.
    sameSite: "none",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export function destroyAdminSession() {
  deleteCookie(COOKIE_NAME, { path: "/", secure: true, sameSite: "none" });
}

export function isAdmin() {
  const secret = getSecret();
  if (!secret) return false;
  const token = getCookie(COOKIE_NAME);
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (!safeEqual(signature, sign(payload, secret))) return false;
  return Number(payload) > Date.now();
}

export function assertAdmin() {
  if (!isAdmin()) throw new Error("Sesi admin berakhir. Silakan login ulang.");
}
