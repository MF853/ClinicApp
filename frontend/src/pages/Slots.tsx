import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, useAction, weekdays, minuteTime, type Member } from '../api';
import type { Person } from './Members';
import { Avatar, Badge, Button, Field, Loading, Message, Modal, EmptyState } from '../components/ui';
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
  const [editing, setEditing] = useState<Slot | 'new' | null>(null), [allocation, setAllocation] = useState<Slot | null>(null), [release, setRelease] = useState<{ slot: Slot; patient: Slot['assignments'][number] } | null>(null), [therapist, setTherapist] = useState(''), [selectedDay, setSelectedDay] = useState(() => new Date().getDay()), [detail, setDetail] = useState<Slot | null>(null);
  const therapists = [...new Map(query.data?.map(slot => [slot.therapistId, slot.therapist])).entries()];
  const slots = query.data?.filter(slot => !therapist || slot.therapistId === therapist);
  const minutes = [...new Set(slots?.map(slot => slot.minute) ?? [])].sort((a, b) => a - b);
  const cells = new Map<string, Slot[]>();
  for (const slot of slots ?? []) { const key = `${slot.weekday}/${slot.minute}`; cells.set(key, [...(cells.get(key) ?? []), slot]); }
  const today = new Date().getDay();
  function card(slot: Slot) { return <article className={s.slot} key={slot.id}>
    <div className={s.personRow}><Avatar name={slot.therapist} /><h2>{slot.therapist}</h2></div>
    <p>{slot.room}</p>
    {slot.assignments.length ? <p>{slot.assignments.length}/{slot.capacity} pacientes fixos</p> : <Badge state={slot.blocked ? 'BLOCKED' : 'FREE'} />}
    <div className={s.actions}><Button variant="secondary" onClick={() => setDetail(slot)}>Ver horário</Button></div>
  </article>; }
  return <><div className={s.row}><h1>Grade de horários</h1>{ctx.role === 'THERAPIST' && <Button onClick={() => setEditing('new')}>Criar horário</Button>}</div>
    <p>Organize a grade semanal e as alocações fixas. Consulte presenças e bloqueios na Agenda.</p>
    {ctx.role !== 'THERAPIST' && <Field label="Filtrar terapeuta"><select value={therapist} onChange={e => setTherapist(e.target.value)}><option value="">Todos os terapeutas</option>{therapists.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></Field>}
    {query.isPending ? <Loading /> : query.error ? <Message error>{query.error.message}</Message> : !slots?.length ? <EmptyState>Nenhum horário cadastrado ainda. Crie o primeiro horário fixo para começar a grade da semana.</EmptyState> : <>
      <div className={s.tabs} aria-label="Dia da semana">{weekdays.map((day, i) => <Button key={day} variant="secondary" aria-pressed={selectedDay === i} onClick={() => setSelectedDay(i)}>{day}</Button>)}</div>
      <div className={s.calendarScroll} role="region" aria-label="Grade semanal de horários" tabIndex={0}>
        <table className={s.week}>
          <caption>Grade semanal de horários fixos</caption>
          <thead><tr><th scope="col" className={s.timeColumn}>Horário</th>{weekdays.map((day, i) => <th scope="col" key={day} className={`${s.calendarDay} ${selectedDay === i ? s.activeDay : ''}`} aria-current={i === today ? 'date' : undefined}>{day}{i === today && <small className={s.todayBadge}>Hoje</small>}</th>)}</tr></thead>
          <tbody>{minutes.map(minute => <tr key={minute}>
            <th scope="row" className={s.timeColumn}><time>{minuteTime(minute)}</time></th>
            {weekdays.map((day, i) => <td key={day} className={`${s.calendarDay} ${selectedDay === i ? s.activeDay : ''}`}>
              <div className={s.calendarEvents}>{cells.get(`${i}/${minute}`)?.length ? cells.get(`${i}/${minute}`)!.map(card) : <span className={s.calendarEmpty}>Sem horário</span>}</div>
            </td>)}
          </tr>)}</tbody>
        </table>
      </div>
    </>}
    {detail && <Modal title={`${weekdays[detail.weekday]} · ${minuteTime(detail.minute)}`} onClose={() => setDetail(null)}>
      <p>{detail.therapist} · {detail.room}</p>
      <p>{detail.minAge}–{detail.maxAge} anos · {detail.assignments.length}/{detail.capacity} pacientes fixos</p>
      {detail.blocked && <Message>Horário bloqueado.</Message>}
      {detail.assignments.map(patient => <div key={patient.patientId} className={s.panel}><div className={s.personRow}><Avatar name={patient.name} /><p>{patient.name}</p></div>{ctx.role !== 'RECEPTION' && <Button variant="secondary" onClick={() => { setRelease({ slot: detail, patient }); setDetail(null); }}>Liberar horário fixo</Button>}</div>)}
      <div className={s.actions}>{ctx.role === 'THERAPIST' && <Button variant="secondary" onClick={() => { setEditing(detail); setDetail(null); }}>Editar horário</Button>}<Button disabled={detail.blocked || detail.assignments.length >= detail.capacity} onClick={() => { setAllocation(detail); setDetail(null); }}>Alocar paciente</Button></div>
    </Modal>}
    {editing && <SlotForm slot={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    {allocation && <Allocation slot={allocation} ctx={ctx} onClose={() => setAllocation(null)} />}
    {release && <Release {...release} onClose={() => setRelease(null)} />}
  </>;
}
