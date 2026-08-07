import React, { useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { TenantEntityType } from '@/lib/api';
import { toast } from 'sonner';
import { useEntityTypes } from '../hooks/useEntityTypes';

function formatSchema(schema: TenantEntityType['schema_json']) {
  return JSON.stringify(schema || { fields: {} }, null, 2);
}

const EntityTypesPage: React.FC = () => {
  const { data: entityTypes = [], isLoading, error } = useEntityTypes();

  useEffect(() => {
    if (!error) return;
    const message =
      error instanceof Error ? error.message : 'Failed to load entity types';
    toast.error(message || 'Failed to load entity types');
  }, [error]);

  const sortedEntityTypes = useMemo(() => {
    return [...entityTypes].sort((a, b) =>
      a.entity_type.localeCompare(b.entity_type),
    );
  }, [entityTypes]);

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Entity Types</h1>
          <p className="text-sm text-muted-foreground">
            Discovered entity schemas for the current tenant.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Entity Table</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Schema</TableHead>
                    <TableHead className="w-32 text-right">Fields Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Loading entity types...
                      </TableCell>
                    </TableRow>
                  ) : sortedEntityTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No entity types found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedEntityTypes.map((entityType) => (
                      <TableRow key={entityType.entity_type}>
                        <TableCell className="font-medium">{entityType.entity_type}</TableCell>
                        <TableCell>
                          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs text-muted-foreground">
                            {formatSchema(entityType.schema_json)}
                          </pre>
                        </TableCell>
                        <TableCell className="text-right">{entityType.fields_count}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-4 md:hidden">
              {isLoading ? (
                <Card>
                  <CardContent className="py-6 text-center text-muted-foreground">
                    Loading entity types...
                  </CardContent>
                </Card>
              ) : sortedEntityTypes.length === 0 ? (
                <Card>
                  <CardContent className="py-6 text-center text-muted-foreground">
                    No entity types found.
                  </CardContent>
                </Card>
              ) : (
                sortedEntityTypes.map((entityType) => (
                  <Card key={entityType.entity_type}>
                    <CardContent className="space-y-4 p-4">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Entity Type
                        </p>
                        <p className="font-semibold">
                          {entityType.entity_type}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Fields Count
                        </p>
                        <p className="font-semibold">
                          {entityType.fields_count}
                        </p>
                      </div>

                      <div>
                        <p className="mb-2 text-xs text-muted-foreground">
                          Schema
                        </p>

                        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
                          {formatSchema(entityType.schema_json)}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default EntityTypesPage;