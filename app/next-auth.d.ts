// types/next-auth.d.ts or global.d.ts
import { User } from "next-auth"

declare module "next-auth" {
  interface Session {
    google?: {
      user: User,
      accessToken: string,
      refreshToken: string,
      accessTokenExpires: number,
    },
    etsy?: {
      user: User,
      accessToken: string,
      refreshToken: string,
      accessTokenExpires: number,
    }
  }
}
