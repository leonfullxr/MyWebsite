---
title: "Mantener las credenciales fuera de los agentes de IA, parte 2: proteger el almacén de tokens"
date: "2027-02-17"
description: "Cuando una pasarela de salida guarda todos los tokens, la pregunta es cuánto de ese almacén puede leer un controlador comprometido y qué hace falta para impedir un descifrado silencioso."
tags: ["Seguridad", "Inteligencia artificial", "Identidad"]
image: "/images/blog/covers/token-vault.png"
lang: "es"
translation: "protecting-the-token-vault"
---

En la [parte 1](/es/blog/credenciales-fuera-agentes-ia/) sostuve que una clave de API de larga duración en el entorno de un agente es un mal sitio para una credencial. Un diseño mejor es el que [Christian Posta](https://agentgateway.dev/blog/2026-07-27-credential-injection-ai-agent-egress-cb4a/) y el [borrador Credential Broker for Agents](https://datatracker.ietf.org/doc/html/draft-hartman-credential-broker-4-agents-00) llaman un proxy: el agente se autentica ante una pasarela de salida, la pasarela aplica la política y solo entonces se añade el token real a la petición saliente.

Ese diseño saca el token de la memoria del modelo. No lo hace desaparecer. Traslada el token de GitHub, el de Slack y la clave de cada API al almacén de la pasarela. El borrador es claro sobre la consecuencia: el intermediario pasa a ser el objetivo de más valor de la arquitectura. La continuación de Posta, [Credential Injection Patterns for AI Agents: Part 2, Securing the Vault](https://agentgateway.dev/blog/2026-08-03-protecting-token-vault-kms-credential-injection/), plantea la pregunta con la que yo empezaría una vez existe ese almacén:

Cuando el proceso que guarda el almacén de tokens está completamente comprometido, ¿cuánto de ese almacén puede leer el atacante?

«Ciframos en reposo» no responde a esa pregunta. Si el mismo proceso tiene el texto cifrado y la capacidad de descifrarlo, comprometer ese proceso es comprometer el almacén. Posta cita el [incidente de cadena de suministro de LiteLLM](https://docs.litellm.ai/blog/security-update-march-2026) como el tipo de fallo que este diseño debería resistir: un atacante que llega al componente que puede obtener las claves. No he reproducido ese incidente, y no presento su laboratorio ni su producto como un resultado mío. Lo que sigue es su diseño de tres modos, expuesto con mis palabras, más el modelo de amenazas, las alternativas y los modos de fallo que exigiría antes de confiar en el almacén.

## El almacén es ahora el objetivo de más valor

En la arquitectura que Posta describe para Solo Enterprise y agentgateway, dos componentes están en el camino de una llamada del agente. La pasarela, el plano de datos, termina la conexión, aplica la política y pide una credencial cuando la llamada está permitida. Un controlador ejecuta el servicio de tokens, hace el intercambio y es dueño del almacén. Es el proceso que tiene que tocar el texto en claro: abre una fila y entrega esa credencial a la pasarela para que la ponga en tránsito.

Ese último paso importa para el modelo de amenazas. La pasarela queda dentro del límite de confidencialidad del token que una petición en curso está usando. Tiene que ser así; si no, no puede inyectar la cabecera. Lo que el diseño del almacén intenta proteger es todo lo demás en el momento del compromiso: las credenciales de otros usuarios, y las de este usuario para otros recursos.

Una inyección en el prompt que intente extraer un token del agente debería fallar en este diseño, porque el agente no lo ha recibido. Esa es la ganancia de la parte 1. No impide que un agente manipulado pida a la pasarela una acción que ya tiene permitida, y no reduce el almacén si el controlador cae en manos de un atacante.

## El cifrado de sobre es necesario, no suficiente

Un almacén útil cifra cada credencial en dos capas. Una clave de cifrado de datos, generada de nuevo en cada escritura, cifra el material del token: el de acceso, el de renovación y el de identidad, si se guardan juntos. Una clave de encapsulado envuelve después esa clave corta. Leer una fila implica desenvolver primero la clave de datos y luego abrir la carga.

La clave de encapsulado solo cifra una clave corta, nunca el JSON del token, así que puede vivir en un servicio al que el controlador no llega. Ambas capas deberían vincular su texto cifrado a un contexto, por ejemplo un propietario estable derivado del identificador del usuario en el proveedor de identidad y el recurso de destino. Si esa vinculación se comprueba al descifrar, el texto cifrado no puede copiarse de la fila de GitHub de Alicia a la de Roberto, ni de un recurso a otro, sin que falle la etiqueta de autenticación.

Esto es cifrado de sobre habitual. Responde a «¿qué ocurre si alguien roba el fichero de la base de datos?». Por sí solo no responde a la pregunta de Posta. Lo que queda es quién puede desenvolver una clave de datos, y si ese permiso es permanente, silencioso y usable sin conexión.

## Tres formas de guardar la clave de encapsulado

Posta compara tres modos, con AWS KMS como ejemplo y dejando HashiCorp Vault u OpenBao para un artículo posterior. Otros servicios de KMS pueden cumplir el mismo papel. Los modos se distinguen por un solo hecho: lo lejos que queda el «sí» al descifrado del proceso que guarda el texto cifrado.

En el primer modo, la clave de encapsulado es un secreto del mismo clúster que el controlador, a menudo un Secret de Kubernetes leído al arrancar y usado para envolver y desenvolver con AES-GCM en local. Una base de datos robada, por sí sola, sigue siendo texto cifrado. Un controlador comprometido no. Quien pueda leer ese secreto —la cuenta de servicio del controlador, un administrador del clúster, una copia de etcd, un nodo con el token proyectado— tiene la clave maestra y puede descifrar todo el almacén sin conexión, incluidas las filas que se escriban después, sin un registro de auditoría útil y sin forma de anular la filtración de la clave. Posta lo trata como un valor por defecto para demostraciones, no como un diseño de producción, y estoy de acuerdo.

En el segundo modo, la clave de encapsulado no sale de una clave de cliente en KMS. El controlador envuelve y desenvuelve llamando al servicio gestionado, y pasa el contexto de cifrado de cada fila para que el servicio lo autentique y lo registre. La clave maestra ya no está en el clúster, en etcd, en una copia de seguridad ni en la memoria del controlador. Cada unwrap pasa a ser un evento controlado por identidad, auditable y revocable, una llamada cada vez.

Eso es una mejora real, y también es fácil de sobreestimar. KMS no impide que un controlador comprometido descifre el almacén. Impide que lo haga en silencio, de forma masiva y sin conexión. El controlador sigue teniendo permiso permanente de descifrado. Un atacante activo puede recorrer la tabla, una llamada cada vez, dentro de los límites de ritmo y de las alertas que existan. Esas llamadas deberían aparecer en el registro de KMS, y se puede desactivar la clave, pero el diseño ha convertido un golpe rápido en una operación viva y observable. Si «detectable y revocable» es el modelo de amenazas que se está dispuesto a aceptar, es un punto de parada honesto. No es prevención.

El tercer modo quita por completo el permiso permanente de descifrado al controlador. El controlador sigue guardando el texto cifrado, y sigue siendo el único componente que puede figurar como destinatario de una operación de descifrado, pero no puede pedir a KMS que abra una fila por sí solo. Un intermediario aparte, en otro dominio de confianza, tiene el derecho de emitir una concesión de corta duración y acotada a esa fila. El intermediario no tiene base de datos, ni texto cifrado, ni capacidad de descifrar. Antes de emitir la concesión, vuelve a verificar el token de sujeto del usuario, comprueba una prueba de vigencia de corta duración firmada por la pasarela y calcula él mismo el valor de propietario. KMS entonces impide que una concesión emitida para la fila de GitHub de Alicia abra una fila sellada para Roberto.

Ninguna de las dos partes puede leer una credencial por sí sola. El intermediario puede autorizar, pero no desenvolver. El controlador solo puede desenvolver con una concesión que no puede emitir. Si el intermediario también está comprometido, el atacante puede emitir concesiones para cualquier propietario, y el diseño se acerca de nuevo al modo 2. El coste extra es latencia, superficie operativa y un componente nuevo que hay que proteger con el mismo rigor que el almacén.

<figure>
  <img src="/diagrams/protecting-the-token-vault.svg" width="1190" height="892" alt="Una pasarela de salida envía una petición a un controlador que solo guarda texto cifrado. Un intermediario aprueba el unwrap en AWS KMS y devuelve una clave de datos, y el controlador entrega un token de acceso a la pasarela.">
  <figcaption>En el modo 3 el controlador solo guarda texto cifrado. Un intermediario distinto tiene que aprobar cada unwrap antes de que vuelva una clave de datos, y la pasarela es el único proceso que pone un token de acceso en tránsito. Los radios de impacto siguen el análisis de Posta de agosto de 2026. El rosa marca un token en claro; el candado marca el texto cifrado.</figcaption>
</figure>

Una política estática de KMS no sustituye a ese intermediario. Cuando el controlador llama a KMS, KMS autentica la identidad de la carga de trabajo del controlador, no la del usuario final. Una política puede fijar el contexto de cifrado a una constante. No puede expresar «el propietario debe ser el usuario de esta petición», porque en ese camino nadie ha verificado al usuario. El mismo límite se aplica a un montaje de Vault que el controlador puede leer por completo. Un alcance por petición y por usuario necesita un principal que vuelva a verificar al usuario y luego emita una concesión restringida. Ese principal es el intermediario.

## Un modelo de amenazas para el almacén

Dejaría por escrito las amenazas antes de elegir un modo.

Una inyección en el prompt que intente robar un token del agente es el caso para el que está hecha la parte 1. Si el aislamiento funciona, no hay token de destino en el agente que extraer. Lo que queda es más habitual: el agente todavía puede invocar cualquier operación que la política ya permita, y puede mover datos que se le permitió leer. Endurecer el almacén no sustituye al mínimo privilegio, a la aprobación de acciones sensibles ni a los controles sobre la respuesta.

Un agente comprometido es el mismo residuo, solo que más duradero. El atacante tiene una identidad de carga de trabajo en la que la pasarela confía, mientras esa identidad sea válida. Aquí importan la revocación y las credenciales de corta duración del agente. No reducen el almacén.

Una pasarela comprometida puede ver el token que va a inyectar. Eso es inherente a la inyección de credenciales. El objetivo es limitar esa exposición a la petición en curso, no pretender que el plano de datos pueda quedar fuera del límite de confidencialidad.

Un controlador comprometido es la pregunta de Posta. El modo 1 pierde todo el almacén, sin conexión y sin una auditoría útil. El modo 2 pierde el almacén mientras el atacante siga activo y las llamadas de descifrado se sigan permitiendo, pero debería poder verse y debería poder desactivarse la clave. El modo 3 pretende que un compromiso solo del controlador no baste para recorrer la tabla.

Un intermediario de concesiones comprometido es el siguiente dominio de confianza. No debería guardar texto cifrado. Si puede emitir concesiones arbitrarias, un segundo compromiso devuelve a un mundo en el que el descifrado es posible para cualquier propietario. La identidad del intermediario, su política y su capacidad de hablar con KMS tienen que ser más estrechas que «emitir cualquier cosa».

La rotación y la revocación de claves hay que diseñarlas, no darlas por hechas. Rotar una clave de encapsulado debería volver a envolver las claves de datos sin dejar un periodo en el que las envolturas antiguas sigan siendo legibles en silencio con una clave retirada. Revocar el acceso de un usuario debería detener nuevas concesiones, y no debería dejar útil en el controlador una clave de datos en caché o un token de renovación todavía válido. La nota posterior de Posta, [dónde dejan de escalar las concesiones de KMS](https://agentgateway.dev/blog/2026-10-20-credential-brokering-mode-3-at-scale/), importa aquí: un controlador en modo 3 que abre una fila en uso sigue viendo el texto en claro de esa fila, y si la carga incluye un token de renovación, esa filtración puede durar más que el token de acceso. Trataría los tokens de renovación y los secretos de cliente como un problema aparte, no como algo que el modo 3 resuelve por sí solo.

La auditoría tiene que cubrir más que «se llamó a KMS». Guardaría el usuario y la carga de trabajo, el destino y la operación, la decisión de la política, un identificador de correlación y el contexto de cifrado, sin tokens ni cabeceras de autorización en el registro. La traza de KMS es lo que hace visibles los descifrados de los modos 2 y 3. No sustituye a un registro de aplicación que pueda explicar por qué se abrió esa fila.

## Alternativas y sus compromisos

Las variables de entorno y los ficheros de secretos montados no superan la prueba de la parte 1: el proceso del agente puede leer la credencial, y también puede hacerlo cualquier cosa que comparta su entorno, su imagen o sus logs.

Un sidecar que inyecta un token justo antes de una llamada puede parecerse a una pasarela, pero el token suele acabar en el mismo dominio de confianza que el modelo o la herramienta. Si el sidecar solo es una forma cómoda de entregar el secreto al agente, el radio de impacto no se ha movido. Si el sidecar es quien hace la llamada al servicio, se ha convertido en una pasarela pequeña y debería diseñarse como tal.

La identidad de carga de trabajo y OIDC, incluida IRSA o un equivalente, son la forma correcta de que el controlador y el intermediario se autentiquen ante KMS o Vault. Por sí solas no son una forma de entregar a un agente un token de GitHub. La mayoría de las API que necesita un asistente de investigación siguen esperando un token delegado por el usuario o de aplicación, no el rol de nube del agente. La federación ayuda donde el destino puede aceptarla. No elimina el almacén para los destinos que no pueden.

SPIFFE y otras identidades de carga de trabajo encajan bien para que la pasarela y el intermediario demuestren qué proceso está llamando. La prueba de vigencia de Posta se firma con el SVID de la pasarela para que un controlador comprometido no pueda fabricar por sí solo un «esta petición está viva». Eso complementa el almacén. No sustituye al cifrado de sobre ni a quitar el permiso permanente de descifrado al proceso que guarda el texto cifrado.

Un clúster compartido de Vault u OpenBao es un sitio razonable para la clave de encapsulado si así es como el entorno ya protege los secretos. Posta sigue ese camino en la [parte 3](https://agentgateway.dev/blog/2026-11-02-protecting-token-vault-openbao-credential-injection/). La prueba de arquitectura no cambia: ¿puede el controlador descifrar todo el montaje con su propia identidad, o un componente de política distinto tiene que aprobar cada unwrap?

## Modos de fallo que no pasaría por alto

Si el proveedor de identidad cambia el identificador de sujeto que emite, las filas vinculadas al sujeto anterior no se abrirán hasta que el usuario vuelva a autorizar. Es preferible a una vinculación tan laxa que el texto cifrado pueda moverse entre usuarios, pero hace falta un procedimiento operativo, no una interrupción por sorpresa.

Si el intermediario, KMS o el camino de la prueba de vigencia no están disponibles, la petición debería rechazarse. Un recurso a una clave de encapsulado local, o a un permiso permanente de descifrado, devuelve al modo 1 o 2 precisamente cuando menos se puede vigilar el sistema.

Una prueba de vigencia que pueda reutilizarse, o una concesión que siga válida el tiempo suficiente para aplicarse a otra fila, debilita el modo 3. La prueba debería ser de corta duración, estar vinculada al usuario y al recurso, y usarse una sola vez. La concesión debería retirarse después del unwrap.

Una caché de claves de datos en el controlador, incluso como «optimización», reintroduce un descifrado permanente para cada fila ya abierta. Un proceso comprometido también cacheará lo que quiera, que es una razón más para no guardar tokens de renovación en la misma carga que el token de acceso.

Las filas trampa y las alertas de ritmo de descifrado hacen el modo 2 mucho más honesto. No lo convierten en modo 3. Las seguiría plantando. No trataría un registro silencioso como prueba de que el almacén no se ha leído.

<aside role="note" style="margin-block: 2rem; padding: 1rem 1.2rem; border: 1px solid var(--post-line); border-radius: 14px; background: color-mix(in srgb, var(--post-accent) 7%, var(--post-surface));">
<p style="margin: 0 0 0.35rem; font-family: var(--font-display); font-size: 0.78rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--post-accent);">Aún por registrar</p>
<p style="margin: 0; font-size: 0.98rem; line-height: 1.6; color: var(--post-text);">Todavía no he construido este camino de almacén delante de mi propio asistente de Wazuh, y no voy a rellenar esta sección con tiempos o volúmenes de descifrado inventados. Cuando lo haga, registraré si un compromiso solo del controlador puede recorrer el almacén en cada modo, si una petición denegada o reutilizada llega a provocar un descifrado en KMS, si una caída del intermediario o de KMS se rechaza en cerrado, y si los registros pueden explicar el unwrap sin contener un token.</p>
</aside>

## Por dónde empezaría

Para el mismo asistente de solo lectura que describí en la parte 1, no me detendría en «el agente no ve el token». Preguntaría cómo está envuelto el almacén, quién puede abrir una fila y qué obtiene en realidad el compromiso de ese proceso. Si la clave de encapsulado vive junto al texto cifrado, lo trataría como una demostración. Si vive en KMS o en Vault pero el controlador tiene permiso permanente de descifrado, exigiría auditoría, alertas, revocación y un residuo honesto: el almacén en uso sigue siendo legible. Si ese residuo es demasiado grande, el siguiente paso es un segundo dominio de confianza que tenga que aprobar cada unwrap y no pueda leer el almacén por sí mismo.

Seguiría empezando con una integración, un camino denegado y registros que se puedan mostrar a otra persona. El diseño del almacén es lo que hace que ese límite merezca la concentración de riesgo que la parte 1 aceptó.

Un [tercer artículo de esta serie](/es/blog/escalar-el-almacen-de-tokens/) examina qué ocurre cuando ese diseño tiene que funcionar al ritmo de cada llamada a una herramienta, y las credenciales que el modo 3 sigue sin poder proteger: las que están en uso, y los tokens de renovación que viajan con ellas.
