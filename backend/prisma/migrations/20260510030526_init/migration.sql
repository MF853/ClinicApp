-- CreateTable
CREATE TABLE "clinicas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "administradores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinicaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "administradores_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "terapeutas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinicaId" TEXT,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "especialidade" TEXT,
    "registroConselho" TEXT,
    "duracaoSessaoMinutos" INTEGER NOT NULL DEFAULT 50,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "terapeutas_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "configuracoes_sistema" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinicaId" TEXT,
    "terapeutaResponsavelId" TEXT,
    "limiteFaltasNaoJustificadas" INTEGER NOT NULL DEFAULT 3,
    "prazoJustificativaHoras" INTEGER NOT NULL DEFAULT 48,
    "permitirReposicaoAutomatica" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "configuracoes_sistema_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "configuracoes_sistema_terapeutaResponsavelId_fkey" FOREIGN KEY ("terapeutaResponsavelId") REFERENCES "terapeutas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pacientes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "dataNascimento" DATETIME,
    "nomeResponsavel" TEXT,
    "contatoResponsavel" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "sessoes_pacientes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pacienteId" TEXT NOT NULL,
    "terapeutaId" TEXT NOT NULL,
    "statusSessao" TEXT NOT NULL DEFAULT 'ativa',
    "faltasNaoJustificadas" INTEGER NOT NULL DEFAULT 0,
    "dataInicio" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFim" DATETIME,
    "observacoes" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "sessoes_pacientes_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sessoes_pacientes_terapeutaId_fkey" FOREIGN KEY ("terapeutaId") REFERENCES "terapeutas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "horarios_grade_terapeuta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "terapeutaId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFim" TEXT NOT NULL,
    "duracaoMinutos" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "faixaEtariaMinima" INTEGER,
    "faixaEtariaMaxima" INTEGER,
    "limitePacientes" INTEGER NOT NULL DEFAULT 1,
    "permiteReposicao" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "horarios_grade_terapeuta_terapeutaId_fkey" FOREIGN KEY ("terapeutaId") REFERENCES "terapeutas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "grade_paciente_horarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessaoPacienteId" TEXT NOT NULL,
    "horarioGradeTerapeutaId" TEXT NOT NULL,
    "inicioVigencia" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fimVigencia" DATETIME,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "grade_paciente_horarios_sessaoPacienteId_fkey" FOREIGN KEY ("sessaoPacienteId") REFERENCES "sessoes_pacientes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "grade_paciente_horarios_horarioGradeTerapeutaId_fkey" FOREIGN KEY ("horarioGradeTerapeutaId") REFERENCES "horarios_grade_terapeuta" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "agendamentos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessaoPacienteId" TEXT NOT NULL,
    "terapeutaId" TEXT NOT NULL,
    "horarioGradeTerapeutaId" TEXT,
    "reposicaoCriadaPorId" TEXT,
    "tipoHorario" TEXT NOT NULL DEFAULT 'fixo',
    "statusAgendamento" TEXT NOT NULL DEFAULT 'agendado',
    "inicioEm" DATETIME NOT NULL,
    "fimEm" DATETIME NOT NULL,
    "observacoes" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "agendamentos_sessaoPacienteId_fkey" FOREIGN KEY ("sessaoPacienteId") REFERENCES "sessoes_pacientes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "agendamentos_terapeutaId_fkey" FOREIGN KEY ("terapeutaId") REFERENCES "terapeutas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "agendamentos_horarioGradeTerapeutaId_fkey" FOREIGN KEY ("horarioGradeTerapeutaId") REFERENCES "horarios_grade_terapeuta" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "agendamentos_reposicaoCriadaPorId_fkey" FOREIGN KEY ("reposicaoCriadaPorId") REFERENCES "terapeutas" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ausencias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agendamentoId" TEXT NOT NULL,
    "sessaoPacienteId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "motivo" TEXT,
    "justificada" BOOLEAN NOT NULL DEFAULT false,
    "registradaEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "ausencias_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "agendamentos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ausencias_sessaoPacienteId_fkey" FOREIGN KEY ("sessaoPacienteId") REFERENCES "sessoes_pacientes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ausencias_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "atestados" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pacienteId" TEXT NOT NULL,
    "ausenciaId" TEXT NOT NULL,
    "analisadoPorAdministradorId" TEXT,
    "arquivoUrl" TEXT,
    "descricao" TEXT,
    "statusAtestado" TEXT NOT NULL DEFAULT 'enviado',
    "enviadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "analisadoEm" DATETIME,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "atestados_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "atestados_ausenciaId_fkey" FOREIGN KEY ("ausenciaId") REFERENCES "ausencias" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "atestados_analisadoPorAdministradorId_fkey" FOREIGN KEY ("analisadoPorAdministradorId") REFERENCES "administradores" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "clinicas_cnpj_key" ON "clinicas"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "administradores_email_key" ON "administradores"("email");

-- CreateIndex
CREATE INDEX "administradores_clinicaId_idx" ON "administradores"("clinicaId");

-- CreateIndex
CREATE UNIQUE INDEX "terapeutas_email_key" ON "terapeutas"("email");

-- CreateIndex
CREATE INDEX "terapeutas_clinicaId_idx" ON "terapeutas"("clinicaId");

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_sistema_clinicaId_key" ON "configuracoes_sistema"("clinicaId");

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_sistema_terapeutaResponsavelId_key" ON "configuracoes_sistema"("terapeutaResponsavelId");

-- CreateIndex
CREATE INDEX "sessoes_pacientes_pacienteId_statusSessao_idx" ON "sessoes_pacientes"("pacienteId", "statusSessao");

-- CreateIndex
CREATE INDEX "sessoes_pacientes_terapeutaId_statusSessao_idx" ON "sessoes_pacientes"("terapeutaId", "statusSessao");

-- CreateIndex
CREATE INDEX "sessoes_pacientes_terapeutaId_pacienteId_idx" ON "sessoes_pacientes"("terapeutaId", "pacienteId");

-- CreateIndex
CREATE INDEX "horarios_grade_terapeuta_terapeutaId_diaSemana_ativo_idx" ON "horarios_grade_terapeuta"("terapeutaId", "diaSemana", "ativo");

-- CreateIndex
CREATE INDEX "grade_paciente_horarios_horarioGradeTerapeutaId_ativo_idx" ON "grade_paciente_horarios"("horarioGradeTerapeutaId", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "grade_paciente_horarios_sessaoPacienteId_horarioGradeTerapeutaId_inicioVigencia_key" ON "grade_paciente_horarios"("sessaoPacienteId", "horarioGradeTerapeutaId", "inicioVigencia");

-- CreateIndex
CREATE INDEX "agendamentos_sessaoPacienteId_inicioEm_idx" ON "agendamentos"("sessaoPacienteId", "inicioEm");

-- CreateIndex
CREATE INDEX "agendamentos_terapeutaId_inicioEm_idx" ON "agendamentos"("terapeutaId", "inicioEm");

-- CreateIndex
CREATE INDEX "agendamentos_tipoHorario_statusAgendamento_idx" ON "agendamentos"("tipoHorario", "statusAgendamento");

-- CreateIndex
CREATE UNIQUE INDEX "ausencias_agendamentoId_key" ON "ausencias"("agendamentoId");

-- CreateIndex
CREATE INDEX "ausencias_sessaoPacienteId_justificada_idx" ON "ausencias"("sessaoPacienteId", "justificada");

-- CreateIndex
CREATE INDEX "ausencias_pacienteId_justificada_idx" ON "ausencias"("pacienteId", "justificada");

-- CreateIndex
CREATE UNIQUE INDEX "atestados_ausenciaId_key" ON "atestados"("ausenciaId");

-- CreateIndex
CREATE INDEX "atestados_pacienteId_statusAtestado_idx" ON "atestados"("pacienteId", "statusAtestado");

-- CreateIndex
CREATE INDEX "atestados_analisadoPorAdministradorId_idx" ON "atestados"("analisadoPorAdministradorId");
