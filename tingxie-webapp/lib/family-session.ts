import { NextResponse } from "next/server";

export const FAMILY_SESSION_COOKIE = "tingxie_auth";
export const FAMILY_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const TOKEN_VERSION = "v1";
const encoder = new TextEncoder();

function sessionSecret(): string {
  return (
    process.env.FAMILY_SESSION_SECRET ||
    process.env.SITE_PASSWORD ||
    "George2026"
  );
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function signature(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(new Uint8Array(signed));
}

function equalConstantTime(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function createFamilySessionToken(
  secret = sessionSecret(),
  now = Date.now(),
): Promise<string> {
  const expiresAt = Math.floor(now / 1000) + FAMILY_SESSION_MAX_AGE_SECONDS;
  const payload = `${TOKEN_VERSION}.${expiresAt}`;
  return `${payload}.${await signature(payload, secret)}`;
}

export async function verifyFamilySessionToken(
  token: string | undefined,
  secret = sessionSecret(),
  now = Date.now(),
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION || !/^\d{10}$/.test(parts[1])) {
    return false;
  }

  const expiresAt = Number(parts[1]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(now / 1000)) {
    return false;
  }

  const payload = `${parts[0]}.${parts[1]}`;
  return equalConstantTime(parts[2], await signature(payload, secret));
}

function cookieValue(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return undefined;
  for (const cookie of cookieHeader.split(";")) {
    const separator = cookie.indexOf("=");
    if (separator < 0) continue;
    if (cookie.slice(0, separator).trim() === name) {
      try {
        return decodeURIComponent(cookie.slice(separator + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

export async function requireFamilySession(request: Request): Promise<NextResponse | null> {
  const token = cookieValue(request, FAMILY_SESSION_COOKIE);
  if (await verifyFamilySessionToken(token)) return null;
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 },
  );
}
