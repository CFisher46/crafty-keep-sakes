export type Audit = {
  log_ref: number;
  user: string;
  field_changed: string;
  action_type: string;
  log_dttm: Date;
  api_source: string;
  changed_by?: string;
};
