export interface JwtPayload {
  sub: string; // user/admin id
  email: string;
  role: "user" | "admin";
  iat?: number;
  exp?: number;
}
