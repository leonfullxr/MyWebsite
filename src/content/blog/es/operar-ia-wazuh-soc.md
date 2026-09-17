---
title: "Operar un asistente de IA en un SOC: admisión, acciones, auditoría y respuesta a incidentes"
date: "2026-07-10"
description: "Capacidad sin balanceador, acciones con aprobación humana sin credenciales permanentes, auditoría vigilada por el propio SIEM y el playbook para la peor pregunta de una plataforma multi-tenant: la mitad operativa del asistente de IA para Wazuh."
tags: ["Ciberseguridad", "IA", "SIEM", "AWS"]
lang: "es"
translation: "operating-wazuh-ai-soc"
image: "/blog/wazuh/v3-topology.png"
---

En [el primer artículo](/es/blog/asistente-ia-wazuh-poc/) recorrí el diseño de un asistente de IA para Wazuh con respuestas verificables por construcción, y la PoC autoalojada que lo demuestra. Aquel texto iba de decir la verdad; este de lo que importa cuando analistas reales dependen del asistente: capacidad sin balanceador delante del modelo, tocar infraestructura sin credenciales propias, dónde cae cada registro, y qué pasa el día que algo huele a exposición entre tenants. Todo es diseño de producción que la PoC replica a propósito; cada mecanismo tiene sitio donde trastearlo ya.

*Actualizado el 17-07-2026: la ruta de acciones con aprobación humana descrita aquí ya corre en la PoC — flujo proponer-confirmar-ejecutar contra Wazuh vivo, bajo credenciales ejecutoras de mínimo privilegio por nivel. El diseño no cambia; ya se puede trastear.*

## Sin balanceador delante del modelo

Cuando una dependencia compartida se satura, el primer instinto es balancearla; para una API de modelo gestionada ese instinto es un error de categoría. Amazon Bedrock es regional, stateless, alcanzado por PrivateLink: no hay nada entre lo que balancear, y las cuotas agregan por cuenta y región sin importar cuántas copias del backend existan. La equidad entre cientos de tenants que comparten esas cuotas no es enrutado, es admisión — y vive en la aplicación.

[![Dos posturas de despliegue compartiendo un solo código, con admisión, caché, auditoría y kill switch por entorno señalados en el lado multi-entorno](/blog/wazuh/v3-deployment-postures.png)](/blog/wazuh/v3-deployment-postures.png)

*Admisión, caché, auditoría y kill switch son propiedades por entorno de la misma puerta de enlace, sirva un tenant o muchos. Clic en cualquier diagrama para resolución completa.*

La admisión tiene tres capas sin coordinador central. Por usuario: un stream concurrente y seis turnos por minuto, clave en el subject del JWT — evita que un analista curioso deje sin servicio a su equipo. Por tenant: cuatro invocaciones concurrentes al modelo y presupuesto mensual de tokens deliberadamente blando (alerta al 80 y 100%, nunca corte), porque una herramienta de seguridad que enmudece en incidente falla en el peor momento. Por flota: throttling de cuota compartida con backoff jitter completo y cola acotada de treinta segundos con indicador de ocupado; después el asistente rechaza el turno con honestidad, en el idioma del analista.

El principio de fondo: cero degradación silenciosa en la ruta. Nada de cambio discreto a modelo barato, nada de failover automático entre regiones que movería preguntas de un tenant europeo a otra geografía. Turno rechazado dice que fue rechazado y por qué. La honestidad bajo carga es la gemela operativa de la tubería de veracidad del primer artículo.

## El modelo propone, un humano dispone

Tarde o temprano piden acción: reiniciar agente, aislar host. La regla que lo mantiene seguro es estructural, como todo en este diseño: **el backend de IA posee cero credenciales capaces de ejecutar acciones**. Lecturas libres, escrituras confirmadas, confirmación por infraestructura que el modelo no alcanza.

[![Un turno como iconos, con la ruta de escritura desviándose desde la cascada de lectura para proponer, confirmar y ejecutar bajo una credencial ejecutora por nivel](/blog/wazuh/v3-turn-flow.png)](/blog/wazuh/v3-turn-flow.png)

*La propuesta se valida y el objetivo se verifica antes de que el humano vea la tarjeta; la ejecución va bajo credencial ejecutora acotada — nunca la del modelo, nunca la de un admin permanente.*

Cuando el modelo emite `propose_action`, el backend valida contra lista blanca con esquemas, tasas y cooldowns por objetivo, sin ejecutar nada. Luego verifica el objetivo consultando el indexer como el usuario — nombre real, IP, estado del agente — de modo que la tarjeta del analista lleva hechos que el modelo no escribió. Muestra la llamada exacta a la API que correría, con razonamiento del modelo etiquetado como generado. La aprobación ejecuta bajo credencial de mínimo privilegio por nivel que el núcleo no posee — identidades distintas y acotadas para dashboard, manager y active response — con clave de idempotencia para una sola ejecución; la confirmación es paso determinista que el modelo no puede falsear. Nivel 1: reinicios de agente, cambios de grupo, ediciones de dashboard con una confirmación. Nivel 2, apagado por defecto: cambios de manager y active response; el aprobador debe retipear el nombre del objetivo.

Respuesta honesta a prompt injection en acciones: una línea de log envenenada puede, como mucho, hacer que el modelo proponga algo; la propuesta es tarjeta con hechos verificados aparte, esperando a un humano cuyos permisos controlan la ejecución. La superficie de ataque termina en una decisión que siempre fue humana.

## El SIEM vigila a la IA

Cada turno emite exactamente un evento de auditoría: usuario, tenant, herramientas invocadas con consultas compiladas, índices tocados, recuentos, ARN del modelo, tokens, acciones de guardrail, resultados de citas, latencia, estado. Lo interesante es el destino: indexer del propio tenant, bajo índices `wazuh-ai-audit-*`, con reglas Wazuh vigilándolos como cualquier otra fuente. El SIEM monitoriza su asistente: picos de bloqueos de guardrail, fallos de JWT, fallos de validación de consultas, agotamiento de presupuesto, uso fuera de horario, ráfagas de fallos en citas — cada uno una detección que avisa al mismo SOC que usa la herramienta.

En paralelo, eventos fluyen asíncronos por Firehose a bucket S3 con Object Lock y trece meses de retención, cifrado con KMS por tenant: offboarding = crypto-shred (revoca clave, archivo = ruido). CloudTrail guarda atribución AWS — identidades y acciones sin cuerpos de prompts. Una funcionalidad está apagada a propósito: registro de invocaciones Bedrock que captura prompts completos en destino único a nivel de cuenta, mezclando preguntas y evidencia de todos los tenants. La auditoría por tenant a nivel aplicación lo sustituye deliberadamente; esa elección resume la historia de cumplimiento en una frase.

## La peor pregunta que puede afrontar una plataforma

Toda plataforma multi-tenant acaba ensayando "¿pudo el tenant A ver datos del tenant B?". El playbook trata cualquier señal que haga pensable esa pregunta como P1, siempre; sus tres primeros movimientos están hechos para ser aburridos.

Congelar: el kill switch es la misma bandera que habilita el asistente; `enabled=false` es commit Git, por tenant o flota entera, ensayado en onboarding porque es mecanismo de onboarding. Preservar: nada que rescatar a prisa — el archivo S3 ya estaba bajo Object Lock antes del incidente; CloudTrail más estado de conversaciones completan la foto. Investigar: eventos por turno dicen qué usuario preguntó qué, qué consultas se compilaron, qué índices se tocaron y qué volvió; CloudTrail atribuye cada llamada AWS a rol anclado al tenant. Si la exposición se confirma, notificación por proceso de incidentes existente con plazos del artículo 33 RGPD; si no, corregir causa raíz y reactivar por olas, primero tenants internos. Incidentes de prompt injection llevan encuadre extra: el payload está en logs del cliente, así que se tría como detección sobre el entorno del cliente, no solo problema de la IA.

## Lo que me enseñó operarlo

Tres lecciones, en espejo de las del artículo de diseño. Primera: rechazo honesto gana a degradación silenciosa — "ocupado, prueba en un minuto" en tu idioma conserva confianza; degradar modelo en silencio la gasta. Segunda: kill switches solo cuentan ensayados; lo más barato es que el kill switch sea el mismo mecanismo que el onboarding ya usa. Tercera: auditoría es barata antes de necesitarla — retención Object Lock y un evento por turno cuestan poco en la tubería, y separan revisión de incidente que lee logs de una que escribe disculpas.

El artículo de diseño defendía que un asistente de SIEM gana confianza siendo comprobable. La mitad operativa repite el argumento en otra escala temporal: capacidad, acciones, auditoría e incidentes están diseñados para que el comportamiento honesto sea el único disponible. Para ver el sustrato, el [PoC autoalojado](/es/blog/asistente-ia-wazuh-poc/) es público y reproducible; si operas algo parecido, [quiero comparar notas](/es/#contact).
