import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, date, useAction, type Member } from '../api';
import { Button, Field, Loading, Message, Modal } from '../components/ui';
import s from '../styles/app.module.css';
const types: Record<string, string> = { ACCESS: 'Acesso aos meus dados', CORRECT: 'Correção de dados', EXPORT: 'Exportação / portabilidade', DELETE: 'Exclusão de dados', REVOKE: 'Revogação de consentimento' };
const statuses: Record<string, string> = { OPEN: 'Recebido', IN_REVIEW: 'Em análise', RESPONDED: 'Resposta registrada' };
interface Request { id: string; clinicId: string | null; type: string; details: string; status: string; response: string; createdAt: string; dueAt: string; respondedAt: string | null; requesterName?: string }
export function Privacy({ ctx }: { ctx: Member }) {
  const [inbox, setInbox] = useState(false), [type, setType] = useState('ACCESS'), [details, setDetails] = useState(''), [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [selected, setSelected] = useState<Request | null>(null), [response, setResponse] = useState('');
  const action = useAction(), list = useQuery({ queryKey: ['privacy', ctx.id, inbox], queryFn: () => api<Request[]>(inbox ? '/privacy/inbox' : '/privacy/requests') });
  return <><div className={s.kicker}>Seus dados e seus pedidos</div><h1>Privacidade</h1>
    <section className={s.panel} aria-labelledby="privacy-information"><h2 id="privacy-information">Informações sobre seus dados</h2>
      <p>O ClinicApp usa dados de cadastro, vínculos com clínicas, disponibilidade, consultas, faltas e justificativas para organizar o atendimento. Documentos enviados podem conter dados de saúde.</p>
      <p>O acesso depende do perfil e da clínica. A recepção não acessa documentos clínicos; os avaliadores autorizados analisam justificativas. Operações relevantes ficam registradas em auditoria.</p>
      <p>Seus pedidos nesta página são encaminhados à administração de <strong>{ctx.clinic.name}</strong>. Descreva o necessário, sem incluir senhas, documentos completos ou informações de outras pessoas.</p>
      <p>As informações desta versão não substituem a política de privacidade e os termos aprovados pela clínica. Base legal, retenção e atendimento de menores ainda precisam de definição antes do uso com dados reais.</p>
      <small>Informações da versão de 23/09/2026. Nenhum aceite de termos ou consentimento é solicitado nesta página.</small>
    </section>
    {ctx.role === 'ADMIN' && <div className={s.actions}>
      <Button variant="secondary" aria-pressed={!inbox} onClick={() => { setInbox(false); action.reset(); }}>Meus pedidos</Button>
      <Button variant="secondary" aria-pressed={inbox} onClick={() => { setInbox(true); action.reset(); }}>Pedidos da clínica</Button>
    </div>}
    {!inbox && <form className={s.form} onSubmit={async e => { e.preventDefault(); try { await action.mutateAsync({ path: '/privacy/requests', body: { type, details, requestKey } }); setDetails(''); setRequestKey(crypto.randomUUID()); } catch { /* preserva texto e chave para repetir */ } }}>
      <h2>Novo pedido</h2><Field label="Tipo de pedido"><select value={type} onChange={e => setType(e.target.value)}>{Object.entries(types).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
      <Field label="O que você precisa?"><textarea required minLength={5} maxLength={2000} value={details} onChange={e => setDetails(e.target.value)} /></Field>
      <p>O pedido será analisado por uma pessoa. Solicitar exclusão ou revogação não apaga dados, cancela consultas nem altera consentimentos automaticamente.</p>
      <Button disabled={action.isPending || details.trim().length < 5}>{action.isPending ? 'Enviando…' : 'Enviar pedido'}</Button>
    </form>}
    {action.error && !selected && <Message error>{action.error.message}</Message>}{action.isSuccess && !selected && <Message>Solicitação registrada. Confira o acompanhamento abaixo.</Message>}
    <h2>{inbox ? 'Pedidos da clínica' : 'Acompanhamento dos meus pedidos'}</h2>
    <p>O prazo indicado para acompanhamento é de 15 dias. A resposta deve explicar as providências, eventuais limitações e os próximos passos.</p>
    {list.isPending ? <Loading /> : list.error ? <Message error>{list.error.message}<Button variant="secondary" onClick={() => list.refetch()}>Tentar novamente</Button></Message> : !list.data?.length ? <div className={s.empty}>Nenhum pedido registrado neste contexto.</div> : list.data.map(r => <article className={s.panel} key={r.id}>
      <h3>{types[r.type] ?? r.type}</h3><p><strong>{statuses[r.status] ?? r.status}</strong>{r.status !== 'RESPONDED' && new Date(r.dueAt) < new Date() ? ' · Prazo ultrapassado' : ''}</p>
      {r.requesterName && <p>Titular: {r.requesterName}</p>}
      <small>Protocolo: {r.id}</small><p>Recebido em {date(r.createdAt, ctx.clinic.timezone)}<br />Prazo de acompanhamento: {date(r.dueAt, ctx.clinic.timezone)}</p>
      {!r.clinicId && <Message>Pedido antigo sem clínica vinculada. Ele foi preservado; contate a administração ou registre um novo pedido na clínica correta.</Message>}
      <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{r.details || 'Sem descrição registrada.'}</p>
      {r.response && <><h3>Resposta da administração</h3><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{r.response}</p><small>{date(r.respondedAt!, ctx.clinic.timezone)}</small></>}
      {inbox && r.status !== 'RESPONDED' && <div className={s.actions}>
        {r.status === 'OPEN' && <Button variant="secondary" disabled={action.isPending} onClick={() => action.mutate({ path: `/privacy/requests/${r.id}/response`, body: { status: 'IN_REVIEW', response: '' } })}>Iniciar análise</Button>}
        <Button disabled={action.isPending} onClick={() => { setSelected(r); setResponse(''); action.reset(); }}>Responder pedido</Button>
      </div>}
    </article>)}
    {selected && <Modal title="Responder pedido de privacidade" onClose={() => setSelected(null)}>
      <p>{types[selected.type]} · {selected.requesterName}</p><p>Registre o que foi realizado, o que permanece pendente e como o titular deve prosseguir. Este registro não executa exportação, correção, exclusão ou revogação por si só.</p>
      <form onSubmit={async e => { e.preventDefault(); try { await action.mutateAsync({ path: `/privacy/requests/${selected.id}/response`, body: { status: 'RESPONDED', response } }); setSelected(null); } catch { /* mantém a resposta */ } }}>
        <Field label="Resposta ao titular"><textarea required minLength={10} maxLength={2000} value={response} onChange={e => setResponse(e.target.value)} /></Field>
        <p>A resposta ficará visível ao titular e não poderá ser sobrescrita.</p>{action.error && <Message error>{action.error.message}</Message>}
        <Button disabled={action.isPending || response.trim().length < 10}>Registrar resposta</Button>
      </form>
    </Modal>}
  </>;
}
