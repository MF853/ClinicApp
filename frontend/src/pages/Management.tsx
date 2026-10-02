import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, useAction, certificateCategories, weekdays, minuteTime, type Member } from '../api';
import { Button, Field, Message, Modal } from '../components/ui';
import s from '../styles/app.module.css';
const parameterFields = [['absenceLimit', 'Limite de faltas', 1, 100], ['justificationDays', 'Prazo de justificativa em dias úteis', 1, 30], ['evaluationDays', 'Janela de avaliação em dias', 1, 3650], ['confirmationHour', 'Hora de confirmação na véspera', 0, 23], ['closeHours', 'Encerramento em horas antes da consulta', 2, 24], ['replacementPerAbsence', 'Reposições por falta', 1, 100], ['replacementPerWindow', 'Reposições por janela de avaliação', 1, 1000]] as const;
function FieldsModal({ ctx, onClose }: { ctx: Member; onClose: () => void }) {
  const action = useAction();
  return <Modal title="Faltas, confirmação e reposições" onClose={onClose}><form onSubmit={async e => {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    try { await action.mutateAsync({ path: '/parameters', body: { ...Object.fromEntries(parameterFields.map(([key]) => [key, Number(f.get(key))])), holidays: ctx.clinic.holidays, requiredCategories: ctx.clinic.requiredCategories } }); onClose(); } catch { /* mantém formulário */ }
  }}>
    <p>Limites individuais de faltas e prazos de justificativa prevalecem sobre o padrão. A janela altera a contagem atual; prazos de faltas e consultas já criados são preservados.</p>
    {parameterFields.map(([key, label, min, max]) => <Field key={key} label={label}><input type="number" name={key} min={min} max={max} defaultValue={ctx.clinic[key]} required /></Field>)}
    {action.error && <Message error>{action.error.message}</Message>}
    <Button disabled={action.isPending}>{action.isPending ? 'Salvando…' : 'Salvar'}</Button>
  </form></Modal>;
}
function HolidaysModal({ ctx, onClose }: { ctx: Member; onClose: () => void }) {
  const action = useAction(), [holidays, setHolidays] = useState(ctx.clinic.holidays), [holiday, setHoliday] = useState('');
  return <Modal title="Feriados para dias úteis" onClose={onClose}>
    <p>Estas datas não contam nos novos prazos de justificativa. Não cancelam consultas nem bloqueiam a agenda.</p>
    <Field label="Data do feriado"><input type="date" value={holiday} onChange={e => setHoliday(e.target.value)} /></Field>
    <Button type="button" variant="secondary" disabled={!holiday || holidays.includes(holiday) || holidays.length >= 1000} onClick={() => { setHolidays([...holidays, holiday].sort()); setHoliday(''); }}>Adicionar feriado</Button>
    {holidays.length ? <ul>{holidays.map(day => <li key={day}>{day.split('-').reverse().join('/')} <Button type="button" variant="secondary" onClick={() => setHolidays(holidays.filter(d => d !== day))} aria-label={`Remover feriado ${day}`}>Remover</Button></li>)}</ul> : <p>Nenhum feriado cadastrado.</p>}
    {action.error && <Message error>{action.error.message}</Message>}
    <Button disabled={action.isPending} onClick={async () => {
      try { await action.mutateAsync({ path: '/parameters', body: { ...Object.fromEntries(parameterFields.map(([key]) => [key, ctx.clinic[key]])), holidays, requiredCategories: ctx.clinic.requiredCategories } }); onClose(); } catch { /* mantém formulário */ }
    }}>{action.isPending ? 'Salvando…' : 'Salvar'}</Button>
  </Modal>;
}
function CategoriesModal({ ctx, onClose }: { ctx: Member; onClose: () => void }) {
  const action = useAction();
  return <Modal title="Comprovantes obrigatórios" onClose={onClose}><form onSubmit={async e => {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    try { await action.mutateAsync({ path: '/parameters', body: { ...Object.fromEntries(parameterFields.map(([key]) => [key, ctx.clinic[key]])), holidays: ctx.clinic.holidays, requiredCategories: f.getAll('requiredCategories') } }); onClose(); } catch { /* mantém formulário */ }
  }}>
    <p>Marque as categorias que exigem documento nos novos envios. Justificativas já enviadas são preservadas.</p>
    {Object.entries(certificateCategories).map(([value, label]) => <label key={value} className={s.categoryOption}><input type="checkbox" name="requiredCategories" value={value} defaultChecked={ctx.clinic.requiredCategories.includes(value)} /><span>{label}</span></label>)}
    {action.error && <Message error>{action.error.message}</Message>}
    <Button disabled={action.isPending}>{action.isPending ? 'Salvando…' : 'Salvar'}</Button>
  </form></Modal>;
}
export function Availability() { const action = useAction(); const query = useQuery({ queryKey: ['availability'], queryFn: () => api<{ id: string; weekday: number; startMinute: number; endMinute: number }[]>('/availability') }); return <><h1>Minha disponibilidade</h1><p>Informe os períodos em que você pode vir. A busca de encaixe respeita estes horários.</p><form className={s.form} onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); const minutes = (key: string) => { const [h, m] = String(f.get(key)).split(':').map(Number); return h * 60 + m; }; action.mutate({ path: '/availability', body: { weekday: Number(f.get('weekday')), startMinute: minutes('start'), endMinute: minutes('end') } }); }}><Field label="Dia da semana"><select name="weekday">{weekdays.map((n, i) => <option key={n} value={i}>{n}</option>)}</select></Field><div className={s.split}><Field label="A partir de"><input name="start" type="time" required /></Field><Field label="Até"><input name="end" type="time" required /></Field></div><Button disabled={action.isPending}>Salvar disponibilidade</Button></form>{action.error && <Message error>{action.error.message}</Message>}{action.isSuccess && <Message>Disponibilidade atualizada.</Message>}{query.data?.map(a => <div className={`${s.panel} ${s.row}`} key={a.id}><span>{weekdays[a.weekday]} · {minuteTime(a.startMinute)} até {minuteTime(a.endMinute)}</span><Button type="button" variant="secondary" disabled={action.isPending} onClick={() => action.mutate({ path: `/availability/${a.id}/remove`, body: {} })} aria-label={`Remover disponibilidade de ${weekdays[a.weekday]}`}>Remover</Button></div>)}</>; }
export function Settings({ ctx }: { ctx: Member }) {
  const [editing, setEditing] = useState<'fields' | 'holidays' | 'categories' | null>(null);
  return <><h1>Parâmetros da clínica</h1><p>As alterações serão registradas em auditoria. Fuso: {ctx.clinic.timezone}.</p>
    <article className={s.panel}>
      <div className={s.row}><h2>Faltas, confirmação e reposições</h2><Button variant="secondary" onClick={() => setEditing('fields')}>Editar</Button></div>
      <p>Limite de {ctx.clinic.absenceLimit} faltas · prazo de {ctx.clinic.justificationDays} dias úteis para justificar.</p>
      <p>Confirmação até às {ctx.clinic.confirmationHour}h na véspera · encerra {ctx.clinic.closeHours}h antes da consulta.</p>
      <p>Até {ctx.clinic.replacementPerAbsence} reposições por falta, {ctx.clinic.replacementPerWindow} por janela de {ctx.clinic.evaluationDays} dias.</p>
    </article>
    <article className={s.panel}>
      <div className={s.row}><h2>Feriados para dias úteis</h2><Button variant="secondary" onClick={() => setEditing('holidays')}>Editar</Button></div>
      <p>{ctx.clinic.holidays.length ? `${ctx.clinic.holidays.length} feriado(s) cadastrado(s).` : 'Nenhum feriado cadastrado.'}</p>
    </article>
    <article className={s.panel}>
      <div className={s.row}><h2>Comprovantes obrigatórios</h2><Button variant="secondary" onClick={() => setEditing('categories')}>Editar</Button></div>
      <p>{ctx.clinic.requiredCategories.length ? ctx.clinic.requiredCategories.map(c => certificateCategories[c]).join(', ') : 'Nenhuma categoria exige comprovante.'}</p>
    </article>
    {editing === 'fields' && <FieldsModal ctx={ctx} onClose={() => setEditing(null)} />}
    {editing === 'holidays' && <HolidaysModal ctx={ctx} onClose={() => setEditing(null)} />}
    {editing === 'categories' && <CategoriesModal ctx={ctx} onClose={() => setEditing(null)} />}
  </>;
}
