export function cleanForFirestore(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (Array.isArray(value)) return value.map(cleanForFirestore);
  if (typeof value === "object") {
    const out = {};
    Object.keys(value).forEach((k) => {
      const v = value[k];
      out[k] = v === undefined ? null : cleanForFirestore(v);
    });
    return out;
  }
  return value;
}
