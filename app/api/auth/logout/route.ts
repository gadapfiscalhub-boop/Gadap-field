import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resetDemoTenantData } from '@/lib/demo-reset';

export const dynamic = 'force-dynamic';

export async function POST() {
  const supabase = createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email === 'admin@teste.com') {
      const tenantId =
        user.app_metadata?.tenant_id ||
        user.user_metadata?.tenant_id ||
        '7ffdf475-b337-4282-ae1f-3f8056394334';

      await resetDemoTenantData(tenantId);
    }
  } catch (err) {
    console.error('[PWA Logout] Erro ao resetar dados de teste:', err);
  }

  await supabase.auth.signOut();
  return NextResponse.json({ success: true });
}
