import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, date, roleNames, useAction, type Member, type Absence } from '../api';
import { Badge, Button, Field, Loading, Message, Modal } from '../components/ui';
import s from '../styles/app.module.css';

export interface Person { id: string; role: Member['role']; active: boolean; absenceLimit: number | null; justificationDays: number | null; registration: string; user: { name: string; email: string; phone: string } }
const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const time = (v: number) => `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;

function CreatePerson({ ctx, onClose }: { ctx: Member; onClose: () => void }) {
  const action = useAction(), [role, setRole] = useState('PATIENT'), [exception, setException] = useState(false);
  const slots = useQuery({ queryKey: ['slots', ctx.id], enabled: ctx.role === 'THERAPIST', queryFn: () => api<{ id: string; weekday: number; minute: number; room: string; blocked: boolean }[]>('/slots') });
  return <Modal title="Cadastrar pessoa" onClose={onClose}><form onSubmit={async e => {
    e.preventDefault(); const data = new FormData(e.currentTarget);
    const body = { name: data.get('name'), email: data.get('email'), phone: data.get('phone'), password: data.get('password'), role,
      ...(data.get('birthDate') ? { birthDate: data.get('birthDate') } : {}), ...(role === 'THERAPIST' ? { registration: data.get('registration') } : {}),
      ...(ctx.role === 'THERAPIST' ? { slotId: data.get('slotId'), exception, reason: data.get('reason') ?? '' } : {}) };
    try { await action.mutateAsync({ path: '/members', body }); onClose(); } catch { /* preserva o formulário */ }
  }}>
    {ctx.role === 'ADMIN' && <Field label="Perfil"><select value={role} onChange={e => setRole(e.target.value)}><option value="PATIENT">Paciente</option><option value="THERAPIST">Terapeuta</option><option value="RECEPTION">Recepção</option></select></Field>}
    <Field label="Nome completo"><input name="name" required minLength={2} maxLength={120} autoComplete="name" /></Field>
    <Field label="E-mail"><input name="email" type="email" required autoComplete="email" /></Field>
    <Field label="Telefone"><input name="phone" type="tel" required maxLength={30} autoComplete="tel" /></Field>
    {role === 'PATIENT' && <Field label="Data de nascimento" hint="Usada para verificar a faixa etária dos horários."><input name="birthDate" type="date" required /></Field>}
    {role === 'THERAPIST' && <Field label="Registro profissional"><input name="registration" required maxLength={60} /></Field>}
    <Field label="Senha inicial" hint="Mínimo de 12 caracteres. Informe a senha à pessoa por um canal seguro."><input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></Field>
    {ctx.role === 'THERAPIST' && <>
      <Field label="Horário fixo inicial"><select name="slotId" required><option value="">Selecione um horário da sua grade</option>{slots.data?.filter(x => !x.blocked).map(x => <option key={x.id} value={x.id}>{weekdays[x.weekday]} · {time(x.minute)} · {x.room}</option>)}</select></Field>
      {slots.error && <Message error>{slots.error.message}</Message>}
      <Field label="Exceção de faixa etária"><select value={String(exception)} onChange={e => setException(e.target.value === 'true')}><option value="false">Respeitar a faixa etária</option><option value="true">Confirmo a exceção de faixa etária</option></select></Field>
      {exception && <Field label="Justificativa da exceção"><textarea name="reason" required minLength={5} maxLength={1000} /></Field>}
    </>}
    {action.error && <Message error>{action.error.message}</Message>}
    <Button disabled={action.isPending}>{action.isPending ? 'Cadastrando…' : 'Salvar cadastro'}</Button>
  </form></Modal>;
}

function PersonDetails({ person, ctx, onClose }: { person: Person; ctx: Member; onClose: () => void }) {
  const action = useAction(), [reason, setReason] = useState(''), [until, setUntil] = useState(''), [confirmStatus, setConfirmStatus] = useState(false);
  const summary = useQuery({ queryKey: ['absence-summary', ctx.id, person.id], enabled: person.role === 'PATIENT' && person.active,
    queryFn: () => api<{ summary: { count: number; limit: number }; items: Absence[] }>(`/patients/${person.id}/absences`) });
  return <Modal title={person.user.name} onClose={onClose}>
    <p>{roleNames[person.role]} · {person.active ? 'Vínculo ativo' : 'Vínculo inativo'}</p><p>{person.user.email} · {person.user.phone}</p>
    {person.registration && <p>Registro profissional: {person.registration}</p>}
    {person.role === 'PATIENT' && person.active && <>
      {summary.isPending ? <Loading /> : summary.error ? <Message error>{summary.error.message}</Message> : <>
        <h3>{summary.data.summary.count} de {summary.data.summary.limit} faltas não justificadas</h3>
        <h3>Histórico de faltas</h3>
        {!summary.data.items.length && <p>Nenhuma falta registrada.</p>}
        {summary.data.items.map(a => <div className={s.panel} key={a.id}><p>{date(a.occurredAt, ctx.clinic.timezone)}</p><Badge state={a.state} /><p>Prazo de justificativa: {date(a.deadline, ctx.clinic.timezone)}</p></div>)}
      </>}
      {ctx.role === 'ADMIN' && <form key={`${person.absenceLimit}/${person.justificationDays}`} onSubmit={e => {
        e.preventDefault(); const data = new FormData(e.currentTarget);
        action.mutate({ path: `/patients/${person.id}/parameters`, body: Object.fromEntries(['absenceLimit', 'justificationDays'].map(k => [k, data.get(k) === '' ? null : Number(data.get(k))])) });
      }}><h3>Parâmetros individuais</h3><p>Deixe em branco para usar o padrão da clínica. Prazos de faltas já registradas são preservados.</p>
        <Field label="Limite de faltas do paciente" hint={`Padrão da clínica: ${ctx.clinic.absenceLimit}`}><input name="absenceLimit" type="number" min={1} max={100} defaultValue={person.absenceLimit ?? ''} /></Field>
        <Field label="Prazo individual em dias úteis" hint={`Padrão da clínica: ${ctx.clinic.justificationDays}`}><input name="justificationDays" type="number" min={1} max={30} defaultValue={person.justificationDays ?? ''} /></Field>
        <Button disabled={action.isPending}>Salvar parâmetros individuais</Button>
      </form>}
      {ctx.role !== 'RECEPTION' && <><h3>Avaliação da continuidade</h3><p>A liberação exige decisão humana e preserva consultas já confirmadas.</p>
        <Field label="Justificativa da decisão"><textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} /></Field>
        <Field label="Suspender consequências até"><input type="datetime-local" value={until} onChange={e => setUntil(e.target.value)} /></Field>
        <div className={s.actions}>
          <Button variant="secondary" disabled={action.isPending || reason.trim().length < 5 || !summary.data || summary.data.summary.count < summary.data.summary.limit} onClick={() => action.mutate({ path: `/patients/${person.id}/consequence`, body: { action: 'apply', reason } })}>Confirmar liberação do horário fixo</Button>
          <Button variant="secondary" disabled={action.isPending || reason.trim().length < 5 || !until} onClick={() => action.mutate({ path: `/patients/${person.id}/consequence`, body: { action: 'suspend', reason, until: new Date(until).toISOString() } })}>Suspender consequência</Button>
        </div></>}
    </>}
    {ctx.role === 'ADMIN' && person.role !== 'ADMIN' && <div className={s.panel}>
      {confirmStatus ? <form onSubmit={async e => { e.preventDefault(); const data = new FormData(e.currentTarget); try { await action.mutateAsync({ path: `/members/${person.id}/status`, body: { active: !person.active, reason: data.get('reason') } }); onClose(); } catch { /* feedback */ } }}>
        <p>{person.active ? 'O acesso a esta clínica será encerrado. O histórico será preservado. Horários fixos, consultas futuras e reservas precisam estar resolvidos antes.' : 'O acesso a esta clínica será restabelecido. Horários antigos não serão reocupados automaticamente.'}</p>
        <Field label="Motivo da alteração do vínculo"><textarea name="reason" required minLength={5} maxLength={1000} /></Field>
        <div className={s.actions}><Button variant="secondary" type="button" onClick={() => setConfirmStatus(false)}>Voltar</Button><Button variant={person.active ? 'danger' : 'primary'} disabled={action.isPending}>{person.active ? 'Confirmar desvinculação' : 'Confirmar reativação'}</Button></div>
      </form> : <Button variant="secondary" onClick={() => { setConfirmStatus(true); action.reset(); }}>{person.active ? 'Desvincular da clínica' : 'Reativar vínculo'}</Button>}
    </div>}
    {action.error && <Message error>{action.error.message}</Message>}{action.isSuccess && <Message>Alteração registrada com auditoria.</Message>}
  </Modal>;
}

export function Patients({ ctx }: { ctx: Member }) {
  const [selected, setSelected] = useState(''), [creating, setCreating] = useState(false), [filter, setFilter] = useState('PATIENT'), [search, setSearch] = useState('');
  const people = useQuery({ queryKey: ['members', ctx.id], queryFn: () => api<Person[]>('/members') });
  const person = people.data?.find(p => p.id === selected);
  const visible = people.data?.filter(p => (filter === 'ALL' || p.role === filter) && `${p.user.name} ${p.user.email}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  return <><div className={s.row}><h1>Pacientes e vínculos</h1>{['ADMIN', 'THERAPIST'].includes(ctx.role) && <Button onClick={() => setCreating(true)}>Cadastrar pessoa</Button>}</div>
    <p>Consulte os vínculos deste perfil e acompanhe a continuidade do atendimento.</p>
    <div className={s.split}><Field label="Buscar por nome ou e-mail"><input type="search" value={search} onChange={e => setSearch(e.target.value)} /></Field>
      {ctx.role === 'ADMIN' && <Field label="Filtrar perfil"><select value={filter} onChange={e => setFilter(e.target.value)}><option value="PATIENT">Pacientes</option><option value="THERAPIST">Terapeutas</option><option value="RECEPTION">Recepção</option><option value="ALL">Todos</option></select></Field>}
    </div>
    {people.isPending ? <Loading /> : people.error ? <Message error>{people.error.message}</Message> : !visible?.length ? <div className={s.empty}>Nenhum vínculo encontrado com estes filtros.</div> : visible.map(p => <article className={s.panel} key={p.id}><div className={s.row}><div><h2>{p.user.name}</h2><p>{p.user.email}</p><small>{roleNames[p.role]} · {p.active ? 'Ativo' : 'Inativo'}</small></div><Button variant="secondary" onClick={() => setSelected(p.id)}>Ver acompanhamento</Button></div></article>)}
    {creating && <CreatePerson ctx={ctx} onClose={() => setCreating(false)} />}
    {person && <PersonDetails key={person.id} person={person} ctx={ctx} onClose={() => setSelected('')} />}
  </>;
}
