import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigured } from "@/lib/env";

/** Refreshes the Supabase session cookie and guards private routes. */
export async function middleware(request: NextRequest) {
  // Preview mode: the public site renders from sample data, but anything
  // needing an account is sent home rather than allowed to crash.
  if (!supabaseConfigured) {
    const path = request.nextUrl.pathname;
    const needsAccount =
      path.startsWith("/dashboard") ||
      path.startsWith("/checkout") ||
      path.startsWith("/admin");


    if (needsAccount) {
      const home = request.nextUrl.clone();
      home.pathname = "/";
      home.search = "";
      return NextResponse.redirect(home);
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isStaffArea = path.startsWith("/admin");
  const isStaffLogin = path === "/admin/login";

  const isPrivate =
    path.startsWith("/dashboard") ||
    path.startsWith("/checkout") ||
    (isStaffArea && !isStaffLogin);

  if (isPrivate && !user) {
    const login = request.nextUrl.clone();
    // Staff get their own sign-in screen; students get theirs.
    login.pathname = isStaffArea ? "/admin/login" : "/login";
    login.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: [
    // everything except static assets and images
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
