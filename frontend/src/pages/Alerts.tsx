import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, date, useAction, type Member } from '../api';
import { Button, Field, Loading, Message, Modal } from '../components/ui';
import s from '../styles/app.module.css';
interface Alert { id: string; text: string; audience: keyof typeof audiences; endsAt: string }
const audiences = { ALL: 'Pacientes e terapeutas', PATIENT: 'Pacientes', THERAPIST: 'Terapeutas' };
export function Alerts({ ctx }: { ctx: Member }) {
  const query = useQuery({ queryKey: ['alerts', ctx.id], queryFn: () => api<Alert[]>('/alerts'), refetchInterval: query => query.state.error ? 30000 : Math.max(1000, Math.min(30000, ...(query.state.data ?? []).map(alert => new Date(alert.endsAt).getTime() - Date.now()))) });
  const action = useAction(), [open, setOpen] = useState(false);
  const alerts = query.data?.filter(alert => new Date(alert.endsAt).getTime() > Date.now());
  return <><div className={s.row}><h1>Avisos da clínica</h1>{ctx.role === 'ADMIN' && <Button onClick={() => setOpen(true)}>Publicar aviso</Button>}</div>
    <p>Comunicados vigentes de {ctx.clinic.name}.</p>
    {query.isPending ? <Loading /> : query.error ? <Message error>{query.error.message}<Button onClick={() => query.refetch()}>Tentar novamente</Button></Message> : !alerts?.length ? <div className={s.empty}>Nenhum aviso vigente.</div> : <div className={s.patientGrid}>{alerts.map(alert => <article className={s.panel} key={alert.id}>
      <h2>{audiences[alert.audience]}</h2><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{alert.text}</p><small>Exibição até {date(alert.endsAt, ctx.clinic.timezone)} ({ctx.clinic.timezone})</small>
    </article>)}</div>}
    {open && <Modal title="Publicar aviso" onClose={() => setOpen(false)}><p>O aviso ficará visível imediatamente para o público escolhido até o término informado.</p><form onSubmit={async e => {
      e.preventDefault(); const data = new FormData(e.currentTarget);
      try { await action.mutateAsync({ path: '/alerts', body: { text: data.get('text'), audience: data.get('audience'), endsAt: new Date(String(data.get('endsAt'))).toISOString() } }); setOpen(false); } catch { /* mantém formulário */ }
    }}>
      <Field label="Público"><select name="audience" defaultValue="ALL">{Object.entries(audiences).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
      <Field label="Mensagem"><textarea name="text" required minLength={5} maxLength={2000} /></Field>
      <Field label="Exibir até" hint={`Horário do seu dispositivo (${Intl.DateTimeFormat().resolvedOptions().timeZone}).`}><input type="datetime-local" name="endsAt" required /></Field>
      {action.error && <Message error>{action.error.message}</Message>}
      <Button disabled={action.isPending}>{action.isPending ? 'Publicando…' : 'Confirmar publicação'}</Button>
    </form></Modal>}
  </>;
}
