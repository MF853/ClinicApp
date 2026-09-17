import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, useAction, weekdays, minuteTime, type Member } from '../api';
import type { Person } from './Members';
import { Button, Field, Loading, Message, Modal } from '../components/ui';
import s from '../styles/app.module.css';
interface Slot { id: string; weekday: number; minute: number; duration: number; capacity: number; minAge: number; maxAge: number; room: string; therapist: string; therapistId: string; blocked: boolean; assignments: { patientId: string; name: string }[] }

function SlotForm({ slot, onClose }: { slot?: Slot; onClose: () => void }) {
  const action = useAction();
  return <Modal title={slot ? 'Editar horário' : 'Criar horário'} onClose={onClose}>
    <p>O horário se repete semanalmente. Horários com atendimentos ou bloqueios não podem ser movidos por este formulário.</p>
    <form onSubmit={async e => {
      e.preventDefault(); const data = new FormData(e.currentTarget);
      const minutes = (key: string) => { const [h, m] = String(data.get(key)).split(':').map(Number); return h * 60 + m; };
      const body = { weekday: Number(data.get('weekday')), startMinute: minutes('start'), endMinute: minutes('end') || 1440, room: data.get('room'), capacity: Number(data.get('capacity')), minAge: Number(data.get('minAge')), maxAge: Number(data.get('maxAge')) };
      try { await action.mutateAsync({ path: slot ? `/slots/${slot.id}` : '/slots', body }); onClose(); } catch { /* mantém dados */ }
    }}>
      <Field label="Dia da semana"><select name="weekday" defaultValue={slot?.weekday ?? 1}>{weekdays.map((day, i) => <option key={day} value={i}>{day}</option>)}</select></Field>
      <div className={s.split}><Field label="Início"><input type="time" name="start" defaultValue={slot ? minuteTime(slot.minute) : ''} required /></Field><Field label="Fim" hint="00:00 encerra à meia-noite."><input type="time" name="end" defaultValue={slot ? minuteTime((slot.minute + slot.duration) % 1440) : ''} required /></Field></div>
      <Field label="Sala"><input name="room" defaultValue={slot?.room ?? 'Sala 1'} required maxLength={80} /></Field>
      <Field label="Pacientes simultâneos"><input name="capacity" type="number" defaultValue={slot?.capacity ?? 1} min={1} max={20} required /></Field>
      <div className={s.split}><Field label="Idade mínima"><input name="minAge" type="number" defaultValue={slot?.minAge ?? 0} min={0} max={120} required /></Field><Field label="Idade máxima"><input name="maxAge" type="number" defaultValue={slot?.maxAge ?? 120} min={0} max={120} required /></Field></div>
      {action.error && <Message error>{action.error.message}</Message>}
      <Button disabled={action.isPending}>{action.isPending ? 'Salvando…' : 'Salvar horário'}</Button>
    </form>
  </Modal>;
}

function Allocation({ slot, ctx, onClose }: { slot: Slot; ctx: Member; onClose: () => void }) {
  const action = useAction(), [exception, setException] = useState(false);
  const people = useQuery({ queryKey: ['members', ctx.id], queryFn: () => api<Person[]>('/members') });
  const candidates = people.data?.filter(p => p.active && p.role === 'PATIENT' && !slot.assignments.some(a => a.patientId === p.id));
  return <Modal title="Alocar paciente" onClose={onClose}>
    <p>{weekdays[slot.weekday]} · {minuteTime(slot.minute)} · {slot.room}</p><p>Faixa etária: {slot.minAge}–{slot.maxAge} anos. Capacidade: {slot.capacity}.</p>
    <p>A alocação é recorrente. Consultas anteriormente canceladas não são reativadas automaticamente.</p>
    {people.isPending ? <Loading /> : people.error ? <Message error>{people.error.message}</Message> : !candidates?.length ? <Message>Não há pacientes disponíveis neste perfil. Cadastre um paciente ou solicite a alocação à clínica.</Message> : <form onSubmit={async e => {
      e.preventDefault(); const data = new FormData(e.currentTarget);
      try { await action.mutateAsync({ path: `/slots/${slot.id}/assign`, body: { patientId: data.get('patientId'), exception, reason: data.get('reason') ?? '' } }); onClose(); } catch { /* feedback */ }
    }}>
      <Field label="Paciente"><select name="patientId" required defaultValue=""><option value="">Selecione um paciente</option>{candidates.map(p => <option key={p.id} value={p.id}>{p.user.name}</option>)}</select></Field>
      {ctx.role === 'THERAPIST' && <Field label="Exceção de faixa etária"><select value={String(exception)} onChange={e => setException(e.target.value === 'true')}><option value="false">Respeitar a faixa etária</option><option value="true">Confirmo a exceção de faixa etária</option></select></Field>}
      {exception && <Field label="Justificativa da exceção"><textarea name="reason" required minLength={5} maxLength={1000} /></Field>}
      {action.error && <Message error>{action.error.message}</Message>}
      <Button disabled={action.isPending}>Confirmar alocação</Button>
    </form>}
  </Modal>;
}

function Release({ slot, patient, onClose }: { slot: Slot; patient: Slot['assignments'][number]; onClose: () => void }) {
  const action = useAction();
  return <Modal title="Liberar horário fixo" onClose={onClose}>
    <p>{patient.name} · {weekdays[slot.weekday]} · {minuteTime(slot.minute)}</p>
    <p>Consultas futuras ainda não confirmadas deste horário serão canceladas. Consultas já confirmadas e reposições serão preservadas.</p>
    <form onSubmit={async e => {
      e.preventDefault(); const data = new FormData(e.currentTarget);
      try { await action.mutateAsync({ path: `/slots/${slot.id}/assignments/${patient.patientId}/release`, body: { reason: data.get('reason') } }); onClose(); } catch { /* feedback */ }
    }}>
      <Field label="Motivo da liberação"><textarea name="reason" required minLength={5} maxLength={1000} /></Field>
      {action.error && <Message error>{action.error.message}</Message>}
      <div className={s.actions}><Button variant="secondary" type="button" onClick={onClose}>Manter horário</Button><Button variant="danger" disabled={action.isPending}>Confirmar liberação</Button></div>
    </form>
  </Modal>;
}

export function Slots({ ctx }: { ctx: Member }) {
  const query = useQuery({ queryKey: ['slots', ctx.id], queryFn: () => api<Slot[]>('/slots') });
  const [editing, setEditing] = useState<Slot | 'new' | null>(null), [allocation, setAllocation] = useState<Slot | null>(null), [release, setRelease] = useState<{ slot: Slot; patient: Slot['assignments'][number] } | null>(null), [therapist, setTherapist] = useState('');
  const therapists = [...new Map(query.data?.map(slot => [slot.therapistId, slot.therapist])).entries()];
  const slots = query.data?.filter(slot => !therapist || slot.therapistId === therapist);
  return <><div className={s.row}><h1>Grade de horários</h1>{ctx.role === 'THERAPIST' && <Button onClick={() => setEditing('new')}>Criar horário</Button>}</div>
    <p>Organize a grade semanal e as alocações fixas. Consulte presenças e bloqueios na Agenda.</p>
    {ctx.role !== 'THERAPIST' && <Field label="Filtrar terapeuta"><select value={therapist} onChange={e => setTherapist(e.target.value)}><option value="">Todos os terapeutas</option>{therapists.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></Field>}
    {query.isPending ? <Loading /> : query.error ? <Message error>{query.error.message}</Message> : !slots?.length ? <div className={s.empty}>Nenhum horário cadastrado.</div> : <div className={s.patientGrid}>{slots.map(slot => <article className={s.panel} key={slot.id}>
      <h2>{weekdays[slot.weekday]} · {minuteTime(slot.minute)}–{minuteTime(slot.minute + slot.duration)}</h2>
      <p>{slot.therapist} · {slot.room}</p><p>{slot.minAge}–{slot.maxAge} anos · {slot.assignments.length}/{slot.capacity} pacientes fixos</p>
      {slot.blocked && <Message>Horário bloqueado.</Message>}
      {slot.assignments.map(patient => <div key={patient.patientId} className={s.panel}><p>{patient.name}</p>{ctx.role !== 'RECEPTION' && <Button variant="secondary" onClick={() => setRelease({ slot, patient })}>Liberar horário fixo</Button>}</div>)}
      <div className={s.actions}>{ctx.role === 'THERAPIST' && <Button variant="secondary" onClick={() => setEditing(slot)}>Editar horário</Button>}<Button disabled={slot.blocked || slot.assignments.length >= slot.capacity} onClick={() => setAllocation(slot)}>Alocar paciente</Button></div>
    </article>)}</div>}
    {editing && <SlotForm slot={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    {allocation && <Allocation slot={allocation} ctx={ctx} onClose={() => setAllocation(null)} />}
    {release && <Release {...release} onClose={() => setRelease(null)} />}
  </>;
}
