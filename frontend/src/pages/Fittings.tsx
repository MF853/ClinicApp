import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api, date, useAction, type Member, type Occurrence } from '../api';
import { Button, Field, Message, Badge, Loading } from '../components/ui';
import s from '../styles/app.module.css';
interface Request {
  id: string; originalId: string | null; receptionRequired: boolean; status: string; createdAt: string; reason?: string;
  occurrenceId: string; patientName: string; therapist: string; startsAt: string; room: string;
}
export function Fittings({ ctx }: { ctx: Member }) {
  const [params] = useSearchParams(), [originalId, setOriginal] = useState(params.get('originalId') ?? '');
  const [mode, setMode] = useState('replacement'), [days, setDays] = useState(7), [search, setSearch] = useState(false), [reason, setReason] = useState('');
  const action = useAction(), mine = ctx.role === 'PATIENT', standalone = mode === 'care';
  const start = new Date(); start.setDate(start.getDate() - 30);
  const end = new Date(); end.setDate(end.getDate() + 1);
  const originals = useQuery({ queryKey: ['replacement-originals', ctx.id], enabled: mine && !standalone,
    queryFn: () => api<Occurrence[]>(`/agenda?from=${start.toISOString()}&to=${end.toISOString()}`) });
  const found = useQuery({ queryKey: ['suggestions', ctx.id, mode, originalId, days], enabled: mine && search && (standalone || !!originalId),
    queryFn: () => api<Occurrence[]>(standalone ? `/care/suggestions?days=${days}` : `/fittings/suggestions?originalId=${originalId}&days=${days}`) });
  const requests = useQuery({ queryKey: ['fittings', ctx.id], queryFn: () => api<Request[]>('/fittings') });
  const canSearch = standalone || !!originalId;
  return <>
    <div className={s.kicker}>Continuidade do seu atendimento</div>
    <h1>{mine ? 'Reposição e atendimento avulso' : 'Solicitações de encaixe'}</h1>
    <p>A escolha reserva a vaga durante a análise. O novo atendimento será criado após aprovação.</p>
    {mine && <div className={s.panel}>
      <Field label="Tipo de solicitação"><select value={mode} onChange={e => { setMode(e.target.value); setSearch(false); setDays(7); action.reset(); }}>
        <option value="replacement">Reposição de consulta</option><option value="care">Atendimento avulso — sessão bloqueada</option>
      </select></Field>
      {standalone ? <>
        <h2>Solicitar atendimento com sessão bloqueada</h2>
        <p>Você pode pedir um horário com um terapeuta de suas sessões bloqueadas, sem escolher uma consulta anterior. A recepção analisa o pedido; a aprovação não reativa seu horário fixo.</p>
        <p>Os horários respeitam sua <Link to="/disponibilidade">disponibilidade informada</Link>.</p>
      </> : <>
        {originals.isPending && <Loading />}
        {originals.error && <Message error>{originals.error.message}<Button variant="secondary" onClick={() => originals.refetch()}>Tentar novamente</Button></Message>}
        <Field label="Consulta a repor"><select value={originalId} onChange={e => { setOriginal(e.target.value); setSearch(false); }}>
          <option value="">Selecione uma consulta cancelada ou falta abonada</option>
          {originals.data?.flatMap(o => o.appointments.filter(a => ['CANCELLED', 'EXCUSED'].includes(a.status)).map(a => <option key={a.id} value={a.id}>{date(o.startsAt, ctx.clinic.timezone)} · {o.therapist}</option>))}
        </select></Field>
      </>}
      <div className={s.actions}>
        <Button disabled={!canSearch || found.isFetching || action.isPending} onClick={() => { setDays(7); setSearch(true); }}>{found.isFetching ? 'Buscando horários…' : 'Buscar nos próximos 7 dias'}</Button>
        <Button variant="secondary" disabled={!canSearch || found.isFetching || action.isPending} onClick={() => { setDays(14); setSearch(true); }}>Ampliar para 14 dias</Button>
      </div>
      {found.error && <Message error>{found.error.message}<Button variant="secondary" onClick={() => found.refetch()}>Tentar novamente</Button></Message>}
      {search && found.isPending && <Loading />}
      {search && found.data && !found.data.length && <Message>{standalone ? 'Não há horários compatíveis para suas sessões bloqueadas neste período. Confira sua disponibilidade, amplie a busca ou fale com a recepção.' : `Não encontramos horários compatíveis nos próximos ${days} dias. Você pode ampliar a busca ou entrar em contato com a recepção.`}</Message>}
      {search && <div className={s.patientGrid}>{found.data?.map((o, i) => <div className={s.panel} key={o.id}>
        {i === 0 && !standalone && <Badge state="Mais próximo da data original" />}
        <h2>{date(o.startsAt, ctx.clinic.timezone)}</h2>{o.therapist && <p>{o.therapist}</p>}
        <p>{o.slot.room} · {o.slot.minAge}–{o.slot.maxAge} anos · capacidade {o.slot.capacity}</p>
        <Button disabled={action.isPending} onClick={() => action.mutate({ path: '/fittings', body: { ...(standalone ? {} : { originalId }), occurrenceId: o.id } })}>Solicitar este horário</Button>
      </div>)}</div>}
    </div>}
    {action.error && <Message error>{action.error.message}</Message>}
    {action.isSuccess && <Message>Alteração registrada. Confira o acompanhamento abaixo.</Message>}
    <h2>Acompanhamento</h2>
    {!mine && <Field label="Motivo da recusa, quando necessário"><textarea value={reason} maxLength={2000} onChange={e => setReason(e.target.value)} /></Field>}
    {requests.isPending ? <Loading /> : requests.error ? <Message error>{requests.error.message}<Button variant="secondary" onClick={() => requests.refetch()}>Tentar novamente</Button></Message> : requests.data?.length ? requests.data.map(r => <article className={s.panel} key={r.id}>
      <div className={s.row}><h3>{r.originalId ? 'Reposição' : 'Atendimento avulso'}</h3><Badge state={r.status} /></div>
      <p><strong>{date(r.startsAt, ctx.clinic.timezone)}</strong> · {r.room}</p>
      <p>{mine ? r.therapist : `${r.patientName} · ${r.therapist}`}</p>
      <small>Solicitado em {date(r.createdAt, ctx.clinic.timezone)}</small>
      {r.receptionRequired && <p>{r.originalId ? 'Esta sessão está bloqueada. A aprovação cabe à recepção.' : 'Este pedido depende da recepção e não reativa o horário fixo.'}</p>}
      {r.reason && <p>{r.reason} {r.status === 'REJECTED' ? 'Escolha outro horário ou fale com a recepção.' : ''}</p>}
      {r.status === 'APPROVED' && mine && <p><Link to="/">Ver consulta na agenda</Link></p>}
      {!mine && r.status === 'PENDING' && <div className={s.actions}>
        <Button disabled={action.isPending || (r.receptionRequired && ctx.role !== 'RECEPTION')} onClick={() => action.mutate({ path: `/fittings/${r.id}/decision`, body: { decision: 'approve', reason: '' } })}>{r.originalId ? 'Aprovar encaixe' : 'Aprovar atendimento'}</Button>
        <Button variant="secondary" disabled={action.isPending || reason.trim().length < 5 || (!r.originalId && ctx.role !== 'RECEPTION')} onClick={() => action.mutate({ path: `/fittings/${r.id}/decision`, body: { decision: 'reject', reason } })}>Recusar com motivo</Button>
      </div>}
    </article>) : <div className={s.empty}>Nenhuma solicitação neste perfil.</div>}
  </>;
}
