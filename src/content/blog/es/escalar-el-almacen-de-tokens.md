---
title: "Mantener las credenciales fuera de los agentes de IA, parte 3: escalar el almacén sin ampliar la filtración"
date: "2027-03-03"
description: "Las concesiones de KMS pueden quitar el descifrado permanente al controlador, pero no siguen el ritmo de cada llamada a una herramienta y no protegen las credenciales que ya están en uso."
tags: ["Seguridad", "Inteligencia artificial", "Identidad"]
image: "/images/blog/covers/token-vault-scale.png"
lang: "es"
translation: "scaling-the-token-vault"
---

En la [parte 2](/es/blog/proteger-el-almacen-de-tokens/) seguí los tres modos de [Christian Posta](https://agentgateway.dev/blog/2026-08-03-protecting-token-vault-kms-credential-injection/) para proteger el almacén de tokens detrás de una pasarela de salida. El diseño que yo querría es el tercero: el controlador guarda el texto cifrado y no tiene permiso permanente de descifrado, y un intermediario distinto tiene que aprobar cada unwrap. Las filas inactivas deberían seguir sin poder leerse si solo cae el controlador.

Esa propiedad merece conservarse. No es el final del diseño. La continuación de Posta, [Credential Injection Patterns for AI Agents: Part 2.5, Where KMS Grants Stop Scaling](https://agentgateway.dev/blog/2026-10-20-credential-brokering-mode-3-at-scale/), cambia dos recomendaciones del final de aquel artículo. La primera es operativa: la concesión de KMS que sostiene la separación no aguanta una carga real, y las soluciones evidentes devuelven el descifrado permanente. La segunda es una afirmación más estrecha sobre el compromiso. Un atacante que se queda en el controlador no necesita recorrer el almacén. Cada llamada legítima a una herramienta le acabará entregando una credencial en claro, y si un token de renovación viaja en la misma carga, esa filtración dura más que el token de acceso.

No he ejecutado estas cuotas ni esta arquitectura delante de mi propio asistente de Wazuh. Lo que sigue es su argumento, expuesto con mis palabras, más el modelo de amenazas y los modos de fallo que exigiría antes de dar el modo 3 por terminado.

## La concesión se convierte en el techo

En el diseño basado en concesiones, cada intercambio correcto son tres llamadas a KMS: crear una concesión, descifrar y retirar la concesión. Posta señala aquí las cuotas por defecto de KMS, no una medición de su propio producto. CreateGrant y RetireGrant empiezan en 50 peticiones por segundo, por cuenta y por región. El Decrypt simétrico está mucho más alto, del orden de 10.000 a 100.000 por segundo según la región. Las cuotas se pueden ajustar, pero el ritmo de emisión sigue siendo el techo de todo el sistema, y es un techo que se comparte con cualquier otro servicio de AWS en la cuenta que emita concesiones. Él pone como ejemplo la conexión de volúmenes EBS cifrados. Una pasarela empresarial compartida que intercambia un token en cada llamada a una herramienta alcanzará 50 peticiones por segundo mucho antes que un límite de descifrado.

Las concesiones también son duraderas. No caducan por sí solas. Alguien tiene que retirarlas, y cada clave admite como máximo 50.000. Si el intermediario se cae, si RetireGrant se ve limitado o si el camino de retirada tiene un error, las concesiones quedan atrás. Con el techo de emisión por defecto, apunta Posta, esa clave se llena en unos 17 minutos. Después, CreateGrant devuelve un error de límite y falla cada intercambio de tokens del entorno. El fallo más silencioso es peor para el modelo de amenazas. Toda concesión que no se retira es una fila que el controlador puede descifrar más tarde sin volver a pedir permiso. Un camino de retirada que falla en segundo plano ha vuelto hacia el modo 2 en esas filas, o ha tirado abajo la pasarela por completo.

Guardar concesiones en caché, o ampliarlas a una sesión, parece un arreglo evidente. También es la forma de que regrese el descifrado permanente. Lo que hacía el modo 3 más estricto que el modo 2 era que el controlador no podía abrir una fila sin un sí fresco y acotado. Una concesión de larga duración es ese sí, dejado sobre la mesa.

## Que el intermediario desenvuelva la clave de datos

La concesión es solo una forma de impedir que el controlador llame a descifrar. La variante que Posta usaría en su lugar es cambiar quién hace esa llamada. El intermediario obtiene permiso permanente de descifrado, pero nunca guarda la base de datos ni el texto cifrado. El controlador conserva el texto cifrado y pierde por completo el permiso de descifrado. Ninguno de los dos puede leer una fila por sí solo. En vez de emitir una concesión y devolverla, el intermediario desenvuelve él mismo la clave de datos y se la entrega al controlador.

El controlador envía el token de sujeto, la prueba de vigencia, el recurso, el identificador de elicitación y la clave de datos envuelta. No envía la carga cifrada del token, así que el intermediario ve material de clave, no una credencial. El intermediario sigue haciendo las comprobaciones de la parte 2: vuelve a verificar el token de sujeto contra el proveedor de identidad, comprueba la prueba de vigencia de corta duración de la pasarela, impone un identificador de un solo uso y evalúa la política. Después calcula el propietario a partir del sujeto que acaba de verificar y llama a KMS con ese contexto de cifrado. Si el controlador presenta el token de Alicia y la clave envuelta de Roberto, la vinculación de propietario debería fallar en KMS, igual que lo habría hecho con una concesión.

La traza de auditoría es más limpia en un aspecto. El descifrado ocurre ahora solo bajo la identidad del intermediario. Una llamada de descifrado desde el controlador no es un intercambio normal; es una señal. Sigue haciendo falta el registro de decisiones del intermediario, y sigue haciendo falta cruzarlo con la traza de KMS por propietario, recurso e identificador de correlación, sin tokens en ninguno de los dos registros.

La clave de datos vuelve por la conexión autenticada entre el intermediario y el controlador. El controlador abre la capa interior, entrega el token al destino a la pasarela y debería poner a cero la clave de datos. Una clave de datos pertenece a una fila y a una escritura, así que retenerla durante una petición debería dar exactamente una credencial. Ese es el residuo honesto de esta variante, y también el comienzo del siguiente problema.

<figure>
  <img src="/diagrams/scaling-the-token-vault.svg" width="1190" height="892" alt="En el camino caliente, una pasarela envía una petición a un controlador que guarda el texto cifrado de los tokens de acceso. El intermediario, con descifrado permanente, desenvuelve una clave de datos en AWS KMS y se la devuelve, y el controlador entrega un token de acceso a la pasarela.">
  <figcaption>Las concesiones se quedan fuera del camino caliente. El intermediario desenvuelve la clave de datos él mismo, y el controlador se limita a tokens de acceso de corta duración. Las cuotas por defecto de las concesiones de KMS que motivan este camino siguen el análisis de Posta de octubre de 2026. El rosa marca un token en claro; el candado marca el texto cifrado.</figcaption>
</figure>

## Las filas que el intermediario no puede proteger

La parte 2 preguntaba cuánto del almacén puede leer un atacante cuando el proceso que lo guarda está completamente comprometido. La respuesta del modo 3, incluida esta variante, sigue siendo «solo lo que el intermediario autorice ahora, para este usuario, en esta fila», para las filas que no se están usando. Esa parte sigue siendo correcta, y sigue siendo una mejora real respecto al modo 2. En una instalación grande, la mayoría de los usuarios están inactivos en un momento dado, y esas filas deberían permanecer cerradas.

El atacante que controla el controlador no tiene que abrir el resto del almacén. El controlador está en el camino caliente de cada intercambio legítimo. Si espera, el token de cada usuario activo pasará por ese proceso en claro. En una pasarela compartida que intercambia en cada llamada, el argumento de Posta es que esto ocurre en una escala de horas, no de un golpe breve, y que a menudo los atacantes no se detectan en esas horas.

También es peor que ver pasar tokens de acceso. La clave de datos se crea por escritura, no por petición. Una vez que el controlador ha abierto la fila de GitHub de Alicia, puede retener esa clave hasta que una renovación reescriba la fila, y un proceso comprometido cacheará lo que quiera. La carga que abre esa clave suele ser toda la respuesta del token: el de acceso, el de renovación y el de identidad, y, en el flujo que él describe, el secreto de cliente de OAuth que el controlador usó cuando el usuario autorizó el destino por primera vez. Con un token de renovación, el atacante puede emitir nuevos tokens de acceso después de que el original haya desaparecido del controlador. Una fila vista una sola vez sigue siendo útil hasta que alguien revoque el token de renovación en el proveedor.

Así que la afirmación del final de la parte 2 necesita el mismo recorte que Posta aplicó a la suya. El modo 3 impide un recorrido masivo y sin conexión de las filas que no están en uso durante el compromiso. Las filas que sí lo están se filtran al ritmo en que se usan, y un token de renovación en la misma carga hace duradera cada una de esas filtraciones. «Impide el descifrado masivo» era la meta equivocada. Lo que el atacante puede leer en el momento del compromiso es una cosa. Cuánto se filtra depende de cuánto tiempo se quede, y de qué más se guardaba junto al token de acceso.

## Sacar el token de renovación del camino caliente

Los tokens de acceso mueren por sí solos, en un plazo que fija el proveedor. Posta cita ejemplos habituales: un token de usuario a servidor de una GitHub App de ocho horas si se activa la caducidad, un token de acceso de Slack de doce horas con rotación, un token de OAuth de Google Cloud de aproximadamente una hora. Un atacante que solo recoja tokens de acceso está al menos acotado por esa caducidad. Un atacante que recoja tokens de renovación solo tiene que ver a cada usuario una vez.

El diseño que añade es un cuarto componente, el renovador. Guarda los tokens de renovación y los secretos de cliente de OAuth. Es también el cliente OAuth que completa el intercambio del código de autorización, de modo que el controlador tampoco ve la respuesta completa del token en el momento de crearla. Su almacén está envuelto de la misma forma, y un intermediario tiene que aprobar cada unwrap. Su única salida es un token de acceso nuevo para una fila. Un token de renovación no sale del renovador, ni hacia el controlador, ni hacia la pasarela, ni hacia el intermediario. Cuando hace falta una renovación, el renovador abre su propia fila, llama al extremo de tokens del destino, guarda el token de renovación rotado, pone a cero el texto en claro y devuelve solo el nuevo token de acceso. El almacén del controlador guarda tokens de acceso y nada más.

El camino de lectura no cambia mientras el token de acceso sigue siendo válido. La caducidad puede guardarse en claro junto al texto cifrado, de modo que el controlador no necesita abrir una fila solo para ver que está caducada. Cuando lo está, el controlador pregunta al renovador en vez de abrir él mismo un secreto de larga duración.

Lo que hace de este un buen sitio para concentrar las credenciales duraderas es que el camino de renovación es lento. El camino caliente corre a un intercambio por cada llamada a una herramienta. El de renovación se acerca a los usuarios activos divididos por la vida del token de acceso: unas pocas peticiones por segundo en una instalación grande, no miles. Ese es un volumen en el que una concesión de KMS vuelve a ser un control razonable. Las concesiones eran un mal techo para cada llamada. Se acercan más a lo que puede permitirse un camino de poco volumen y mucho valor. El renovador tampoco debería tener entrada desde el plano de datos, no debería guardar tokens de sujeto, y debería ser lo bastante pequeño como para que, si alguna parte de este sistema llegara a moverse a un enclave, esta sería por la que yo empezaría. Esa última idea es una sugerencia de Posta, no una configuración que yo haya probado.

El coste es un cuarto dominio de confianza, con su propia identidad, su propio contexto de cifrado y su propia política en el intermediario. El renovador es ahora donde viven las credenciales de larga duración, así que comprometer ese componente es, a grandes rasgos, una postura de modo 2 para todos los usuarios: viva, auditable y revocable en el destino, pero no impedida mientras el atacante está en el proceso. Por eso debería tener la política de red más estricta del sistema y ningún camino desde la pasarela del agente. Si el renovador no está disponible, los intercambios empiezan a fallar a medida que caducan los tokens de acceso. La ventana de degradación es la vida del token, y el suelo de esa vida lo fija el destino, no uno mismo.

Además solo ayuda en los destinos que tienen un token de renovación que separar. Los tokens de acceso personal de larga duración y las claves de API estáticas no tienen una mitad de corta duración. Esas filas se quedan en el almacén del controlador, y un compromiso de ese proceso las ve en cuanto se usan. Para un asistente de seguridad que habla con Wazuh, un sistema de tickets o una API de nube, miraría cada integración en ese punto en vez de dar por hecho que el renovador las cubre todas.

<figure>
  <img src="/diagrams/scaling-the-token-vault-refresh.svg" width="1076" height="807" alt="Cuando un token de acceso ha caducado, el controlador pide uno nuevo a un renovador aparte, que guarda los tokens de renovación. El renovador llama al extremo de tokens del proveedor y devuelve solo un token de acceso nuevo.">
  <figcaption>Los tokens de renovación y los secretos de cliente nunca viajan con la petición en vivo. El renovador es un camino más lento y con un control propio, y solo devuelve el token de acceso. La separación sigue el análisis de Posta de octubre de 2026. El rosa marca un token en claro; el candado marca el texto cifrado.</figcaption>
</figure>

## Un modelo de amenazas para el camino caliente

Una inyección en el prompt que intente robar un token del agente sigue siendo el caso para el que se construyó la [parte 1](/es/blog/credenciales-fuera-agentes-ia/). Nada de este artículo devuelve ese token al modelo. El residuo no cambia: un agente manipulado todavía puede pedir cualquier operación que la política ya permita.

Un controlador comprometido es ahora dos pérdidas distintas. Las filas inactivas deberían permanecer cerradas sin el intermediario. Las filas activas, y lo que se haya cacheado de ellas, están en el proceso. Si esas filas solo contienen tokens de acceso de corta duración, la pérdida se reduce con la caducidad y con la revocación en el proveedor. Si también contienen tokens de renovación o secretos de cliente, la pérdida dura hasta que estos se revoquen. Trataría el «de cuánto tiempo disponemos tras un compromiso del controlador» como una función de lo que ese proceso puede guardar, no de lo rápido que esperamos darnos cuenta.

Un intermediario comprometido con permiso permanente de descifrado es más peligroso que uno que solo puede emitir concesiones, porque el permiso de descifrado ya está en su identidad. Sigue sin deber tener un camino a la base de datos. Si alguna vez lo tiene, el almacén queda abierto. La política de red y la auditoría de cualquier descifrado o acceso al almacén inesperado forman parte del diseño, no son un añadido.

Un renovador comprometido es un compromiso de los secretos duraderos. Debería ser más difícil de alcanzar que el controlador, y no debería ser accesible desde el plano de datos. Su salida debería ser un token de acceso, nunca uno de renovación.

Una pasarela comprometida sigue viendo el token que va a inyectar. Sacar el texto en claro del controlador en el camino de lectura, dejando que la pasarela haga el unwrap final, es lo que retomo en la [parte 5](/es/blog/eliminar-el-texto-en-claro/). No voy a rehacer ese trabajo aquí. El recordatorio útil es que alguien en el camino de la petición tiene que tocar el token en uso. La pregunta es cuántos componentes lo hacen, y durante cuánto tiempo.

La rotación de claves, la retirada de concesiones y la vida de la clave de datos tienen que ser explícitas. Una clave de datos que vive más allá de la petición es un unwrap permanente de esa fila. Una concesión que no se retira es lo mismo, con un problema de cuota encima. Si el intermediario o KMS no están disponibles, la petición debería rechazarse. Si el renovador no está disponible, preferiría que las llamadas nuevas empezaran a fallar al caducar los tokens antes que el controlador volviera a guardar tokens de renovación.

## Modos de fallo que no pasaría por alto

Las cuotas compartidas se olvidan con facilidad. Una ráfaga de conexiones de volúmenes cifrados, u otro equipo emitiendo concesiones en la misma cuenta y región, puede dejar sin margen a la pasarela aunque el propio ritmo de intercambio parezca modesto. Si me quedara en un camino caliente basado en concesiones, querría una clave dedicada, una conversación propia sobre la cuota y una alerta antes de que el retraso en la retirada se acerque al límite de concesiones de la clave. El movimiento más limpio sigue siendo sacar las concesiones de ese camino.

Un desajuste entre el token de sujeto y la clave envuelta debería fallar en KMS, y no debería devolver nunca una clave de datos. Lo mismo vale para una prueba de vigencia reutilizada. Si cualquiera de esos casos produce un descifrado correcto, el intermediario no está haciendo el trabajo que esta variante le asigna.

La caducidad guardada en claro junto al texto cifrado es cómoda, y también es metadato que un atacante puede leer. Es aceptable si solo le dice cuándo un token está caducado. No lo es si filtra un sujeto, un recurso o un secreto de cliente.

Los destinos que no rotan los tokens de renovación, o que emiten claves de API de larga duración, no obtendrán el beneficio de la separación. Registraría qué integraciones de un asistente tienen realmente una mitad de corta duración, y no describiría las demás como protegidas por el renovador.

<aside role="note" style="margin-block: 2rem; padding: 1rem 1.2rem; border: 1px solid var(--post-line); border-radius: 14px; background: color-mix(in srgb, var(--post-accent) 7%, var(--post-surface));">
<p style="margin: 0 0 0.35rem; font-family: var(--font-display); font-size: 0.78rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--post-accent);">Aún por registrar</p>
<p style="margin: 0; font-size: 0.98rem; line-height: 1.6; color: var(--post-text);">Todavía no he ejecutado esta variante delante de mi propio entorno, y no voy a inventar ritmos de intercambio ni tiempos de retirada de concesiones. Cuando lo haga, registraré si el camino caliente puede sostener la carga sin CreateGrant, si un compromiso solo del controlador puede obtener un token de renovación, si una prueba caducada o reutilizada llega a devolver una clave de datos, y cómo se comporta el sistema cuando el renovador está caído durante toda la vida de un token de acceso.</p>
</aside>

## Por dónde empezaría

Para el mismo asistente de solo lectura que estoy usando como caso de prueba, seguiría queriendo la separación del modo 3: el proceso que guarda el texto cifrado no debería poder abrir una fila por sí solo. No implementaría esa separación con una concesión en cada llamada a una herramienta. Dejaría que el intermediario desenvuelva la clave de datos, dejaría la carga donde está el controlador, y vigilaría las llamadas de descifrado desde la identidad del controlador como una excepción.

Después miraría qué se le permite guardar a ese controlador. Si la primera integración puede emitir un token de renovación, ese token y el secreto de cliente no deberían estar en la misma fila que el token de acceso. Si solo puede emitir una clave de larga duración, lo diría, y trataría un compromiso en vivo del controlador como la pérdida de esa clave hasta que se revoque.

Sigo ese trabajo en la [parte 4](/es/blog/proteger-el-almacen-con-openbao/), que reconstruye la misma separación sobre Vault y OpenBao, y en la [parte 5](/es/blog/eliminar-el-texto-en-claro/), que saca el unwrap final del controlador. La prueba que yo llevaría a ambos es la que este artículo añade a la parte 2. No basta con preguntar qué puede leer un atacante en el momento en que llega. También preguntaría qué puede recoger si se queda en el camino caliente, y si esa recolección incluye algo que no caduca por sí solo.
