import type { Defect, DefectCreate, DefectStats, Component, AuthToken, Notification, LocateResult, BcfTopic, BcfTopicCreate } from '../types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // Don't set Content-Type for FormData (browser sets boundary automatically)
  // Don't override if caller already set Content-Type
  if (!(options?.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const msg = Array.isArray(err.detail)
      ? err.detail.map((e: { msg?: string }) => e.msg).join(', ')
      : err.detail || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

// --- Auth ---
export async function login(username: string, password: string): Promise<AuthToken> {
  const form = new URLSearchParams();
  form.append('username', username);
  form.append('password', password);
  return request<AuthToken>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
}

export async function register(username: string, password: string, role: string = 'inspector') {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, role }),
  });
}

// --- Defects ---
export async function getDefects(params?: Record<string, string>): Promise<Defect[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request<Defect[]>(`/defects${qs}`);
}

export async function getDefect(id: number): Promise<Defect> {
  return request<Defect>(`/defects/${id}`);
}

export async function createDefect(data: DefectCreate, photo: File): Promise<Defect> {
  const form = new FormData();
  form.append('photo', photo);
  form.append('defect_class', data.defect_class);
  form.append('confidence', String(data.confidence));
  form.append('bbox', data.bbox);
  form.append('floor', data.floor);
  if (data.gps_lat != null) form.append('gps_lat', String(data.gps_lat));
  if (data.gps_lng != null) form.append('gps_lng', String(data.gps_lng));
  if (data.severity) form.append('severity', data.severity);
  if (data.notes) form.append('notes', data.notes);
  return request<Defect>('/defects', { method: 'POST', body: form });
}

export async function updateDefect(id: number, updates: Partial<Defect>): Promise<Defect> {
  return request<Defect>(`/defects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function getDefectStats(): Promise<DefectStats> {
  return request<DefectStats>('/defects/stats');
}

// --- Components ---
export async function getComponents(params?: Record<string, string>): Promise<Component[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request<Component[]>(`/components${qs}`);
}

export async function getComponent(id: number): Promise<Component> {
  return request<Component>(`/components/${id}`);
}

export async function getComponentDefects(id: number): Promise<Defect[]> {
  return request<Defect[]>(`/components/${id}/defects`);
}

// --- Reports ---
export async function downloadBCF(): Promise<Blob> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE}/reports/bcf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('BCF download failed');
  return res.blob();
}

export async function downloadPDF(): Promise<Blob> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE}/reports/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('PDF download failed');
  return res.blob();
}

export async function downloadCSV(): Promise<Blob> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE}/reports/csv`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('CSV download failed');
  return res.blob();
}

// --- Locate ---
export async function locateComponent(lat: number, lng: number, floor?: string): Promise<LocateResult> {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  if (floor) params.set('floor', floor);
  return request<LocateResult>(`/locate?${params}`);
}

// --- Notifications ---
export async function getNotifications(unreadOnly = false): Promise<Notification[]> {
  const qs = unreadOnly ? '?unread_only=true' : '';
  return request<Notification[]>(`/notifications${qs}`);
}

export async function getUnreadCount(): Promise<number> {
  const data = await request<{ count: number }>('/notifications/unread-count');
  return data.count;
}

export async function markNotificationRead(id: number): Promise<void> {
  await request(`/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsRead(): Promise<void> {
  await request('/notifications/read-all', { method: 'POST' });
}

// --- Bulk defect operations ---
export async function bulkUpdateDefects(ids: number[], updates: Partial<Defect>): Promise<Defect[]> {
  const results: Defect[] = [];
  for (const id of ids) {
    const d = await updateDefect(id, updates);
    results.push(d);
  }
  return results;
}

// --- BCF Topics ---
export async function getBcfTopics(): Promise<BcfTopic[]> {
  return request<BcfTopic[]>('/bcf/topics');
}

export async function createBcfTopic(data: BcfTopicCreate): Promise<BcfTopic> {
  return request<BcfTopic>('/bcf/topics', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateBcfTopic(id: number, data: Partial<BcfTopic>): Promise<BcfTopic> {
  return request<BcfTopic>(`/bcf/topics/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteBcfTopic(id: number): Promise<void> {
  await request(`/bcf/topics/${id}`, { method: 'DELETE' });
}

export async function addBcfComment(topicId: number, text: string, author?: string): Promise<unknown> {
  return request(`/bcf/topics/${topicId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text, author }),
  });
}

export async function exportBcfTopics(): Promise<Blob> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE}/bcf/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('BCF export failed');
  return res.blob();
}

export async function importBcfTopics(file: File): Promise<{ imported: number }> {
  const form = new FormData();
  form.append('file', file);
  return request<{ imported: number }>('/bcf/import', { method: 'POST', body: form });
}
