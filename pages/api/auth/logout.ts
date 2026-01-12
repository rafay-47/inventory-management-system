import { NextApiRequest, NextApiResponse } from "next";
import Cookies from "cookies";
import { getSessionServer } from "@/utils/auth";
import { auditLogout } from "@/utils/auditLogger";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Get session to log user info before logout
  const session = await getSessionServer(req, res);
  
  // Determine if the connection is secure (production)
  const isProduction = process.env.NODE_ENV === "production";
  const isSecure =
    req.headers["x-forwarded-proto"] === "https" || isProduction;

  const cookies = new Cookies(req, res, { secure: isSecure });
  
  // Clear the session cookie with the same options it was set with
  cookies.set("session_id", "", {
    httpOnly: true,
    secure: isSecure,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 0, // Expire immediately
    path: "/",
  });

  // Audit logout if session exists
  if (session) {
    await auditLogout(
      { userId: session.id, userName: session.name, userEmail: session.email },
      req
    );
  }

  return res.status(204).end();
}
