import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { GRAPH_API_URL } from '@/lib/whatsapp';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = (session.user as { tenantId: string }).tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: 'No profile' }, { status: 403 });
  }

  try {
    const { code, isManual, phoneNumberId: manualPhoneNumberId, accessToken: manualAccessToken, redirectUri } = await request.json();

    if (isManual) {
      if (!manualPhoneNumberId || !manualAccessToken) {
        return NextResponse.json({ error: 'Missing manual phone number ID or access token' }, { status: 400 });
      }

      // Validate credentials via Meta Graph API
      const verifyRes = await fetch(`${GRAPH_API_URL}/${manualPhoneNumberId}?access_token=${manualAccessToken}`);
      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        return NextResponse.json({ error: `Verification failed: ${err.error?.message || JSON.stringify(err)}` }, { status: 400 });
      }

      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          whatsappPhoneNumberId: manualPhoneNumberId,
          whatsappAccessToken: manualAccessToken,
          whatsappSetupComplete: true,
        }
      });

      return NextResponse.json({ 
        success: true, 
        phoneNumberId: manualPhoneNumberId 
      });
    }

    if (!code) {
      return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
    }

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret || appId === 'your-meta-app-id-here' || appSecret === 'your-meta-app-secret') {
      return NextResponse.json({ 
        error: 'Meta App credentials are not configured on the server. Please check META_APP_ID and META_APP_SECRET in .env.local.' 
      }, { status: 500 });
    }

    console.log('[WA Connect] code length:', code?.length, '| first/last 6:', code?.slice(0, 6), '...', code?.slice(-6), '| redirectUri:', redirectUri);

    // 1. Exchange the code for an access token.
    // For the standard redirect OAuth flow (General configuration type), the redirect_uri
    // used in the dialog must be passed here exactly. The frontend sends it in the request body.
    const tokenParams = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      code: code,
      ...(redirectUri ? { redirect_uri: redirectUri } : {}),
    });
    const tokenUrl = `${GRAPH_API_URL}/oauth/access_token?${tokenParams.toString()}`;
    const tokenRes = await fetch(tokenUrl);
    
    if (!tokenRes.ok) {
      const err = await tokenRes.json();
      throw new Error(`Token exchange failed: ${JSON.stringify(err)}`);
    }
    
    const tokenData = await tokenRes.json();
    const userAccessToken = tokenData.access_token;

    // 2. Fetch the user's Business Portfolios.
    // NOTE: /me/whatsapp_business_accounts only works for the WhatsApp Embedded Signup flow
    // (which requires Meta Partner status). For the General OAuth flow we must go through
    // the user's Business Portfolio: /me/businesses → /{biz_id}/whatsapp_business_accounts
    const bizRes = await fetch(
      `${GRAPH_API_URL}/me/businesses?${new URLSearchParams({ access_token: userAccessToken, fields: 'id,name' })}`
    );
    if (!bizRes.ok) {
      const err = await bizRes.json();
      throw new Error(`Failed to fetch Business Portfolios: ${JSON.stringify(err)}`);
    }
    const bizData = await bizRes.json();
    console.log('[WA Connect] businesses:', JSON.stringify(bizData?.data?.map((b: { id: string; name: string }) => ({ id: b.id, name: b.name }))));

    const businessId = bizData.data?.[0]?.id;
    if (!businessId) {
      throw new Error(
        'No Meta Business Portfolio found on this account. ' +
        'Please make sure you are logged in with a Facebook account that has a Meta Business Portfolio, ' +
        'then try again.'
      );
    }

    // 3. Fetch the WhatsApp Business Accounts (WABA) for this Business Portfolio
    const wabaRes = await fetch(
      `${GRAPH_API_URL}/${businessId}/whatsapp_business_accounts?${new URLSearchParams({ access_token: userAccessToken, fields: 'id,name,currency,message_template_namespace' })}`
    );
    if (!wabaRes.ok) {
      const err = await wabaRes.json();
      throw new Error(`Failed to fetch WABA accounts: ${JSON.stringify(err)}`);
    }
    const wabaData = await wabaRes.json();
    console.log('[WA Connect] WABAs:', JSON.stringify(wabaData?.data?.map((w: { id: string; name: string }) => ({ id: w.id, name: w.name }))));

    const wabaId = wabaData.data?.[0]?.id;
    if (!wabaId) {
      throw new Error(
        'No WhatsApp Business Account found under your Meta Business Portfolio. ' +
        'Please set up a WhatsApp Business Account in Meta Business Suite first.'
      );
    }

    // 3. Fetch phone numbers for that WABA
    const phoneRes = await fetch(`${GRAPH_API_URL}/${wabaId}/phone_numbers?${new URLSearchParams({ access_token: userAccessToken })}`);
    if (!phoneRes.ok) {
      const err = await phoneRes.json();
      throw new Error(`Failed to fetch phone numbers: ${JSON.stringify(err)}`);
    }

    const phoneData = await phoneRes.json();
    const phoneNumberId = phoneData.data?.[0]?.id;
    const verifiedName = phoneData.data?.[0]?.verified_name || phoneData.data?.[0]?.display_phone_number;

    if (!phoneNumberId) {
      throw new Error('No WhatsApp phone number found under this account.');
    }

    // 4. Subscribe the WABA to receive webhooks
    const subUrl = `${GRAPH_API_URL}/${wabaId}/subscribed_apps?${new URLSearchParams({ access_token: userAccessToken })}`;
    await fetch(subUrl, { method: 'POST' }).catch(err => {
      console.warn('Failed to auto-subscribe app to WABA webhooks:', err);
    });

    // 5. Save credentials to tenant
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        whatsappPhoneNumberId: phoneNumberId,
        whatsappAccessToken: userAccessToken,
        whatsappSetupComplete: true,
      }
    });

    return NextResponse.json({ 
      success: true, 
      phoneNumberId, 
      verifiedName 
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error during connection';
    console.error('WhatsApp Embedded Signup connection error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
