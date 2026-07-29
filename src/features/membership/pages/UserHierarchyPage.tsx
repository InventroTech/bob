import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { UserHierarchyComponent } from '@/components/page-builder/UserHierarchyComponent';

export default function UserHierarchyPage() {
  return (
    <DashboardLayout>
      <UserHierarchyComponent
        config={{
          title: 'User Hierarchy',
          showDiagram: true,
        }}
      />
    </DashboardLayout>
  );
}
