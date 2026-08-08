import { PrivyClient } from '@privy-io/server-auth';

let privyClient: PrivyClient | null = null

function getPrivyClient(): PrivyClient {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID
  const appSecret = process.env.PRIVY_APP_SECRET
  if (!appId || !appSecret) {
    throw new Error('Privy server authentication is not configured')
  }

  privyClient ??= new PrivyClient(appId, appSecret)
  return privyClient
}

// Helper to verify auth token from request
export async function verifyPrivyToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return { userId: null, error: 'No token provided' };
  }

  try {
    const verifiedClaims = await getPrivyClient().verifyAuthToken(token);
    return { userId: verifiedClaims.userId, error: null };
  } catch (error) {
    return { userId: null, error: 'Invalid token' };
  }
}

// Helper to get user from Privy
export async function getPrivyUser(userId: string) {
  try {
    return await getPrivyClient().getUser(userId);
  } catch (error) {
    return null;
  }
}

// Extract Twitter username from Privy user's linked accounts
export function extractTwitterFromPrivyUser(user: any): string | null {
  if (!user?.linkedAccounts) return null;

  const twitterAccount = user.linkedAccounts.find(
    (account: any) => account.type === 'twitter_oauth'
  );

  return twitterAccount?.username || null;
}

// Extract email from Privy user's linked accounts
export function extractEmailFromPrivyUser(user: any): string | null {
  if (!user?.linkedAccounts) return null;

  const emailAccount = user.linkedAccounts.find(
    (account: any) => account.type === 'email'
  );

  return emailAccount?.address || null;
}

// Extract wallet address from Privy user's linked accounts
export function extractWalletFromPrivyUser(user: any): string | null {
  if (!user?.linkedAccounts) return null;

  const walletAccount = user.linkedAccounts.find(
    (account: any) => account.type === 'wallet'
  );

  return walletAccount?.address || null;
}
