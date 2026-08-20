export function resetAssistantPanelScroll(container: HTMLElement | null) {
  if (!container) return;
  container.scrollTop = 0;
}

export function scrollAssistantPanelToEnd(container: HTMLElement | null) {
  if (!container) return;
  container.scrollTop = container.scrollHeight;
}

export function scrollAssistantPanelToTarget(
  container: HTMLElement | null,
  target: HTMLElement | null,
  block: 'start' | 'nearest' = 'start',
) {
  if (!container || !target) return;
  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const targetTop = container.scrollTop + targetRect.top - containerRect.top;
  const targetBottom = targetTop + targetRect.height;
  const visibleTop = container.scrollTop;
  const visibleBottom = visibleTop + container.clientHeight;

  if (block === 'nearest' && targetTop >= visibleTop && targetBottom <= visibleBottom) return;

  const desiredTop = block === 'nearest' && targetBottom > visibleBottom
    ? targetBottom - container.clientHeight + 12
    : targetTop - 12;
  const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
  container.scrollTop = Math.max(0, Math.min(desiredTop, maxTop));
}
