function numericOrder(project) {
  const value = Number(project?.order);
  return Number.isFinite(value) ? value : 0;
}

function timestampFromValue(value) {
  if (typeof value !== "string" || !value.trim()) return 0;

  const parsedDate = Date.parse(value);
  if (Number.isFinite(parsedDate)) return parsedDate;

  const suffix = value.toLowerCase().match(/([a-z0-9]{8,})$/)?.[1];
  if (!suffix) return 0;

  const parsedBase36 = Number.parseInt(suffix, 36);
  const minReasonable = Date.UTC(2020, 0, 1);
  const maxReasonable = Date.UTC(2100, 0, 1);
  return parsedBase36 >= minReasonable && parsedBase36 <= maxReasonable ? parsedBase36 : 0;
}

function projectCreatedAtMs(project) {
  return (
    timestampFromValue(project?.createdAt) ||
    timestampFromValue(project?.id) ||
    timestampFromValue(project?.slug)
  );
}

export function hasManualProjectOrder(projects) {
  const orders = projects.map(numericOrder);
  return new Set(orders).size > 1;
}

export function sortProjectsForDisplay(projects) {
  const manualOrder = hasManualProjectOrder(projects);

  return [...projects].sort((left, right) => {
    if (manualOrder) {
      const orderDelta = numericOrder(left) - numericOrder(right);
      if (orderDelta !== 0) return orderDelta;
    }

    const createdDelta = projectCreatedAtMs(right) - projectCreatedAtMs(left);
    if (createdDelta !== 0) return createdDelta;

    const rightKey = String(right?.id || right?.slug || "");
    const leftKey = String(left?.id || left?.slug || "");
    return rightKey.localeCompare(leftKey, "en");
  });
}
