---
title: "Mantener las credenciales fuera de los agentes de IA"
date: "2026-08-01"
description: "Cómo una pasarela de salida puede intermediar el acceso de agentes de IA a las API y qué límites de seguridad siguen siendo necesarios."
tags: ["Seguridad", "Inteligencia artificial", "Identidad"]
image: "/images/blog/covers/credentials.png"
lang: "es"
translation: "keeping-credentials-out-of-ai-agents"
---

Un agente de IA puede necesitar consultar una alerta, revisar una cuenta o abrir un ticket. Cada acción cruza un límite de seguridad. Si pongo una clave de API de larga duración en el entorno del agente, el agente puede usarla, pero también cualquiera que consiga extraerla. Una inyección de instrucciones no necesita romper la autenticación de la API si logra que el agente revele un token válido.

El [artículo de Christian Posta sobre la inyección de credenciales](https://agentgateway.dev/blog/2026-07-27-credential-injection-ai-agent-egress-cb4a/) describe otra opción: mantener la credencial del servicio en un componente separado y añadirla solo cuando sale una petición autorizada. Encaja con el principio que aplico en mi [asistente de SOC basado en evidencias](/en/blog/evidence-first-ai-soc/) (en inglés): dar al modelo una tarea acotada y controlar el acceso fuera del modelo.

## Sacar la credencial del agente

Un token de portador da acceso a quien lo presenta. Una duración corta y permisos limitados reducen el daño si se filtra. Los tokens vinculados al emisor añaden una prueba asociada a una clave, pero tanto el servidor de autorización como la API receptora deben admitir y verificar esa vinculación. Muchas integraciones siguen dependiendo de claves de API o tokens de portador.

Una pasarela proxy toma otro camino. El agente se autentica ante la pasarela con su propia identidad o contexto delegado. La pasarela comprueba el destino y la acción frente a una política. Si la petición está permitida, un servicio separado facilita la credencial y la pasarela la añade a la petición saliente. La respuesta vuelve al agente sin mostrarle esa credencial.

<figure class="architecture-figure">
<picture class="diagram-light">
  <source media="(max-width: 600px)" srcset="/images/blog/credential-flow-es-mobile.svg">
  <img src="/images/blog/credential-flow-es.svg" alt="Un agente envía una petición autenticada a una pasarela. La política autoriza la petición, el almacén facilita un token y la pasarela lo añade antes de llamar a la API.">
</picture>
<picture class="diagram-dark">
  <source media="(max-width: 600px)" srcset="/images/blog/credential-flow-es-dark-mobile.svg">
  <img src="/images/blog/credential-flow-es-dark.svg" alt="Un agente envía una petición autenticada a una pasarela. La política autoriza la petición, el almacén facilita un token y la pasarela lo añade antes de llamar a la API.">
</picture>
</figure>

El agente sigue necesitando una forma de autenticarse ante la pasarela. Esa identidad también es sensible y sus permisos deben limitarse al agente y a la tarea. La diferencia es que el agente no recibe la credencial reutilizable del servicio de destino.

El [borrador de Internet Credential Broker for Agents](https://datatracker.ietf.org/doc/html/draft-hartman-credential-broker-4-agents-00) llama modelo A a este proxy. En el modelo B, el agente recibe una credencial de corta duración y alcance limitado. El borrador es un trabajo en curso, no un estándar publicado. Posta defiende que el proxy resulta especialmente útil cuando los servicios no pueden emitir o verificar tokens vinculados al emisor. La elección depende de las capacidades de cada servicio y de si merece la pena situar la pasarela en el camino de cada petición para mantener las credenciales fuera del agente.

## Qué decide realmente la pasarela

Una identidad válida indica quién llama. No explica si la petición es apropiada. Para un agente de soporte, haría que la política considere al usuario, el agente, el destino, la operación y el recurso. Leer el ticket de un cliente no equivale a exportar todos los registros de clientes. Un permiso OAuth amplio en el proveedor no convierte ambas peticiones en aceptables para la pasarela.

La decisión de la política y la entrega de la credencial cumplen funciones distintas. El motor de políticas evalúa la petición sin necesitar el secreto. El componente de entrega recupera la credencial después de una decisión favorable y no debería decidir sus propios permisos. La pasarela también necesita vincular de forma fiable esa decisión con la petición que envía. El borrador CB4A presenta esta separación como objetivo de arquitectura, no como garantía de cualquier instalación.

Por ejemplo, un analista pide contexto para una alerta. El agente solicita una operación de lectura permitida para el cliente correspondiente. La pasarela comprueba la identidad del agente y del usuario, evalúa la operación y el cliente, recupera una credencial limitada al destino y envía la petición. Si la política la deniega, devuelve el rechazo sin recuperar ni añadir el token. Si el motor de políticas no está disponible, la petición debe fallar.

Es un diseño ilustrativo. Antes de confiar en esas propiedades, comprobaría cómo identifica agentes el producto elegido, cómo vincula cada decisión a la petición y cómo protege el almacén de credenciales.

## Una identidad, dos pasos de autorización

Autenticar a un usuario ante la pasarela no le da automáticamente permiso para usar su cuenta de GitHub o de otro servicio externo. Esos servicios pueden exigir su propio consentimiento OAuth.

En el flujo de Solo Enterprise que describe Posta, el usuario inicia sesión primero mediante un proveedor de identidad. Si la pasarela no tiene una credencial para el servicio solicitado, devuelve una URL de autorización. El usuario completa el consentimiento en el navegador y el servicio de credenciales guarda los tokens asociados al usuario y al recurso. Las peticiones posteriores pueden usar esa credencial después de comprobar la política. Posta distingue este flujo comercial de las capacidades de intercambio de tokens de la pasarela de código abierto, así que revisaría las funciones disponibles en la edición que vaya a instalar.

El consentimiento no es un permiso general. La pasarela debe decidir si este agente, actuando para este usuario, puede realizar esa operación concreta. Una investigación de solo lectura no debería heredar permiso para borrar una incidencia porque el mismo usuario pueda hacerlo desde el navegador.

Conviene distinguir la primera conexión de la primera llamada. El usuario inicia sesión en el proveedor de identidad para identificarse ante la pasarela. Si la primera llamada a un servicio no tiene token guardado, la pasarela puede devolver una URL de consentimiento. El usuario autoriza la aplicación externa en su navegador y el servicio de credenciales guarda los tokens de acceso y renovación. Las llamadas posteriores buscan la credencial de ese usuario y recurso. La caducidad, los fallos de renovación, la revocación del consentimiento y la salida de un usuario de la organización necesitan un tratamiento explícito.

Posta también menciona el acceso entre aplicaciones e ID-JAG como alternativa al consentimiento individual cuando tanto el proveedor de identidad como el destino lo admiten. Eso cambia cómo se obtiene la autorización. La credencial del servicio sigue necesitando protección donde se conserve o se almacene en caché. La compatibilidad depende de cada servicio, por lo que comprobaría cada integración concreta.

## La pasarela también es un objetivo sensible

Sacar las credenciales de los agentes reduce su exposición allí, pero concentra el acceso en el intermediario. Una pasarela o un almacén comprometidos pueden exponer a varios usuarios y servicios. Trataría el intermediario como infraestructura de seguridad: aislar su acceso de red, restringir la administración, cifrar las credenciales con claves gestionadas por separado, rotar y revocar credenciales, y registrar el acceso sin registrar secretos. Separar la decisión de la política de la entrega de credenciales también limita lo que puede hacer un único componente comprometido.

El proxy tiene límites. Si un agente puede evitarlo y llegar directamente a una API, o si una herramienta expone secretos en sus respuestas o logs, queda una vía abierta. Los controles de red, las listas de destinos permitidos, TLS y el tratamiento de respuestas deben apoyar el mismo límite. Si la política o el servicio de credenciales no están disponibles, la petición debería rechazarse en vez de recurrir a una clave compartida.

Una identidad de pasarela robada todavía puede utilizarse para hacer peticiones dentro de su alcance. Un agente afectado por una inyección también puede pedir a la pasarela una acción que tiene permitida. El aislamiento de credenciales no sustituye al mínimo privilegio, la autorización por operación, la aprobación de acciones sensibles ni los registros que vinculan una petición con su usuario y su agente.

<figure class="architecture-figure">
<picture class="diagram-light">
  <source media="(max-width: 600px)" srcset="/images/blog/credential-risk-es-mobile.svg">
  <img src="/images/blog/credential-risk-es.svg" alt="Dos riesgos residuales: un agente manipulado puede abusar de acciones permitidas y un intermediario comprometido puede exponer credenciales y cuentas.">
</picture>
<picture class="diagram-dark">
  <source media="(max-width: 600px)" srcset="/images/blog/credential-risk-es-dark-mobile.svg">
  <img src="/images/blog/credential-risk-es-dark.svg" alt="Dos riesgos residuales: un agente manipulado puede abusar de acciones permitidas y un intermediario comprometido puede exponer credenciales y cuentas.">
</picture>
</figure>

### Qué probar antes de confiar en el límite

Probaría el intermediario desde la perspectiva de un agente manipulado, no solo de un cliente que actúa correctamente. Intentaría acceder a otro cliente, usar un método no autorizado, llamar a un destino fuera de la lista y repetir una petición después de revocar el acceso del usuario. Cada intento debería fallar sin devolver una credencial. También simularía una caída de la política o del almacén y comprobaría que no queda una ruta alternativa.

La respuesta merece la misma atención que la petición. Un error del servicio puede incluir una cabecera de autorización, o una herramienta puede devolver datos que el usuario no debería ver. Hay que ocultar secretos en errores y trazas, autorizar los datos devueltos y controlar los destinos a los que el agente puede enviarlos. Aunque el intermediario funcione bien, una lectura autorizada puede exponer contenido sensible al modelo o permitir que se envíe a otro destino.

En el registro de auditoría guardaría usuario y agente, destino, operación, decisión, hora e identificador de correlación. Protegería el registro frente a cambios y evitaría incluir tokens, cabeceras de autorización o cuerpos sensibles completos por defecto. Esos datos ayudan a investigar un abuso, pero no lo impiden por sí solos.

## Por dónde empezaría

Para un asistente de seguridad, empezaría con una integración de solo lectura y registraría las llamadas que necesita. Identificaría al usuario y al agente, limitaría los destinos y las operaciones, y probaría tanto una petición denegada como una permitida. Después comprobaría que los registros expliquen quién pidió acceso, qué decidió la política y qué servicio recibió la petición, sin guardar el token.

Solo entonces añadiría más integraciones o permisos de escritura. El objetivo es un límite que se pueda probar y auditar, no solo un proxy más en la arquitectura.
