import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { OAuthConfig, OAuthUserConfig } from "next-auth/providers/oauth";

interface EtsyProfile {
  user_id: number,
  primary_email: string,
  first_name: string,
  last_name: string,
  image_url_75x75: string
};

function EtsyProvider<P extends EtsyProfile>(options: OAuthUserConfig<P>): OAuthConfig<P> {
  return {
    id: "etsy",
    name: "Etsy",
    type: "oauth",
    version: "2.0",
    authorization: {
      url: "https://www.etsy.com/oauth/connect",
      params: {
        response_type: "code",
        redirect_uri: "http://localhost:3000/api/auth/callback/etsy",
        scope: "listings_r listings_w transactions_r",
      },
    },
    profile(profile) {
      return {
        id: profile.user_id.toString(),
        name: profile.first_name + " " + profile.last_name,
        email: profile.primary_email,
        image: profile.image_url_75x75,
      }
    },
    token: {
      url: "https://api.etsy.com/v3/public/oauth/token",
    },
    userinfo: {
      url: "https://api.etsy.com/v3/application/users"
    },
    ...options
  };
};

export const authOptions: AuthOptions = {
  providers: [
    EtsyProvider({
      clientId: process.env.ETSY_CLIENT_ID!,
      clientSecret: process.env.ETSY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "listings_r listings_w transactions_r",
        },
      },
    }),
    GoogleProvider({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: "openid email profile https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets",
        },
      }
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account, user, session, trigger }) {
      if (trigger === "update") {
        token.google = session.google;
        token.etsy = session.etsy;
        return token;
      }
      if (account) {
        if (account.provider === "google") {
          token.google = {
            user: user,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            accessTokenExpires: account.expires_at ?
              account.expires_at * 1000 : undefined
          };
        }
        if (account.provider === "etsy") {
          token.etsy = {
            user: user,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            accessTokenExpires: account.expires_in ?
              Date.now() + (account.expires_in as number) * 1000 : undefined
          };
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.google = token.google as typeof session.google;
      session.etsy = token.etsy as typeof session.etsy;
      return session;
    },
  },
};
const handler = NextAuth(authOptions);
console.log(handler);

export default handler;