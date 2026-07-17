---
title: "Un asistente de IA fiable para Wazuh: diseño y PoC autoalojado"
date: "2026-07-09"
description: "Cómo diseñé y autoalojé un asistente de seguridad con IA para Wazuh cuyas respuestas son verificables por construcción, con una cadena de identidad real e inferencia intercambiable desde Amazon Bedrock hasta modelos completamente locales."
tags: ["Ciberseguridad", "IA", "SIEM", "AWS"]
lang: "es"
translation: "wazuh-ai-assistant-poc"
image: "/blog/wazuh/v3-topology.png"
---

Todos los equipos SOC que conozco están experimentando con la misma idea: dejar que los analistas pregunten a su SIEM en lenguaje natural. "¿Cuántos fallos de autenticación hubo en las últimas 24 horas y qué usuarios fueron objetivo?" es una interfaz mejor que un DSL de consultas, y los modelos de lenguaje claramente son capaces de soportarla. La parte incómoda es lo que ocurre después. Un modelo de lenguaje responderá a esa pregunta con total fluidez sea o no cierta la respuesta, y en un contexto de operaciones de seguridad un número equivocado dicho con confianza es peor que ningún número.

Así que el problema de ingeniería interesante no es "puede una IA responder preguntas sobre mis alertas". Es "puedo demostrar que la respuesta es verdadera, siempre, de forma estructural". Este artículo recorre una prueba de concepto que diseñé y autoalojé tomándose esa pregunta en serio: un asistente de IA para [Wazuh](https://wazuh.com/) donde la veracidad es una propiedad de la arquitectura y no una esperanza expresada en un system prompt. Todo funciona en una sola máquina Linux con Docker, y la inferencia es intercambiable, desde Amazon Bedrock hasta un modelo local completamente aislado de la red.

*Actualizado el 17-07-2026: el asistente ahora vive dentro del propio Wazuh Dashboard, la identidad se verifica contra el indexador en lugar de un proveedor de identidad aparte, y los dos hitos que este artículo listaba originalmente como trabajo futuro — un carril de conocimiento sobre la documentación de Wazuh y las acciones aprobadas por humanos — ya están implementados. El principio de diseño de fondo no cambia; las secciones siguientes reflejan la versión actual.*

## El principio central: el modelo nunca escribe consultas

La decisión de la que se deriva todo lo demás es esta: **el modelo de lenguaje nunca escribe una consulta contra el almacén de datos y nunca calcula un número**. En su lugar, el asistente enruta cada pregunta a través de una escalera de carriles, ordenados por lo verificable que resulta la respuesta:

- **Carril 0, sin modelo.** La pregunta se convierte en un embedding y se compara con un corpus curado de ejemplos bilingües. Si la similitud supera un umbral (0.80), se ejecuta directamente una plantilla tipada preaprobada y la respuesta la genera código determinista. Unos 40 milisegundos y cero tokens de modelo.
- **Carril 1, herramientas tipadas.** El modelo elige de un catálogo de herramientas tipadas (`count_alerts`, `top_rules`, `auth_failures`, `alert_histogram`, ayudantes de correlación como `alert_timeline` y `mitre_coverage`, herramientas de entorno como `list_agents` e `index_health`, y herramientas de conocimiento). Los parámetros se validan contra un esquema. El modelo elige, nunca compone.
- **Carril 2, un plan de consulta restringido.** Para preguntas que el catálogo no puede expresar, el modelo emite una representación intermedia tipada (una Query IR) en lugar de una consulta cruda. La IR se valida contra una lista blanca de campos, se compila a DSL de OpenSearch en el servidor, y nunca puede contener scripts, expresiones regulares ni comodines porque el compilador no tiene ninguna ruta de código que los emita.
- **El carril 3, generación libre de consultas, existe como concepto y permanece apagado.**

Junto al carril 0 hay dos hermanos deterministas, también sin modelo de por medio: un **enrutador de referencia** que reconoce la forma de las preguntas de metadatos recurrentes ("qué significa la regla 5710", "qué es `data.srcip`", "qué sabes hacer") y llama a la herramienta exacta para ellas, y **playbooks** que ejecutan investigaciones curadas de varios pasos donde cada paso pasa las mismas comprobaciones que una respuesta suelta.

Toda consulta que supera la validación pasa además por cuatro comprobaciones de veracidad antes de que sus resultados lleguen al modelo:

1. **Validación contra el mapping**: los campos se comprueban contra el mapping real del índice, no solo contra la lista blanca.
2. **Dry-run previo a la ejecución**: el almacén de datos valida la consulta compilada antes de ejecutarla.
3. **Recuentos calculados por el almacén**: toda respuesta de tipo "cuántos" proviene de `total_matching` o de buckets de agregación que calculó OpenSearch. La lista de alertas de muestra que se entrega al modelo está truncada de forma explícita, así que contarla es imposible por construcción.
4. **Diagnóstico diferencial de cero resultados**: cuando una consulta no devuelve nada, la tubería sondea la ventana temporal y cada filtro por separado, de modo que la respuesta puede distinguir entre "verificado: hay 214 documentos en la ventana y ninguno es del agente db-99" y "la consulta estaba mal".

Por último, cada afirmación de una respuesta sintetizada debe citar un identificador `[alert:id]`, `[agg:name]` o `[kb:id]`, y el servicio verifica cada cita contra lo que realmente se recuperó. Una cita inventada aflora como un evento de corrección en lugar de una mentira dicha con confianza, y cada respuesta lleva una etiqueta de verificabilidad que indica qué carril la produjo y qué comprobaciones se ejecutaron.

[![Un turno como iconos: identidad, la cascada de carriles y la compuerta de veracidad en la ruta de lectura, y la ruta de escritura proponer-confirmar-ejecutar desviándose por debajo](/blog/wazuh/v3-turn-flow.png)](/blog/wazuh/v3-turn-flow.png)

*Un turno de principio a fin. La ruta de lectura fluye de izquierda a derecha por la cascada de carriles y la compuerta de veracidad; la ruta de escritura se desvía hacia abajo para proponer, confirmar y ejecutar. Haz clic en cualquier diagrama para verlo a resolución completa.*

## La arquitectura: el chat vive dentro de Wazuh

El cambio más visible desde el primer borrador de este diseño es dónde vive el chat. Ya no es una aplicación aparte: el asistente es el **Assistant de OpenSearch Dashboards dentro del Wazuh Dashboard**, conectado a través del conector HTTP de ML Commons a una puerta de enlace sin interfaz propia. Los analistas tienen el chat donde ya trabajan, y el asistente hereda la propia sesión del dashboard. La misma puerta de enlace responde además por otros tres bordes — n8n, una API JSON directa y un adaptador MCP para herramientas como Claude Desktop — así que los mismos internos endurecidos responden por todas las puertas.

[![El PoC autoalojado en una sola máquina: el nodo único de wazuh-docker con los plugins del Assistant y ML Commons, los contenedores de la puerta de enlace y la inferencia local, todo en una red Docker](/blog/wazuh/v3-selfhosted.png)](/blog/wazuh/v3-selfhosted.png)

*Todo excepto la inferencia corre en una sola máquina, y hasta la inferencia puede. Con Ollama local, ni las preguntas ni la evidencia salen jamás de la máquina.*

El reparto de responsabilidades importa. El dashboard y los demás bordes son puertas de entrada y nada más. El cerebro es un **tool service** sin interfaz propia (la puerta de enlace) que posee el bucle de agente completo, resuelve a qué entorno pertenece cada petición a partir de una clave por entorno, y expone los carriles de lectura, la tubería de veracidad, la capa de acciones y la pista de auditoría. Una superficie HTTP por herramienta ejecuta exactamente una herramienta validada sin ningún modelo de por medio, que es lo que impulsan las evaluaciones deterministas.

## La cadena de identidad: la IA consulta como tú

La propiedad que quería demostrar es que el núcleo de razonamiento no puede falsificar una identidad y no posee ninguna credencial permanente que lea telemetría. La cadena tiene cuatro saltos y cada salto verifica el anterior — y, lo importante, no necesita ningún proveedor de identidad externo.

El analista presenta sus credenciales de Wazuh existentes. Un sidecar dedicado, el **auth-shim**, verifica esas credenciales contra el *propio* indexador del entorno, llamando a su endpoint `authinfo`, de modo que la identidad es lo que el plugin de seguridad de Wazuh ya confía — usuarios internos, LDAP o SSO — sin nada nuevo que levantar. El shim confirma que el usuario tiene el rol de analista y acuña la credencial del turno: un JWT RS256 con doble audiencia, una vida máxima de diez minutos y un claim de tenant que proviene de *qué* entorno aceptó el login por su `authinfo`, y no de nada de la petición. El shim es el único contenedor que guarda la clave de firma. El tool service verifica solo con la clave pública, de modo que ni siquiera un núcleo de razonamiento comprometido puede acuñar identidades.

El cuarto salto es mi parte favorita. La configuración de seguridad del indexer de Wazuh gana un dominio de autenticación JWT que confía en esa misma clave pública, así que el tool service reenvía el token del propio analista y el indexer lo resuelve a un rol de solo lectura acotado a los índices de alertas. Las consultas de telemetría se ejecutan **como el analista que ha iniciado sesión**, y el techo se puede demostrar directamente, sin ninguna IA de por medio:

```bash
# permitido: leer alertas como el analista
curl -sk -H "Authorization: Bearer $TURN" \
  "https://localhost:9200/wazuh-alerts-*/_count" | jq

# denegado: el rol de analista no puede escribir, borrar ni leer otros índices
curl -sk -X DELETE -H "Authorization: Bearer $TURN" \
  "https://localhost:9200/wazuh-alerts-4.x-2026.07.08"
```

El asistente nunca puede mostrar a un usuario más de lo que ese token puede consultar, porque el asistente consulta con ese token. Los casos negativos fallan cerrados: un token firmado con cualquier otra clave muere en la verificación de firma, un token de otro tenant se rechaza y se audita, y un usuario sin el rol de analista nunca llega a recibir una credencial de turno.

## Un puerto, tres posturas de inferencia

Todo lo anterior descansa sobre un único puerto de proveedor. El bucle habla internamente el formato Converse de Bedrock, y un adaptador traduce hacia y desde el dialecto chat-completions de OpenAI, llamadas a herramientas incluidas. Cambiar de backend es un cambio en el `.env` más recrear un contenedor, y nada por encima del puerto se mueve: mismo bucle, misma IR, mismas comprobaciones de veracidad, misma cadena de identidad, misma auditoría.

Esa única costura produce tres posturas de soberanía muy distintas:

| Backend | Qué cruza el límite de la máquina | Cuándo usarlo |
|---|---|---|
| Amazon Bedrock | La pregunta más la evidencia compactada, bajo términos de AWS sin retención ni entrenamiento | Semántica de producción, los Guardrails se aplican por invocación |
| Ollama (local) | Nada. Completamente aislado | La demo de soberanía más estricta, y gratis |
| Groq u otra nube OpenAI-compatible | Pregunta y evidencia bajo los términos de ese proveedor | Solo experimentos de laboratorio |

Los dos niveles de modelo (un modelo pequeño de enrutado para las decisiones baratas y un modelo mayor de análisis para el bucle de investigación) pueden vincularse cada uno a un proveedor distinto, así que un enrutador local con análisis en Bedrock son dos líneas de configuración. Para servir en local, los modelos sparse mixture-of-experts resultaron ser el desbloqueo práctico: `gpt-oss:20b` da calidad de modelo grande con unos 3.6B de parámetros activos y corre en una máquina de 16 GB, y `qwen3:30b-a3b` cabe entero en 24 GB de VRAM. En el extremo monté un carril de profundidad experimental alrededor del layer streaming al estilo AirLLM, que de verdad ejecuta modelos de clase 70B en una GPU de 4 GB, a entre 0.07 y 0.7 tokens por segundo. Eso no es un asistente interactivo y ninguna configuración lo convierte en uno, así que está posicionado honestamente como un carril por lotes para una pregunta difícil durante la noche, nunca como la ruta del chat.

## Cuando los logs contraatacan

Un asistente para un SIEM tiene un modelo de amenazas peculiar: su entrada más peligrosa no es la pregunta del usuario, es la evidencia. Los cuerpos de las alertas contienen lo que un atacante haya conseguido escribir en una línea de log, lo que significa que cada pieza de evidencia que el modelo lee es, potencialmente, una instrucción adversaria. La tubería la trata como tal. La pregunta del analista pasa un filtro de ataques de prompt, la evidencia recuperada pasa su propio guardrail antes de que el modelo la vea, la salida del modelo pasa una tercera comprobación de secretos, PII y grounding, y la verificación de citas elimina y marca cualquier afirmación que cite evidencia que nunca se recuperó. Lo que llega al navegador es Markdown saneado: sin HTML, sin enlaces externos, sin imágenes de carga automática.

La defensa honesta, en cualquier caso, es estructural: todas las herramientas que el modelo puede invocar son de solo lectura y están acotadas al tenant, así que incluso una inyección perfectamente ejecutada no tiene nada peligroso que secuestrar. Y como las intervenciones de los guardrails y los fallos de cita son eventos de auditoría en el indexer del propio tenant, el *intento* de inyección se convierte en una detección del SOC sobre el atacante. El asistente transforma el ataque en telemetría.

## Reconocer antes de razonar

La optimización que más me gusta no necesitó ninguna GPU. Los analistas hacen las mismas preguntas operativas constantemente, y esas preguntas no necesitan un modelo de razonamiento. El carril 0 convierte cada pregunta entrante en un embedding con un modelo local pequeño (`bge-m3`, que maneja inglés y español en un mismo espacio), la compara con los ejemplos curados por similitud coseno, extrae slots como ventanas temporales y nombres de agente con reglas bilingües deterministas, y ejecuta la plantilla acertada a través de la misma tubería de veracidad que cualquier otro carril. Un acierto responde en decenas de milisegundos con cero tokens de modelo, y en Bedrock eso significa literalmente que las preguntas más frecuentes no cuestan nada. Un fallo escala en silencio, así que el carril 0 nunca puede romper el asistente, solo aliviarlo.

Un único umbral de coseno, sin embargo, acabará disparando la plantilla equivocada ante una paráfrasis con una negación dentro, así que un acierto necesita algo más que superar 0.80. La banda de casi-acierto entre 0.65 y 0.80 no ejecuta ninguna plantilla; en su lugar, el ejemplo más cercano se inyecta como una pista few-shot transitoria para el modelo, después del prefijo estable del prompt para no envenenar jamás la caché de prompts. El reconocimiento que es *casi* seguro ayuda al modelo sin fingir certeza.

A su lado hay una caché de evidencia cuya clave es un hash del plan de consulta canónico, con los límites temporales redondeados a una rejilla de TTL, de modo que "las últimas 24 horas" preguntado dos veces en el mismo minuto es una consulta y no dos. Las respuestas cacheadas declaran `served_from_cache`, porque un asistente construido sobre la verificabilidad no tiene derecho a esconder sus atajos.

## El carril de conocimiento, ya implementado

Los analistas no solo preguntan por telemetría. También preguntan "qué significa la regla 5710" y "cómo enrolo un agente", y esas preguntas merecen el mismo tratamiento de veracidad que las preguntas sobre alertas. Así que el asistente tiene ahora un carril de conocimiento sobre la documentación oficial de Wazuh: un corpus fijado a una versión, ingerido de la documentación, troceado y embebido, contra el que `knowledge_search` recupera — y cada pasaje que devuelve se cita como `[kb:id]` y se verifica contra lo que realmente se recuperó, exactamente igual que `[alert:id]`. Este es el único lugar del sistema donde se embebe algo, y es deliberado: el único almacén vectorial de todo el diseño es sobre *contenido de referencia público*, nunca sobre la telemetría de un tenant. Los datos del tenant se consultan, nunca se embeben.

Junto a él, herramientas de búsqueda exacta responden las preguntas de metadatos sin ninguna semántica: `rule_reference` para un ID o grupo de regla, `field_dictionary` para un nombre de campo, `mitre_lookup` sobre un corpus curado de ATT&CK incluido en la imagen, y `describe_capabilities` para "qué sabes hacer". El enrutador de referencia reconoce esas formas y llama a la herramienta correcta directamente — sin modelo, sin embedding — mientras que las preguntas genuinamente abiertas de "cómo hago / cómo debería remediar" caen al carril semántico de documentación. Los reconocimientos recurrentes pertenecen a un carril determinista; solo las preguntas abiertas llegan al modelo.

## El modelo propone, un humano dispone

El otro hito que se ha implementado son las acciones de escritura. Tarde o temprano a todo asistente le piden que *haga* algo — reinicia ese agente, silencia esa regla ruidosa — y la regla que lo mantiene seguro es estructural, como todo lo demás: el núcleo de razonamiento no posee ninguna credencial capaz de ejecutar acciones. Cuando el modelo emite un `propose_action`, la puerta de enlace lo valida contra una lista blanca, verifica el objetivo de forma independiente consultando el indexador como el analista, y renderiza una tarjeta de hechos que el modelo nunca escribió. Nada se ejecuta hasta que un humano confirma, y la ejecución corre bajo una credencial de mínimo privilegio por nivel que el modelo nunca posee — dashboard, manager o active-response, cada una su propia identidad acotada. Los niveles de alto riesgo exigen que quien aprueba reteclee el nombre del objetivo. La mitad operativa de esto — capacidad, el flujo completo de acciones, auditoría y respuesta a incidentes — es su propio artículo: [Operar un asistente de IA en un SOC](/es/blog/operar-ia-wazuh-soc/).

## Demostrarlo en lugar de enseñarlo

Las demos no convencen a nadie, así que el laboratorio convierte sus afirmaciones en aserciones. Un generador escribe unas dos mil alertas sintéticas con semilla determinista y registra las verdades exactas en un fichero. Un conjunto dorado bilingüe de 32 casos de evaluación se ejecuta después contra el stack vivo a través de la cadena completa, desde el login hasta la respuesta final, comprobando la selección de herramientas, los recuentos contra la verdad conocida, la honestidad ante cero resultados, la resistencia a inyección de prompts y la ausencia de citas sin verificar. Sale con código distinto de cero ante cualquier fallo, lo que lo convierte en una puerta de CI: los cambios de prompt pasan a ser físicamente incapaces de fusionarse sin evaluar. Suites aparte impulsan las rutas de acciones de escritura (`make evals-actions`) y el borde del conector del dashboard (`make evals-connector`), y una suite unitaria que ha crecido de 26 a más de 150 tests cubre el núcleo determinista — validación de la IR, compilación a DSL, extracción de slots del carril 0, claves de caché y las comprobaciones de citas.

Los bordes operativos recibieron el mismo trato. Las respuestas fluyen token a token, la capacidad es una cola acotada que rechaza honestamente en lugar de degradar en silencio, un kill switch convierte todas las superficies en un 503 cuando hace falta, y un endpoint de Prometheus expone turnos por carril, resultados de herramientas e histogramas de latencia.

## Pruébalo tú mismo

El laboratorio completo está publicado en [`integrations/ai-assistant`](https://github.com/leonfullxr/Wazuh/tree/main/integrations/ai-assistant) de mi repositorio de Wazuh, junto al resto de integraciones y PoCs que he construido alrededor de la plataforma. Es reproducible en cualquier máquina Linux con Docker y unos 10 GB de RAM libre (más si quieres inferencia local):

```bash
cp .env.example .env         # elige dentro un backend de inferencia
make keys                    # par de claves de firma JWT por tenant
make wazuh                   # wazuh-docker oficial de nodo único, con certificados
make securityconfig          # dominio de autenticación JWT, roles y usuarios de laboratorio
make dashboard-assistant     # integra los plugins del Assistant en la imagen del dashboard
make ollama embed-mlcommons  # opcional: modelo local + embeddings en el clúster
make poc                     # la puerta de enlace, el auth-shim, n8n
make assistant-setup         # registra el conector de ML Commons, el modelo y el agente de chat
make seed                    # ~2000 alertas sintéticas con verdades conocidas
make evals                   # el conjunto dorado bilingüe, de extremo a extremo
make test                    # la suite unitaria del núcleo determinista
```

Luego abre `https://localhost`, pulsa el icono del **Assistant** y pregunta "¿cuántas alertas en las últimas 24 horas?". Si ya tienes Wazuh en marcha, no hace falta crear uno: dos instaladores idempotentes apuntan el mismo asistente a un despliegue ya existente — `install_gateway.sh` levanta la puerta de enlace, el modelo local y los objetos de seguridad, e `install_dashboard_assistant.sh` instala los plugins del Assistant y le conecta ML Commons. Un README recorre cada sección de este artículo con detalle ejecutable, desde la configuración de Bedrock hasta la variante aislada de la red. Si lo pruebas y quieres comparar notas, [escríbeme](/es/#contact).

## De una máquina a una flota

El PoC replica el diseño de producción a propósito. La puerta de enlace, la cadena de identidad y la tubería de veracidad son idénticas tanto si sirven un entorno como si sirven muchos; la única diferencia estructural es el registro, que aquí tiene una entrada y en producción tiene N, cada una resuelta por su propia credencial por entorno.

[![Dos posturas de despliegue, un solo código: autoalojado en una sola máquina frente a nube multi-entorno, compartiendo la misma puerta de enlace, identidad y veracidad](/blog/wazuh/v3-deployment-postures.png)](/blog/wazuh/v3-deployment-postures.png)

*El mismo núcleo, la misma identidad, las mismas comprobaciones. Solo cambia dónde corren las piezas — y si la inferencia sale de la máquina — entre el PoC autoalojado y la forma multi-entorno en la nube.*

En producción el laboratorio se despliega en EKS con un namespace por entorno tras una NetworkPolicy de denegación por defecto, y cada entorno recibe su propio rol IAM (IRSA), su propio perfil de inferencia y guardrail de Bedrock y su propia clave KMS. La ruta de la IA nunca toca internet, porque Bedrock, STS, Secrets Manager y los logs se alcanzan a través de endpoints de interfaz de la VPC, y la auditoría aterriza tanto en el indexer del propio entorno como en un bucket de S3 con Object Lock. El único salto compartido de la ruta de datos es la flota de modelos sin estado de Bedrock, y ese es exactamente el salto sin retención.

## Lo que endurecería después

Un PoC se gana que lo tomen en serio conociendo sus propios huecos, así que esta es mi lista, en orden:

- **La caché de evidencia debe incluir la identidad en su clave, no solo el plan de consulta.** Dos analistas con permisos de índice distintos no deben compartir jamás una entrada de caché, así que el conjunto efectivo de roles pertenece a la clave. Es el tipo de bug que solo existe porque la caché funciona.
- **Los JWT de turno necesitan una vía de revocación.** Diez minutos es poco, pero un kill switch no debería tener que esperar a la expiración; una pequeña lista de denegación de valores `jti` en memoria cierra esa ventana.
- **El diagnóstico de cero resultados debe pagar su coste bajo el control de admisión.** Las sondas diferenciales multiplican las consultas al indexer en cada turno sin resultados; deben ejecutarse bajo el mismo semáforo que todo lo demás, etiquetadas en el registro de auditoría.
- **Los modelos locales merecen decodificación restringida.** Forzar la gramática de la Query IR convierte los bucles de parsear-y-reintentar en validez al primer intento, lo que en un modelo local de 20B es latencia real recuperada.
- **La deriva de escalada debería avisar a alguien.** Las métricas por carril ya existen; una alerta sobre una tasa creciente del carril 2 caza una regresión de prompt antes de que nadie note que las respuestas se volvieron más lentas y caras.
- **La pata de fidelidad de Bedrock está por demostrar.** La inferencia local está validada de extremo a extremo; la postura en la nube, incluida la contabilidad de tokens con caché de prompts, es el único backend que aún no he ejercitado contra el conjunto dorado completo.

Nada de esto cambia la arquitectura. Ese es el sentido de acertar primero con la estructura: todo lo de la lista es una pasada de endurecimiento dentro de una costura que ya existe.

Las dos adiciones que originalmente señalé como hitos — un carril de conocimiento sobre la documentación de Wazuh y las acciones aprobadas por humanos — son las dos secciones de arriba, ya implementadas y validadas en vivo. Las conversaciones multi-turno también sobreviven ahora de un turno a otro, así que las preguntas de seguimiento que referencian evidencia anterior siguen siendo verificables. Lo que queda genuinamente abierto, más que simplemente sin construir, es la suite de aislamiento entre tenants multi-entorno: la forma está y el registro es real, pero afirmar el aislamiento entre tenants vivos es el trabajo que aparté para mantener afilada la historia autoalojada.

## Lo que me llevo

Tres lecciones sobrevivieron al contacto con la implementación. Primera, la veracidad es estructural o no es nada: las listas blancas, la compilación en servidor, los recuentos calculados por el almacén y las citas verificadas hacen más por la confianza que cualquier cantidad de prompt engineering, porque se sostienen incluso cuando el modelo se equivoca. Segunda, la identidad es la funcionalidad que nadie enseña en demos y todo el mundo necesita. Consultar como el usuario a través de un dominio de autenticación JWT significa que la IA hereda exactamente los permisos de la persona que pregunta, y esa única propiedad responde la mayoría de las preguntas difíciles de multi-tenancy antes de que se formulen. Y tercera, la ingeniería honesta gana a la ingeniería impresionante. El carril de profundidad con layer streaming es técnicamente la parte más vistosa del stack, y lo más valioso que hice con él fue medirlo, decir que 0.2 tokens por segundo no es una experiencia de chat, y confinarlo al carril donde ayuda de verdad.

Un asistente para un SIEM no se gana la confianza sonando convincente. Se la gana siendo comprobable, y eso es una decisión de arquitectura.

*Esta es la mitad de diseño de la historia. La mitad operativa - capacidad sin balanceador, acciones aprobadas por humanos, el mapa de auditoría y el playbook de respuesta a incidentes - está en [Operar un asistente de IA en un SOC](/es/blog/operar-ia-wazuh-soc/).*
