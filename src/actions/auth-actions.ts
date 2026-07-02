"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireSession } from "@/lib/session";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, createSessionCookieValue } from "@/lib/session";
import type { RestaurantCode } from "@/lib/restaurants";

export async function switchRestaurant(restaurant: RestaurantCode) {
  await requireSession();
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, createSessionCookieValue(restaurant), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  revalidatePath("/");
}
