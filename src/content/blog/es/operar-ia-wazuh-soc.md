---
title: "Operar un asistente de IA en un SOC: admisión, acciones, auditoría y respuesta a incidentes"
date: "2026-07-10"
description: "La mitad operativa del asistente de IA para Wazuh: capacidad sin balanceador de carga, acciones aprobadas por humanos sin credenciales permanentes, una pista de auditoría que el propio SIEM vigila, y el playbook para la peor pregunta que puede afrontar una plataforma multi-tenant."
tags: ["Ciberseguridad", "IA", "SIEM", "AWS"]
lang: "es"
translation: "operating-wazuh-ai-soc"
image: "/blog/wazuh/9-request-path.png"
---

En [el primer artículo](/es/blog/asistente-ia-wazuh-poc/) recorrí el diseño de un asistente de IA para Wazuh cuyas respuestas son verificables por construcción, y el PoC autoalojado que lo demuestra. Aquel artículo iba de conseguir que el asistente diga la verdad. Este va de todo lo que empieza a importar en cuanto analistas reales dependen de él: cómo funciona la capacidad cuando no puedes poner un balanceador delante del modelo, cómo se le permite al asistente tocar la infraestructura sin poseer jamás una credencial, dónde aterriza cada registro, y qué ocurre el día en que algo huele a exposición entre tenants. Todo lo de aquí es el diseño de producción que el PoC replica a propósito, así que cada mecanismo tiene un sitio donde ya puedes trastearlo.

## Sin balanceador delante del modelo

El primer instinto cuando una dependencia compartida se satura es balancearla, y para una API de modelo gestionada ese instinto es un error de categoría. Amazon Bedrock es un servicio regional y sin estado alcanzado por PrivateLink; no hay nada entre lo que balancear, y las cuotas se agregan por cuenta y región sin importar cuántas copias de tu backend existan. Así que la equidad entre cientos de tenants que comparten esas cuotas no es un problema de enrutado, es un problema de control de admisión, y vive en la aplicación.

[![La ruta de la petición con autenticación en cada salto, y las tres capas de admisión que sustituyen a un balanceador hacia el modelo](/blog/wazuh/9-request-path.png)](/blog/wazuh/9-request-path.png)

*Autenticación en cada salto, y un presupuesto de timeouts que anida cada etapa dentro de la ventana de inactividad del balanceador. Haz clic en cualquier diagrama para verlo a resolución completa.*

La admisión tiene tres capas y ningún coordinador. Por usuario: un stream concurrente y seis turnos por minuto, con clave en el subject del JWT, lo que impide que un analista curioso deje sin servicio a su propio equipo. Por tenant: cuatro invocaciones concurrentes al modelo y un presupuesto mensual de tokens deliberadamente blando, es decir, que alerta al 80 y al 100 por ciento y nunca corta a un tenant, porque una herramienta de seguridad que enmudece durante un incidente ha fallado en el peor momento posible. Y por flota: el throttling de la cuota compartida se absorbe con backoff de jitter completo y una cola acotada de treinta segundos con indicador de ocupado, tras lo cual el asistente rechaza el turno honestamente, en el idioma del analista.

El principio de fondo es que no hay degradación silenciosa en ninguna parte de la ruta. Ningún cambio discreto a un modelo más barato, ningún failover automático entre regiones que movería las preguntas de un tenant europeo a otra geografía. Un turno rechazado dice que fue rechazado y por qué. La honestidad bajo carga es la gemela operativa de la tubería de veracidad del primer artículo.

## El modelo propone, un humano dispone

Tarde o temprano a todo asistente se le pide hacer algo: reinicia ese agente, aísla ese host. La regla que mantiene esto seguro es estructural, como todo lo demás en este diseño: **el backend de IA posee cero credenciales capaces de ejecutar acciones**. Las lecturas son libres, las escrituras se confirman, y la ruta de confirmación atraviesa infraestructura que el modelo no puede alcanzar.

[![El flujo de aprobación de acciones: validar, verificar el objetivo de forma independiente, renderizar una tarjeta, aprobación humana y ejecución bajo el RBAC del propio aprobador](/blog/wazuh/10-action-approval.png)](/blog/wazuh/10-action-approval.png)

*La propuesta se valida y su objetivo se verifica antes de que un humano vea la tarjeta, y la ejecución ocurre bajo los permisos del propio aprobador, no los de la IA.*

Cuando el modelo emite una llamada a la herramienta `propose_action`, el backend la valida contra una lista blanca de acciones con esquemas, tasas y cooldowns por objetivo, sin ejecutar nada. Después verifica el objetivo de forma independiente, consultando el indexer como el usuario para obtener el nombre real, la IP y el estado del agente, de modo que la tarjeta que ve el analista contiene hechos que el modelo nunca escribió. La tarjeta muestra la llamada exacta a la API que se ejecutaría, con el razonamiento del modelo claramente etiquetado como generado por el modelo. La aprobación se ejecuta a través del cliente de la API de Wazuh que el dashboard ya tiene, con `run_as`, lo que significa que el RBAC del propio aprobador decide si la acción está permitida, con una clave de idempotencia que garantiza una única ejecución. El nivel 1 cubre reinicios de agente y cambios de grupo con un clic; el nivel 2, apagado por defecto, cubre actualizaciones de agente y active response, y exige que el aprobador vuelva a teclear el nombre del objetivo.

Esta es también la respuesta honesta a la inyección de prompts en el terreno de las acciones. Una línea de log envenenada puede, como mucho, hacer que el modelo proponga algo, y una propuesta es una tarjeta con hechos obtenidos de forma independiente, esperando a un humano cuyos propios permisos controlan la ejecución. La superficie de ataque termina en una decisión que siempre fue de un humano.

## El SIEM vigila a la IA

Cada turno emite exactamente un evento de auditoría: usuario, tenant, herramientas invocadas con sus consultas compiladas, índices tocados, recuentos de resultados, ARN del modelo, tokens, acciones de guardrail, resultados de las citas, latencia y estado. Dónde aterrizan esos eventos es la parte interesante, porque el destino es el indexer del propio tenant, bajo índices `wazuh-ai-audit-*`, y las reglas de Wazuh los vigilan como cualquier otra fuente de logs. El SIEM monitoriza a su propio asistente: picos de bloqueos de guardrail, fallos de validación de JWT, fallos de validación de consultas, agotamiento de presupuesto, uso fuera de horario, ráfagas de fallos en la verificación de citas, cada uno una detección que avisa al mismo SOC que usa la herramienta.

[![El mapa de auditoría: eventos por turno hacia el indexer del tenant con reglas del SOC encima, archivo asíncrono en S3 con Object Lock y KMS por tenant, y el registro de invocaciones de Bedrock deliberadamente apagado](/blog/wazuh/11-audit-map.png)](/blog/wazuh/11-audit-map.png)

*Dos destinos por evento: el indexer del propio tenant para detección en vivo, y un archivo inmutable para forense. Una funcionalidad de AWS permanece apagada a propósito.*

En paralelo, los eventos fluyen asíncronamente por Firehose hacia un bucket de S3 con Object Lock y trece meses de retención, cifrado con una clave KMS por tenant, lo que convierte el offboarding en un crypto-shred: revoca la clave y el archivo es ruido. CloudTrail conserva la atribución del lado de AWS, identidades y acciones sin cuerpos de prompts. Y una funcionalidad está apagada por diseño: el registro de invocaciones de modelo de Bedrock, que captura los cuerpos completos de los prompts en un único destino a nivel de cuenta, mezclaría las preguntas y la evidencia de todos los tenants en un solo sitio. La auditoría por tenant a nivel de aplicación lo sustituye deliberadamente, y esa elección es la historia de cumplimiento en una frase.

## La peor pregunta que puede afrontar una plataforma

Toda plataforma multi-tenant acaba ensayando la pregunta "¿pudo el tenant A ver los datos del tenant B?". El playbook trata cualquier señal que haga pensable esa pregunta como P1, siempre, y sus tres primeros movimientos están diseñados para ser aburridos.

[![El flujo de respuesta a incidentes: congelar con el kill switch, preservar la evidencia ya inmutable, investigar con la auditoría por turno, y después notificar o corregir y reactivar por olas](/blog/wazuh/12-incident-response.png)](/blog/wazuh/12-incident-response.png)

*Congelar, preservar, investigar. La evidencia era inmutable antes de que nadie la necesitara, y ese es exactamente el objetivo.*

Congelar: el kill switch es la misma bandera que habilita el asistente, así que `enabled=false` es un commit de Git, por tenant o para toda la flota, y se ensayó durante el onboarding porque es el mecanismo del onboarding. Preservar: no hay nada que rescatar a toda prisa, porque el archivo de S3 estaba bajo Object Lock antes de que el incidente existiera, y CloudTrail más el estado de las conversaciones completan la imagen. Investigar: los eventos de auditoría por turno dicen exactamente qué usuario preguntó qué, qué consultas se compilaron, qué índices se tocaron y qué volvió, con CloudTrail atribuyendo cada llamada de AWS a un rol anclado al tenant. Si la exposición se confirma, la notificación corre por el proceso de incidentes existente con los plazos del artículo 33 del RGPD; si no, se corrige la causa raíz y el asistente se reactiva por olas, primero los tenants internos. Y los incidentes de inyección de prompts reciben un encuadre extra: el payload está en los logs del propio cliente, así que se tría como una detección sobre el entorno del cliente, no solo como un problema de la IA.

## Lo que me enseñó operarlo

Tres lecciones, en espejo de las tres del artículo de diseño. Primera, el rechazo honesto gana a la degradación silenciosa: un asistente que dice "ocupado, prueba en un minuto" en tu propio idioma conserva la confianza, y uno que degrada el modelo en silencio la gasta. Segunda, los kill switches solo cuentan si se ensayan, y el ensayo más barato es hacer que el kill switch sea el mismo mecanismo que el onboarding ya usa. Tercera, la auditoría solo es barata antes de necesitarla: la retención con Object Lock y un evento por turno no cuestan casi nada de construir en la tubería, y son la diferencia entre una revisión de incidente que lee logs y una que escribe disculpas.

El artículo de diseño defendía que un asistente para un SIEM se gana la confianza siendo comprobable. La mitad operativa es el mismo argumento a otra escala de tiempo: capacidad, acciones, auditoría y respuesta a incidentes están diseñadas para que el comportamiento honesto sea el único disponible. Si quieres ver el sustrato sobre el que corre todo esto, el [PoC autoalojado](/es/blog/asistente-ia-wazuh-poc/) es público y reproducible, y si operas algo parecido, [quiero comparar notas](/es/#contact).
