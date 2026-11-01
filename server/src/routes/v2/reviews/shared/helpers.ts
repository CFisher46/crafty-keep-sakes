import express from 'express';
import { getRequestUser } from '../../../../ts-common/middleware';

export const getActor = (req: express.Request) => {
  const user = getRequestUser(req);

  return {
    actorUserId: user && typeof user === 'object' && 'id' in user ? Number(user.id) : null,
    actorRole: user && typeof user === 'object' && 'type' in user ? String(user.type) : null,
  };
};

// Reviews carry a calendar date, not a moment in time. Using local date parts keeps the value
// stable in the same timezone the database driver used to read it.
export const toDateOnly = (value: Date | string): string => {
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  const pad = (part: number) => String(part).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
};
