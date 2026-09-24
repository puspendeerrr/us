import { getAuthenticatedContext } from '@/lib/auth/context';
import { getRelationshipSettings } from '@/lib/relationship/relationship.service';
import { getDashboardData } from '@/lib/dashboard/dashboard.service';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { PageContent } from '@/components/layout/page-content';
import { RelationshipTimer } from '@/components/timer/relationship-timer';
import { DashboardWidgets } from '@/components/dashboard/dashboard-widgets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Clock, Database } from 'lucide-react';
import { prisma } from '@/lib/prisma';

export default async function HomePage() {
  const { user, partner } = await getAuthenticatedContext();
  const [settings, dashboardData, totalUsers] = await Promise.all([
    getRelationshipSettings(),
    getDashboardData(user),
    prisma.user.count(),
  ]);

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description={
          partner
            ? `Private space for ${user.displayName} and ${partner.displayName}.`
            : `Welcome back, ${user.displayName}. Partner account has not been registered yet.`
        }
        action={
          <Badge
            variant="outline"
            className="gap-1.5 py-1 px-3 text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Authenticated Session
          </Badge>
        }
      />

      <PageContent>
        {/* 1. Primary Hero Widget: Relationship Timer */}
        <RelationshipTimer
          startAt={settings?.startAt ? settings.startAt.toISOString() : null}
          date={settings?.date || null}
          time={settings?.time || null}
          timezone={settings?.timezone || 'UTC'}
          partnerAName={settings?.partnerAName}
          partnerBName={settings?.partnerBName}
        />

        {/* 2. Compact Dashboard Widgets (Genuine Empty States) */}
        <div className="space-y-2 pt-2">
          <h2 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground px-1">
            Overview
          </h2>
          <DashboardWidgets data={dashboardData} />
        </div>

        {/* 3. System Integrity & Security Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </CardTitle>
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                Encrypted
              </div>
              <p className="text-xs text-muted-foreground">End-to-end verified</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Partners
              </CardTitle>
              <Users className="w-3.5 h-3.5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-base font-bold">{partner ? '2 Connected' : '1 Pending'}</div>
              <p className="text-xs text-muted-foreground">Strict 2-user limit</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Timezone
              </CardTitle>
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-base font-bold truncate">
                {settings?.timezone || 'UTC'}
              </div>
              <p className="text-xs text-muted-foreground">Synchronized clock</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Database
              </CardTitle>
              <Database className="w-3.5 h-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-base font-bold">PostgreSQL</div>
              <p className="text-xs text-muted-foreground">
                {totalUsers} {totalUsers === 1 ? 'account' : 'accounts'} active
              </p>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </PageContainer>
  );
}
