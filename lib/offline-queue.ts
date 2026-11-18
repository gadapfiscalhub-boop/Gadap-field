export interface OfflineAction {
  id: string;
  type: 'medicao' | 'ponto' | 'suprimento' | 'recebimento' | 'rdo' | 'sst' | 'rnc';
  payload: Record<string, unknown>;
  createdAt: string;
}

const QUEUE_KEY = 'gadap_field_offline_queue_v1';

export function getOfflineQueue(): OfflineAction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as OfflineAction[]) : [];
  } catch {
    return [];
  }
}

export function enqueueOfflineAction(
  type: OfflineAction['type'],
  payload: Record<string, unknown>
): OfflineAction {
  const item: OfflineAction = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    payload,
    createdAt: new Date().toISOString(),
  };
  const queue = getOfflineQueue();
  queue.push(item);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent('gadap-queue-updated'));
  return item;
}

export function removeOfflineAction(id: string): void {
  const queue = getOfflineQueue().filter((item) => item.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent('gadap-queue-updated'));
}

export function clearOfflineQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
  window.dispatchEvent(new CustomEvent('gadap-queue-updated'));
}
