export function vehicleDisplayName(
  name?: string | null,
  opts?: { index?: number; isRental?: boolean }
): string {
  const normalized = (name || "").trim();
  const isRental = !!opts?.isRental;

  // Already in Turkish-friendly format
  if (/^Kiralık\s*Araç\s*\d*$/i.test(normalized)) {
    return normalized;
  }
  if (/^Araç\s*\d*$/i.test(normalized)) {
    return normalized;
  }

  // Patterns: V1, Vehicle 1
  const vMatch = normalized.match(/^V\s*(\d+)$/i);
  const vehicleMatch = normalized.match(/^Vehicle\s*(\d+)$/i);

  // Rental patterns: RV1, RENT1, RENTED 2
  const rentMatch = normalized.match(/^(RV|RENT|RENTED)\s*-?\s*(\d+)?$/i);

  let num: number | undefined = undefined;
  if (vMatch) num = parseInt(vMatch[1], 10);
  else if (vehicleMatch) num = parseInt(vehicleMatch[1], 10);
  else if (rentMatch)
    num = rentMatch[2] ? parseInt(rentMatch[2], 10) : undefined;

  if (isRental || rentMatch) {
    const n = num ?? opts?.index;
    return `Kiralık Araç${n ? ` ${n}` : ""}`;
  }

  if (vMatch || vehicleMatch) {
    const n = num ?? opts?.index;
    return `Araç${n ? ` ${n}` : ""}`;
  }

  // Fallbacks
  if (normalized) {
    // If name includes a number-like suffix, try to extract
    const genericNum = normalized.match(/(\d+)/);
    const n = genericNum ? parseInt(genericNum[1], 10) : opts?.index;
    if (/rental/i.test(normalized)) {
      return `Kiralık Araç${n ? ` ${n}` : ""}`;
    }
    // Keep original for unfamiliar names
    return normalized;
  }

  // No name provided
  if (opts?.index) {
    return `Araç ${opts.index}`;
  }
  return "Araç";
}
