import NextAuth from "next-auth";
import { EtsyProvider } from "next-auth/providers/etsy";

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
      session.accessToken = token.accessToken;
      return session;
    },
  },
});

export { handler as GET, handler as POST };