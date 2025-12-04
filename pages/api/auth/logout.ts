import { NextApiRequest, NextApiResponse } from "next";
import Cookies from "cookies";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

  return res.status(204).end();
}
