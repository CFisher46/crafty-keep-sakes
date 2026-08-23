import { ResultSetHeader } from 'mysql2';
import { db } from '../../ts-common/database';

export type AuditEventAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'READ'
  | 'LOGIN'
  | 'LOGOUT';

export type AuditEventPayload = {
  actorUserId?: number | string | null;
  actorRole?: string | null;
  actionType: AuditEventAction;
  resourceType: string;
  resourceId?: number | string | null;
  sourceEndpoint?: string | null;
  oldValuesJson?: Record<string, unknown> | null;
  newValuesJson?: Record<string, unknown> | null;
};

const serializeJson = (value: Record<string, unknown> | null | undefined) => {
  if (value === undefined || value === null) {
    return null;
  }

  return JSON.stringify(value);
};

export async function insertAuditEvent(
  connection: { query: Function } | null,
  payload: AuditEventPayload
) {
  const target = connection ?? db;
  const [result] = await target.query(
    `INSERT INTO audit_events_v2 (
      actor_user_id,
      actor_role,
      action_type,
      resource_type,
      resource_id,
      source_endpoint,
      old_values_json,
      new_values_json,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      payload.actorUserId ?? null,
      payload.actorRole ?? null,
      payload.actionType,
      payload.resourceType,
      payload.resourceId ?? null,
      payload.sourceEndpoint ?? null,
      serializeJson(payload.oldValuesJson),
      serializeJson(payload.newValuesJson),
    ]
  );

  return result.insertId;
}
