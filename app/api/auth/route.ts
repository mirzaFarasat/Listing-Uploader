import NextAuth from "next-auth";
import { OAuthConfig, OAuthUserConfig } from "next-auth/providers/oauth";

function EtsyProvider(options: OAuthUserConfig<any>): OAuthConfig<any> {
  return {
    id: "etsy",
    name: "Etsy",
    type: "oauth",
    version: "2.0",
    authorization: {
      url: "https://www.etsy.com/oauth/connect",
      params: {
        response_type: "code",
        scope: "listings_r listings_w transactions_r",
      },
    },
    profile(profile) {
      return {
        id: profile.sub,
        name: profile.name,
        email: profile.email,
        image: profile.picture,
      }
    },
    token: "https://api.etsy.com/v3/public/oauth/token",
    userinfo: "https://api.etsy.com/v3/application/users/",
    ...options
  };
};

const handler = NextAuth({
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
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      return session;
    },
  },
});

export { handler as GET, handler as POST };