---
title: "Mantener las credenciales fuera de los agentes de IA, parte 5: eliminar el texto en claro"
date: "2026-11-22"
description: "La pasarela ya ve el token que pone en tránsito. El controlador no necesita verlo también."
tags: ["Seguridad", "Inteligencia artificial", "Identidad"]
image: "/images/blog/covers/token-vault-plaintext.png"
lang: "es"
translation: "eliminating-plaintext"
---

Este es el quinto y último artículo de una serie sobre mantener las credenciales fuera de los agentes de IA. El orden de lectura es el de los números de parte, aunque las [partes 2](/es/blog/proteger-el-almacen-de-tokens/) y [3](/es/blog/escalar-el-almacen-de-tokens/) llevan fechas posteriores a la [parte 4](/es/blog/proteger-el-almacen-con-openbao/) y a este, y por eso aparecen antes en la lista del blog. La [parte 1](/es/blog/credenciales-fuera-agentes-ia/) empezó con una pasarela de salida, la parte 2 preguntó cómo se envuelve el almacén de tokens, la parte 3 miró el camino caliente a escala, y la parte 4 cómo ejecutar esa separación en Vault u OpenBao.

El artículo de [Christian Posta](https://agentgateway.dev/blog/2026-11-22-eliminating-plaintext-credential-injection/) del 22 de noviembre de 2026, *Credential Injection Patterns for AI Agents: Part 4, Eliminating Plaintext*, es el que sigue este texto. La reacción a los artículos anteriores, según cuenta, fue alguna versión de «no has quitado el riesgo, solo lo has movido a la pasarela». Eso es cierto del token en tránsito, y ya lo era. La pasarela termina la conexión del agente y pone el token de destino en el cable. Lo mismo hace cualquier proxy de salida que intercepta TLS. El broker no inventó esa exposición. Lo que añadió fue un almacén con los tokens de todos los usuarios, y un controlador en el camino caliente que también veía el texto en claro. Este artículo pregunta por qué un segundo proceso debería ver ese token.

No he ejecutado este cambio delante de mi propio entorno. Lo que sigue es su argumento, reformulado con mis palabras, más el modelo de amenazas y los modos de fallo que yo exigiría antes de dar por terminado un controlador que solo guarda texto cifrado.

## Por qué el controlador ve el texto en claro

En la variante de la [parte 3](/es/blog/escalar-el-almacen-de-tokens/), el controlador envía un token de sujeto, una prueba de vigencia y la clave de datos envuelta de la fila al intermediario, recibe la clave de datos en claro, abre la capa interior y entrega el token de destino a la pasarela. Lo hace todo porque actúa como un intercambio de tokens: token de sujeto entra, token de destino sale. Es una API razonable. El controlador necesita encontrar la fila correcta. No necesita abrirla.

Si solo la pasarela debe ver el texto en claro, hay que cambiar la API. La pasarela obtiene el texto cifrado del controlador y la clave de datos del intermediario, y solo ella puede descifrar. La pasarela iba a tener el token unos milisegundos después de todos modos, así que lo único que cambia en ese proceso es dónde ocurre la apertura. El controlador pasa a ser un almacén y una máquina de estados, con metadatos de fila y caducidad, y sin camino de descifrado ni credencial en claro.

El controlador pierde también el permiso de cifrado. Eso solo funciona si el renovador de la parte 3 es el componente que completa el intercambio del código de autorización y envuelve las filas que escribe. Con el camino de lectura movido a la pasarela, al controlador no le queda nada que llamar en KMS o en Transit.

## El flujo

El intermediario solo acepta la identidad de la pasarela, así que un controlador comprometido no puede pedir un unwrap, por muchos tokens de sujeto que haya recolectado. En las partes 2 a 4, una prueba de vigencia firmada por la pasarela hacía ese trabajo. El intermediario sigue verificando el token de sujeto contra el proveedor de identidad en cada unwrap, lo que limita a la pasarela a los usuarios que están realmente activos. El controlador solo entrega texto cifrado a la pasarela para el propietario de la fila, así que nadie más puede vaciar el almacén.

La misma idea funciona en los diseños con forma de concesión, con otra parte llamando al descifrado. En KMS, el intermediario emite una concesión con el rol de la pasarela como beneficiario en lugar del del controlador. En el modo 3b sobre OpenBao, de la [parte 4](/es/blog/proteger-el-almacen-con-openbao/), es la pasarela quien llama a Transit. El diseño del inicio de sesión en el almacén es el cambio más pequeño de todos: la pasarela ya tiene el token de OpenBao, así que llamaría a Transit ella misma en lugar de entregarle ese token al controlador.

<figure>
  <img src="/diagrams/eliminating-plaintext.svg" width="1076" height="888" alt="El controlador solo guarda texto cifrado y no tiene permiso sobre la clave. Un renovador aparte escribe filas nuevas de tokens de acceso. La pasarela recoge el texto cifrado del controlador y una clave de datos del intermediario, abre la fila y pone un token de acceso en tránsito hacia el destino.">
  <figcaption>La pasarela ya tenía que ver el token que inyecta. El cambio es que el controlador ya no lo ve también. Los tokens de renovación se quedan en el renovador y nunca toman este camino. El flujo sigue el análisis de Posta de noviembre de 2026. El rosa marca un token en claro; el candado marca el texto cifrado.</figcaption>
</figure>

## Solo el token de acceso

Solo el token de acceso debería volver de este unwrap. En el almacén de la parte 2, la carga de cada fila es toda la respuesta del token bajo una sola clave de datos, lo cual está bien cuando el controlador la abre y solo entrega el token de acceso. Si la pasarela abriera esa misma fila, obtendría también el token de renovación. El token de renovación tiene que vivir bajo su propia clave de datos, en el almacén del renovador de la parte 3, al que la pasarela nunca llega. Cuando un token de acceso caduca, el renovador escribe una fila nueva de token de acceso envuelto y la pasarela la desenvuelve como cualquier otra. Ni la pasarela ni el controlador ven nunca un token de renovación.

## Qué obtiene todavía un compromiso

«Así que ahora el componente más expuesto de la red hace todo el descifrado. ¿En qué es eso mejor?»

La pasarela ya tenía el texto en claro de cada token en uso, en todos los modos, porque es quien lo pone en el cable. Lo que hace este cambio es impedir que un segundo componente también lo tenga. Un atacante que se queda en la pasarela recolecta tokens en uso al ritmo de uso, haga o no la apertura la pasarela, y eso ya era cierto en la parte 2. Un atacante que se queda en el controlador, que en la parte 3 recolectaba exactamente los mismos tokens, ahora obtiene texto cifrado.

Para los tokens en tránsito, una pasarela de broker comprometida ve exactamente lo que vería un proxy de intercepción comprometido. Lo único que puede hacer y un proxy no es pedir credenciales. Con el token de sujeto en vivo de Alice puede llamar al intermediario por sus otras filas aunque sus agentes solo hayan tocado una de ellas ese día, porque es la pasarela quien nombra el recurso. Es un confused deputy, y funciona mientras su token de sujeto siga siendo válido después de la última petición. Queda acotado a las filas de los usuarios activos durante el compromiso. Nada funciona sin conexión, los usuarios inactivos quedan fuera de alcance, y cada unwrap aparece en el registro de decisión del intermediario. Los dos diseños de OpenBao de la [parte 4](/es/blog/proteger-el-almacen-con-openbao/) tienen el mismo residuo, así que mover el unwrap no lo cambia.

El goteo no se detiene cuando se evicta al atacante. La pasarela recolecta al ritmo de uso mientras el atacante se queda en ella, pero lo que haya registrado sigue siendo usable hasta que el destino lo caduque, así que la vida de esos tokens de acceso forma parte del radio de impacto de la pasarela. Posta señala que eso varía mucho según el proveedor, y que algunos emiten tokens que no caducan a menos que se active la caducidad. Yo lo trataría como una propiedad de cada integración, no como una constante.

Esto es lo que obtiene cada compromiso aislado después del cambio.

Un controlador comprometido solo tiene texto cifrado, nunca texto en claro, nunca una clave de datos. Puede servir una fila antigua del mismo usuario y recurso, o negarse a servir nada. Los dos ataques de la parte 3, quedarse en el camino caliente y ver el texto en claro en el momento de la creación, desaparecen.

Una pasarela comprometida tiene el texto en claro de los tokens en uso, igual que cualquier proxy de intercepción, más las otras filas de los usuarios activos descritas arriba. Es el mismo residuo que ya tenía la pasarela en todos los diseños anteriores.

Un intermediario comprometido sigue teniendo descifrado permanente y las claves de datos envueltas que ve en las peticiones en vivo, pero nunca la carga, así que por sí solo no lee nada. Emparejado con el controlador, o con cualquier otro camino a la base de datos, lee el almacén entero, lo que lo convierte en el objetivo de más valor. Es el mismo residuo que en la parte 3. El aislamiento entre el intermediario y la base de datos sigue siendo lo que le impide usar ese descifrado sobre el almacén, así que ese camino tiene que seguir cerrado, y el intermediario y el controlador siguen perteneciendo a dominios de confianza distintos.

Un renovador comprometido no cambia respecto a la parte 3: es, a grandes rasgos, una postura de modo 2 para los tokens de renovación, y por eso sigue teniendo la política de red más estricta del sistema.

Lo único que un controlador que solo guarda texto cifrado todavía puede hacer es dejar que un atacante robe texto cifrado ahora y espere obtener más adelante la clave de encapsulado, por ejemplo por un error de política de claves durante una migración. En OpenBao, la respuesta de Posta es reenvolver con un calendario y luego subir la versión mínima de descifrado de la clave Transit, de modo que el texto cifrado robado antes del reenvolvido quede inservible. Reenvolver por sí solo no ayuda, porque la versión antigua de la clave sigue descifrando lo que el atacante se llevó.

## Los dos huecos que quedan

Todo lo anterior deja a la pasarela con los dos mismos problemas que tenía cada diseño anterior. El token en claro está en la pasarela, así que lo que una pasarela comprometida registre sigue funcionando después de evictar al atacante. Y la pasarela decide qué credencial pedir, así que con un token de sujeto en vivo puede pedir las otras filas de un usuario activo. Una prueba firmada por el agente puede quitarle a la pasarela esa elección. Un entorno de ejecución de confianza puede sacar el texto en claro de la máquina de la pasarela. Yo no he implementado ninguno de los dos. Son las direcciones que señala Posta, y merece la pena ser precisos.

Para quitarle a la pasarela la elección de la fila, el agente tiene que firmar una prueba ligada a lo que intenta alcanzar, que la pasarela puede llevar al intermediario pero no puede emitir por su cuenta. El grupo de trabajo WIMSE del IETF tiene borradores que hacen esto, un Workload Proof Token y un perfil de firmas de mensajes HTTP. El agente tiene un Workload Identity Token, firma una prueba de corta duración en cada petición con el destino de la petición como audiencia, y el intermediario verifica que quien firma es una carga de agente, no la pasarela firmando con su propia identidad. El intermediario traduce ese camino a un destino a partir de su propia configuración, y solo desenvuelve esa fila. Una prueba compra un unwrap, del token que la pasarela iba a poner en el cable de todos modos.

Esa correspondencia tiene que vivir en el intermediario. Un servidor MCP virtual que pone varios destinos detrás de un solo extremo da a todas las herramientas la misma audiencia, y una pasarela comprometida podría seguir pidiendo cualquiera de esas filas. Si el cliente también envía el nombre de la herramienta, el agente puede firmar eso también, y el intermediario traduce la herramienta al destino en lugar del camino. En cualquier caso, el intermediario necesita su propia copia de esa correspondencia. Si se fía de la palabra de la pasarela, la prueba no sirve de nada.

Con eso en su sitio, una pasarela comprometida solo obtiene los tokens que los agentes pidieron de verdad mientras los piden, igual que cualquier proxy de intercepción. No hace nada por el texto en claro. El coste es que cada agente firma cada petición, un cambio pequeño en los entornos que controlas y algo para lo que muchos clientes de escritorio necesitarían un punto de extensión.

Para el texto en claro, la dirección es mover el paso que adjunta el token a un inyector pequeño que corre dentro de un entorno de ejecución de confianza, un enclave aislado por hardware cuya memoria no pueden leer el sistema operativo anfitrión, el hipervisor ni root en la máquina. El hardware puede atestar exactamente qué código corre dentro, que es cómo sabría el intermediario que está entregando la clave de datos al inyector y no a la pasarela. Si la obtención de la clave, la apertura, la cabecera y la sesión TLS hacia el destino ocurren ahí, el token en claro nunca existe en el anfitrión de la pasarela. Una pasarela comprometida todavía puede empujar peticiones a través del enclave como Alice mientras ella está activa, pero se va con las manos vacías, así que el goteo se detiene cuando se evicta al atacante. La pasarela sigue eligiendo la fila, así que esto se combina con la prueba firmada por el agente en lugar de sustituirla.

Esto no es algo que yo afirmaría haber desplegado. Posta es cuidadoso con las restricciones: en AWS, KMS puede devolver la clave de datos cifrada para la clave atestada del enclave, y el intermediario puede hacer esa llamada sin ver la clave. El enclave a menudo no tiene red propia, así que el anfitrión retransmite los bytes, pero tiene que ser la sesión TLS del enclave hacia el destino, y el enclave tiene que comprobar el certificado del destino contra raíces metidas en su imagen, para el nombre de máquina ligado a la fila. Si no, una pasarela comprometida podría apuntarlo a un servidor que controla. OpenBao Transit no tiene un equivalente de ese descifrado ligado al destinatario, así que en el diseño de la parte 4 el intermediario tendría que verificar la atestación él mismo. Posta describe eso como la dirección de Agentgateway Enterprise. No voy a reescribir ese producto aquí.

## Modos de fallo que no pasaría por alto

Si el intermediario sigue aceptando un llamante que no es la pasarela, el controlador puede volver a pedir unwraps, y el texto en claro vuelve a un segundo proceso. Esa es la primera prueba que yo ejecutaría.

Si una fila sigue guardando un token de renovación o un secreto de cliente bajo la misma clave de datos que el token de acceso, mover el unwrap a la pasarela ha hecho más peligroso al componente más expuesto, no menos. Me negaría a publicar esa forma de fila.

Si el controlador todavía puede llamar a KMS o a Transit, «solo texto cifrado» es un comentario en el diagrama, no una propiedad del sistema. Esos permisos tienen que estar ausentes, y una llamada desde la identidad del controlador debería ser una excepción en el registro de auditoría.

Un token de sujeto que sigue siendo válido mucho después de la última acción del usuario ensancha la ventana en la que una pasarela comprometida puede pedir las otras filas de ese usuario. Querría saber, para cada integración, cuánto vive realmente ese token.

Reenvolver texto cifrado sin subir la versión mínima de descifrado no retira lo que un atacante ya robó. Los dos pasos tienen que ocurrir juntos, o ninguno está haciendo su trabajo.

<aside role="note" style="margin-block: 2rem; padding: 1rem 1.2rem; border: 1px solid var(--post-line); border-radius: 14px; background: color-mix(in srgb, var(--post-accent) 7%, var(--post-surface));">
<p style="margin: 0 0 0.35rem; font-family: var(--font-display); font-size: 0.78rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--post-accent);">Aún por registrar</p>
<p style="margin: 0; font-size: 0.98rem; line-height: 1.6; color: var(--post-text);">Todavía no he movido el unwrap a la pasarela delante de mi propio entorno, y no voy a inventar ventanas residuales ni vidas de tokens. Cuando lo haga, registraré si un compromiso solo del controlador puede obtener texto en claro, si el intermediario llega a aceptar un llamante que no es la pasarela, si la pasarela puede desenvolver una fila de token de renovación, y si una prueba caducada o reutilizada llega a devolver una clave de datos.</p>
</aside>

## Por dónde empezaría

Para el mismo asistente de solo lectura que estoy usando como caso de prueba, solo haría esto después de que la separación de las [partes 3](/es/blog/escalar-el-almacen-de-tokens/) y [4](/es/blog/proteger-el-almacen-con-openbao/) esté en su sitio: los tokens de renovación ya viven en el renovador, y el proceso que guarda el almacén no puede abrir una fila por sí solo. Entonces movería la apertura final a la pasarela, quitaría al controlador todo permiso sobre KMS y Transit, y dejaría que el intermediario aceptara solo a la pasarela.

Después miraría si las primeras integraciones comparten un usuario en más de un destino. Si es así, una prueba firmada por el agente es cómo impediría que una pasarela comprometida pidiera las filas que el agente no pidió. Un entorno de ejecución de confianza merece la pena seguirlo. No es algo que yo describiría como hecho.

La prueba que yo llevaría a lo largo de toda la serie es la misma que la [parte 3](/es/blog/escalar-el-almacen-de-tokens/) añadió a la [parte 2](/es/blog/proteger-el-almacen-de-tokens/). No basta con preguntar qué puede leer un atacante en el momento en que llega. También preguntaría qué puede recoger si se queda en el camino, si un segundo proceso sigue viendo el token, y si esa recolección caduca por sí sola.
