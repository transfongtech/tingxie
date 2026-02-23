"use server";

import { cookies } from "next/headers";
import { HANDWRITING_COOKIE } from "@/lib/handwriting-mode";

export async function setHandwritingMode(enabled: boolean) {
    const cookieStore = await cookies();
    if (enabled) {
        cookieStore.set(HANDWRITING_COOKIE, "true", {
            path: "/",
            maxAge: 60 * 60 * 24 * 365, // 1 year
            sameSite: "strict",
        });
    } else {
        cookieStore.delete(HANDWRITING_COOKIE);
    }
}
