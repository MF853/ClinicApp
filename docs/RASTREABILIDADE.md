# Rastreabilidade

Matriz em construção. Nenhum requisito é integralmente aceito antes das verificações.

| IDs | Implementação | Verificação | Situação |
|---|---|---|---|
| RF-ADM-03/04/05/06, RNF-46 | identity.ts, access.ts, schema.prisma | build TypeScript; domain.test.ts: isolamento e acesso; HTTP pendente | parcial |
| RN-08..15 | confirmation.ts | domain.test.ts: confirmação e cancelamento | parcial |
| RN-16..34, RF-FAL-14 | absences.ts, time.ts | time.test.ts; domain.test.ts: faltas, decisão, janela | parcial |
| RF-ENC-02..09, RN-38..42 | fitting.ts | domain.test.ts: disputa, idempotência, restrições | parcial |
| Demais requisitos | ainda não entregue | não executada | pendente |
