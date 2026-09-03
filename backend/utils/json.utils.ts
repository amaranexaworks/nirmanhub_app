/**
 * json.utils — array/tree helpers used when shaping DB rows into the nested
 * structures the client expects (e.g. building the menu tree from a flat join).
 * Mirrors the WMS `utils/json.utils` helpers referenced by MenuCtrl.
 */
export {};

/** De-duplicate an array of objects by a key. */
exports.uniqueArr = function (arr: any[], key: string): any[] {
  const seen = new Set();
  const out: any[] = [];
  for (const item of arr || []) {
    const k = item[key];
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
};

/** Stable sort a copy of `arr` by `key`. */
exports.sortArr = function (arr: any[], key: string, dir: 'asc' | 'desc' = 'asc'): any[] {
  const copy = [...(arr || [])];
  copy.sort((a, b) => {
    const av = a[key], bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return dir === 'asc' ? -1 : 1;
    if (bv == null) return dir === 'asc' ? 1 : -1;
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ? 1 : -1;
    return 0;
  });
  return copy;
};

exports.concateArr = function (a: any[], b: any[]): any[] {
  return [...(a || []), ...(b || [])];
};

/**
 * Group a flat, joined row set into parent rows each carrying a nested child
 * array. Rows sharing the same `groupByKey` value collapse into one parent that
 * keeps `commonFields`; the `childFields` of each row become an entry in the
 * `childArrName` array. Sorted by `sortKey`.
 *
 * This is the workhorse behind turning `parent JOIN child` menu rows into a tree.
 */
exports.groupJsonByKey = function (
  rows: any[],
  commonFields: string[],
  childFields: string[],
  childArrName: string,
  groupByKey: string,
  sortKey: string,
  dir: 'asc' | 'desc' = 'asc'
): any[] {
  const map = new Map<any, any>();
  for (const row of rows || []) {
    const k = row[groupByKey];
    if (!map.has(k)) {
      const parent: any = {};
      for (const f of commonFields) parent[f] = row[f];
      parent[childArrName] = [];
      map.set(k, parent);
    }
    const child: any = {};
    for (const f of childFields) child[f] = row[f];
    // Only push a child if it carries a real identifier.
    if (child[childFields[0]] != null || Object.values(child).some((v) => v != null)) {
      map.get(k)[childArrName].push(child);
    }
  }
  return exports.sortArr(Array.from(map.values()), sortKey, dir);
};
