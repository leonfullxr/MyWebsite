// Blog diagrams. One spec per figure, with both languages.
// Embed in a post with: <figure data-diagram="id" data-alt="..."><figcaption>...</figcaption></figure>
import type { DiagramSpec } from '../lib/diagram';

export const diagrams: Record<string, DiagramSpec> = {
  // Four documents, from authority down to the steps an analyst can follow.
  'ir-layers': {
    cell: 160,
    gap: [88, 56],
    nodes: [
      { id: 'policy', at: [0, 0] },
      { id: 'procedure', at: [1, 0] },
      { id: 'guide', at: [2, 0], tone: 'accent' },
      { id: 'runbook', at: [3, 0] },
    ],
    edges: [
      { from: 'policy', to: 'procedure', label: 'guides' },
      { from: 'procedure', to: 'guide', label: 'informs' },
      { from: 'guide', to: 'runbook', label: 'links' },
    ],
    text: {
      en: {
        nodes: {
          policy: ['Incident policy', 'Authority and ownership'],
          procedure: ['Scenario procedure', 'Escalation and contacts'],
          guide: ['Detection guidance', 'Evidence and benign cases'],
          runbook: ['Technical runbook', 'Approved action and rollback'],
        },
        labels: { guides: 'guides', informs: 'informs', links: 'links to' },
      },
      es: {
        nodes: {
          policy: ['Política de incidentes', 'Autoridad y responsables'],
          procedure: ['Procedimiento', 'Escalado y contactos'],
          guide: ['Guía de detección', 'Evidencias y casos benignos'],
          runbook: ['Runbook técnico', 'Acción aprobada y reversión'],
        },
        labels: { guides: 'guía', informs: 'orienta', links: 'enlaza' },
      },
    },
  },

  // The analyst path and the automatic path leave the same alert and never meet.
  'ir-flow': {
    nodes: [
      { id: 'alert', at: [0, 0.5], m: [0.5, 0], tone: 'ink' },
      { id: 'triage', at: [1, 0], m: [0, 1] },
      { id: 'decision', at: [2, 0], m: [0, 2] },
      { id: 'action', at: [3, 0], m: [0, 3], tone: 'accent' },
      { id: 'ar', at: [1, 1], m: [1, 1], tone: 'soft' },
      { id: 'auto', at: [2, 1], m: [1, 2], tone: 'soft' },
    ],
    edges: [
      { from: 'alert', to: 'triage' },
      { from: 'triage', to: 'decision' },
      { from: 'decision', to: 'action' },
      { from: 'alert', to: 'ar', dashed: true },
      { from: 'ar', to: 'auto', dashed: true },
    ],
    text: {
      en: {
        nodes: {
          alert: ['Wazuh alert', 'A rule matches authentication events'],
          triage: ['Analyst triage', 'Host, source and time window'],
          decision: ['Response decision', 'Authority and customer limits'],
          action: ['Action and review', 'Verify the result, record the case'],
          ar: ['Active Response', 'Only if configured'],
          auto: ['Automatic action', 'Does not wait for approval'],
        },
      },
      es: {
        nodes: {
          alert: ['Alerta de Wazuh', 'Una regla coincide con eventos SSH'],
          triage: ['Análisis', 'Equipo, origen e intervalo'],
          decision: ['Decisión de respuesta', 'Autoridad y límites del cliente'],
          action: ['Acción y revisión', 'Verificar el resultado y registrar el caso'],
          ar: ['Active Response', 'Solo si se configura'],
          auto: ['Acción automática', 'No espera a la aprobación'],
        },
      },
    },
  },

  // The upstream credential stays inside the gateway boundary.
  'credential-flow': {
    cell: 164,
    gap: [80, 56],
    nodes: [
      { id: 'agent', at: [0, 0], m: [0.5, 0] },
      { id: 'gateway', at: [1, 0], span: 2, m: [0, 1], mspan: 2, tone: 'accent' },
      { id: 'api', at: [3, 0], m: [0.5, 3], tone: 'ink' },
      { id: 'policy', at: [1, 1], m: [0, 2], tone: 'soft' },
      { id: 'store', at: [2, 1], m: [1, 2], tone: 'soft' },
    ],
    edges: [
      { from: 'agent', to: 'gateway', label: 'request' },
      { from: 'gateway', to: 'policy', label: 'check' },
      { from: 'store', to: 'gateway', label: 'token' },
      { from: 'gateway', to: 'api', label: 'inject', mlabel: false },
    ],
    groups: [{ ids: ['gateway', 'policy', 'store'], label: 'boundary' }],
    text: {
      en: {
        nodes: {
          agent: ['Agent', 'Limited gateway identity'],
          gateway: ['Gateway', 'Authenticates the request and adds the upstream credential'],
          api: ['Upstream API', 'Receives the forwarded request'],
          policy: ['Policy', 'User, action and resource'],
          store: ['Credential store', 'Supplies it after approval'],
        },
        labels: {
          request: 'request',
          check: 'check',
          token: 'token',
          inject: 'injects',
          boundary: 'Trust boundary',
        },
      },
      es: {
        nodes: {
          agent: ['Agente', 'Identidad de pasarela limitada'],
          gateway: ['Pasarela', 'Autentica la petición y añade la credencial del servicio'],
          api: ['API de destino', 'Recibe la petición enviada'],
          policy: ['Política', 'Usuario, acción y recurso'],
          store: ['Almacén de credenciales', 'La facilita tras la autorización'],
        },
        labels: {
          request: 'petición',
          check: 'comprueba',
          token: 'token',
          inject: 'inyecta',
          boundary: 'Límite de confianza',
        },
      },
    },
  },

  // Each layer is a place to put a control.
  'credential-risk': {
    cell: 560,
    gap: [0, 36],
    nodes: [
      { id: 'agent', at: [0, 0] },
      { id: 'policy', at: [0, 1] },
      { id: 'boundary', at: [0, 2], tone: 'accent' },
      { id: 'dest', at: [0, 3] },
    ],
    edges: [
      { from: 'agent', to: 'policy' },
      { from: 'policy', to: 'boundary' },
      { from: 'boundary', to: 'dest' },
    ],
    text: {
      en: {
        nodes: {
          agent: [
            'Agent runtime',
            'Untrusted content can influence requests. Limit the agent identity and task scope.',
          ],
          policy: [
            'Policy decision',
            'Check user, destination and operation. Require approval for sensitive actions.',
          ],
          boundary: [
            'Credential boundary',
            'Store and inject only approved secrets. Encrypt, rotate and revoke credentials.',
          ],
          dest: [
            'Destination',
            'Receive only permitted traffic. Block bypass and audit without logging tokens.',
          ],
        },
      },
      es: {
        nodes: {
          agent: [
            'Entorno del agente',
            'El contenido no fiable puede influir. Limitar identidad y alcance de la tarea.',
          ],
          policy: [
            'Decisión de política',
            'Comprobar usuario, destino y operación. Exigir aprobación para acciones sensibles.',
          ],
          boundary: [
            'Límite de credenciales',
            'Guardar e inyectar secretos permitidos. Cifrar, rotar y revocar credenciales.',
          ],
          dest: [
            'Destino',
            'Recibir solo tráfico autorizado. Bloquear desvíos y auditar sin tokens.',
          ],
        },
      },
    },
  },

  // The model only ever judges a bounded evidence pack.
  soc: {
    nodes: [
      { id: 'plan', at: [0, 0], m: [0, 0] },
      { id: 'collect', at: [1, 0], m: [0, 1] },
      { id: 'pack', at: [2, 0], m: [0, 2], tone: 'accent' },
      { id: 'answer', at: [3, 0], m: [0, 3], tone: 'ink' },
      { id: 'n1', at: [0, 1], m: [1, 0], tone: 'soft' },
      { id: 'n2', at: [1, 1], m: [1, 1], tone: 'soft' },
      { id: 'n3', at: [2, 1], m: [1, 2], tone: 'soft' },
      { id: 'n4', at: [3, 1], m: [1, 3], tone: 'soft' },
    ],
    edges: [
      { from: 'plan', to: 'collect' },
      { from: 'collect', to: 'pack' },
      { from: 'pack', to: 'answer' },
      { from: 'plan', to: 'n1', arrow: false, dashed: true },
      { from: 'collect', to: 'n2', arrow: false, dashed: true },
      { from: 'pack', to: 'n3', arrow: false, dashed: true },
      { from: 'answer', to: 'n4', arrow: false, dashed: true },
    ],
    groups: [{ ids: ['n1', 'n2', 'n3', 'n4'], label: 'guard' }],
    text: {
      en: {
        nodes: {
          plan: ['Analyst and plan', 'Question, topic and time window'],
          collect: ['Evidence collection', 'Reviewed queries retrieve Wazuh data'],
          pack: ['Evidence pack', 'Facts grouped by topic and hashed'],
          answer: ['Validated answer', 'Citations and rules are checked'],
          n1: ['', "Reads use the analyst's permissions"],
          n2: ['', 'Results and missing sources are recorded'],
          n3: ['', 'The model judges a bounded pack, without tools'],
          n4: ['', 'Audit is acknowledged before publication'],
        },
        labels: { guard: 'Evidence, scope and validation' },
      },
    },
  },

  // Failures on the benchmark feed the next round of training data.
  'local-model-loop': {
    nodes: [
      { id: 'examples', at: [0, 0] },
      { id: 'tune', at: [1, 0] },
      { id: 'bench', at: [2, 0], tone: 'accent' },
      { id: 'deploy', at: [3, 0], tone: 'ink' },
    ],
    edges: [
      { from: 'examples', to: 'tune' },
      { from: 'tune', to: 'bench' },
      { from: 'bench', to: 'deploy' },
      { from: 'bench', to: 'examples', route: 'under', label: 'loop', dashed: true },
    ],
    text: {
      en: {
        nodes: {
          examples: ['Examples', 'Real cases, rules and documentation'],
          tune: ['Fine-tuning', 'Reviewed sessions train a LoRA adapter'],
          bench: ['Private benchmark', 'Compare candidates on fixed tasks'],
          deploy: ['Deployment', 'A specialist takes over when ready'],
        },
        labels: { loop: 'failures guide further training data' },
      },
      es: {
        nodes: {
          examples: ['Ejemplos', 'Casos reales, reglas y documentación'],
          tune: ['Ajuste fino', 'Sesiones revisadas entrenan una LoRA'],
          bench: ['Benchmark privado', 'Comparar modelos con tareas fijas'],
          deploy: ['Despliegue', 'El especialista asume la tarea'],
        },
        labels: { loop: 'los fallos orientan los próximos datos' },
      },
    },
  },

  // Two inputs meet at the evaluator, which decides.
  'reply-eval': {
    cell: 200,
    gap: [80, 40],
    nodes: [
      { id: 'session', at: [0, 0], m: [0, 0] },
      { id: 'draft', at: [0, 1], m: [1, 0] },
      { id: 'eval', at: [1, 0.5], m: [0.5, 1], tone: 'accent' },
      { id: 'decision', at: [2, 0.5], m: [0.5, 2], tone: 'ink' },
    ],
    edges: [
      { from: 'session', to: 'eval' },
      { from: 'draft', to: 'eval' },
      { from: 'eval', to: 'decision' },
    ],
    text: {
      en: {
        nodes: {
          session: ['Recorded session', 'Tool calls and results are captured'],
          draft: ['Draft reply', 'The model identifies claimed actions'],
          eval: ['Evaluator', 'Compare claims to the session'],
          decision: ['Decision', 'Approve supported claims or reject'],
        },
      },
      es: {
        nodes: {
          session: ['Sesión registrada', 'Se guardan llamadas y resultados'],
          draft: ['Borrador', 'El modelo identifica acciones afirmadas'],
          eval: ['Evaluación', 'Contrasta con la sesión'],
          decision: ['Decisión', 'Aprobar o rechazar según las pruebas'],
        },
      },
    },
  },

  // A staircase: each tier builds on the one below, then the assessment repeats.
  maturity: {
    gap: [64, 44],
    nodes: [
      { id: 't01', at: [0, 1.5] },
      { id: 't23', at: [1, 1] },
      { id: 't4', at: [2, 0.5], tone: 'accent' },
      { id: 'repeat', at: [3, 0], tone: 'soft' },
    ],
    edges: [
      { from: 't01', to: 't23' },
      { from: 't23', to: 't4' },
      { from: 't4', to: 'repeat' },
    ],
    text: {
      en: {
        nodes: {
          t01: ['Tiers 0 and 1', 'Foundation and basic practices'],
          t23: ['Tiers 2 and 3', 'Intermediate and advanced practices'],
          t4: ['Tier 4', 'Expert practices'],
          repeat: ['Repeat', 'Review progress and reassess'],
        },
      },
      es: {
        nodes: {
          t01: ['Niveles 0 y 1', 'Prácticas fundacionales y básicas'],
          t23: ['Niveles 2 y 3', 'Prácticas intermedias y avanzadas'],
          t4: ['Nivel 4', 'Prácticas expertas'],
          repeat: ['Repetir', 'Revisar avances y volver a evaluar'],
        },
      },
    },
  },

  // An agent retries against local checks; review findings flow back into the spec.
  'agent-loop': {
    nodes: [
      { id: 'spec', at: [0, 0] },
      { id: 'agent', at: [1, 0] },
      { id: 'checks', at: [2, 0], tone: 'accent' },
      { id: 'review', at: [3, 0], tone: 'ink' },
    ],
    edges: [
      { from: 'spec', to: 'agent' },
      { from: 'agent', to: 'checks' },
      { from: 'checks', to: 'review' },
      { from: 'review', to: 'spec', route: 'under', label: 'learn', dashed: true },
    ],
    text: {
      en: {
        nodes: {
          spec: ['Specification', 'Intent, scope and acceptance criteria'],
          agent: ['Agent', 'Works alone in an isolated worktree'],
          checks: ['Local checks', 'Lint, types and tests; retry on failure'],
          review: ['Human review', 'Change plus its test evidence'],
        },
        labels: { learn: 'findings update specs and agent context' },
      },
      es: {
        nodes: {
          spec: ['Especificación', 'Intención, alcance y criterios de aceptación'],
          agent: ['Agente', 'Trabaja solo en un worktree aislado'],
          checks: ['Comprobaciones locales', 'Lint, tipos y tests; reintenta si fallan'],
          review: ['Revisión humana', 'El cambio y sus pruebas'],
        },
        labels: { learn: 'lo aprendido actualiza specs y contexto' },
      },
    },
  },
};
