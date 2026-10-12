// mysql2 returns JSON columns already parsed; older versions returned a string.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parseJsonResult = (value: unknown): any => {
  if (typeof value === "string") {
    return JSON.parse(value || "{}");
  }
  return value ?? {};
};
