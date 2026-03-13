import { cookies } from "next/headers";

const TOAST_COOKIE = "toast";
const MAX_AGE = 10;

/**
 * Set a toast message to show on the next client render.
 * Call this from server actions after a successful save, then revalidate or redirect.
 */
export async function setToastCookie(message: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(TOAST_COOKIE, message, { path: "/", maxAge: MAX_AGE });
}

export { TOAST_COOKIE };
