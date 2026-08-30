import { NextResponse } from "next/server";
import {
  createFamilySessionToken,
  FAMILY_SESSION_COOKIE,
  FAMILY_SESSION_MAX_AGE_SECONDS,
} from "@/lib/family-session";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const expectedPassword = process.env.SITE_PASSWORD || "George2026";

    if (password === expectedPassword) {
      const response = NextResponse.json({ success: true });
      response.cookies.set({
        name: FAMILY_SESSION_COOKIE,
        value: await createFamilySessionToken(),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: FAMILY_SESSION_MAX_AGE_SECONDS,
      });
      return response;
    }

    return NextResponse.json(
      { success: false, message: "密码错误，请输入正确的密码" },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "请求处理失败" },
      { status: 400 }
    );
  }
}
