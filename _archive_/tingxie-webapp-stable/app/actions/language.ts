"use server";

import { cookies } from "next/headers";
import { LANGUAGE_COOKIE, Language } from "@/lib/language";

export async function setLanguage(lang: Language) {
    const cookieStore = await cookies();
    cookieStore.set(LANGUAGE_COOKIE, lang, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365, // 1 year
        sameSite: "strict",
    });
}
