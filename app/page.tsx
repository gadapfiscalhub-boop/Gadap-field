import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import FieldDashboardClient from '@/components/FieldDashboardClient';

export const dynamic = 'force-dynamic';

export default async function FieldHomePage() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const tenantId =
    user.app_metadata?.tenant_id || user.user_metadata?.tenant_id || '';
  const userName =
    user.user_metadata?.full_name || user.email || 'Mestre de Obras';

  let projects: { id: string; name: string; code?: string }[] = [];
  if (tenantId) {
    const { data } = await supabase
      .from('projects')
      .select('id, name, code')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (data) {
      projects = data;
    }
  }

  return (
    <FieldDashboardClient
      userEmail={user.email || ''}
      userName={userName}
      tenantId={tenantId}
      accessToken={session?.access_token || ''}
      projects={projects}
    />
  );
}
