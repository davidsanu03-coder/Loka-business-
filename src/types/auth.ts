export type AppRole = "user" | "seller" | "admin";

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role: AppRole;
}
