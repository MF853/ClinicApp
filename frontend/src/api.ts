import { useMutation, useQueryClient } from '@tanstack/react-query';
let csrf = '';
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch('/api/v1' + path, { method: body === undefined ? 'GET' : 'POST', credentials: 'include', headers: body === undefined ? {} : { 'x-csrf-token': csrf, ...(body instanceof FormData ? {} : { 'content-type': 'application/json' }) }, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body) }).catch(() => { throw new ApiError(0, 'Houve uma instabilidade de conexão. Verifique sua rede e tente novamente.'); });
  const data = await response.json();
  if (!response.ok) throw new ApiError(response.status, Array.isArray(data.message) ? data.message.join(' ') : data.message ?? 'Não foi possível concluir. Atualize a página e tente novamente.');
  if (data.csrf) csrf = data.csrf;
  return data;
}
export function useAction() { const client = useQueryClient(); return useMutation({ mutationFn: ({ path, body }: { path: string; body: unknown }) => api(path, body), onSuccess: () => client.invalidateQueries() }); }
export interface Clinic { id: string; name: string; timezone: string; particular: boolean; absenceLimit: number; justificationDays: number; confirmationHour: number; closeHours: number; evaluationDays: number; replacementPerAbsence: number; replacementPerWindow: number; holidays: string[]; requiredCategories: string[] }
export interface Member { id: string; role: 'PATIENT' | 'THERAPIST' | 'ADMIN' | 'RECEPTION'; clinic: Clinic; canReview: boolean; user: { name: string; email: string } }
export interface Session { context: Member; memberships: Member[] }
export interface Appointment { id: string; patientId: string; patientName: string; status: string; opensAt: string; closesAt: string }
export interface Occurrence { id: string; startsAt: string; endsAt: string; blocked: boolean; therapist: string; occupied: number; reserved: number; slot: { id: string; room: string; capacity: number; minAge: number; maxAge: number }; appointments: Appointment[] }
export interface Absence { id: string; occurredAt: string; deadline: string; state: string; appointmentId: string }
export const roleNames = { PATIENT: 'Paciente', THERAPIST: 'Terapeuta', ADMIN: 'Administrador', RECEPTION: 'Recepção' };
export function date(value: string, zone: string, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }) { return new Intl.DateTimeFormat('pt-BR', { timeZone: zone, ...options }).format(new Date(value)); }

export const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const minuteTime = (value: number) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;

export const certificateCategories: Record<string, string> = { SAUDE_PACIENTE: 'Problema de saúde do paciente', SAUDE_DEPENDENTE: 'Problema de saúde de dependente', EMERGENCIA_FAMILIAR: 'Emergência familiar', COMPROMISSO_PROFISSIONAL: 'Compromisso profissional inadiável', DESLOCAMENTO: 'Intercorrência de deslocamento', FORCA_MAIOR: 'Força maior', OUTRO: 'Outro' };
