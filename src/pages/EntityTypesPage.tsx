import React, { useEffect, useMemo, useState } from 'react';
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
import { entityTypesApi, type TenantEntityType } from '@/lib/entityTypesApi';
import { toast } from 'sonner';

function formatSchema(schema: TenantEntityType['schema_json']) {
  return JSON.stringify(schema || { fields: {} }, null, 2);
}

const EntityTypesPage: React.FC = () => {
  const [entityTypes, setEntityTypes] = useState<TenantEntityType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadEntityTypes() {
      setIsLoading(true);
      try {
        const data = await entityTypesApi.listEntityTypes();
        if (isMounted) {
          setEntityTypes(data);
        }
      } catch (error: any) {
        if (isMounted) {
          toast.error(error?.message || 'Failed to load entity types');
          setEntityTypes([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadEntityTypes();

    return () => {
      isMounted = false;
    };
  }, []);

  const sortedEntityTypes = useMemo(() => {
    return [...entityTypes].sort((a, b) => a.entity_type.localeCompare(b.entity_type));
  }, [entityTypes]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default EntityTypesPage;
