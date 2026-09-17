---
title: "Un asistente de IA fiable para Wazuh: diseño y PoC autoalojado"
date: "2026-07-09"
description: "Diseño y despliegue autoalojado de un asistente de seguridad con IA para Wazuh: respuestas verificables por diseño, cadena de identidad real e inferencia intercambiable, desde Amazon Bedrock hasta modelos totalmente locales."
tags: ["Ciberseguridad", "IA", "SIEM", "AWS"]
lang: "es"
translation: "wazuh-ai-assistant-poc"
image: "/blog/wazuh/v3-topology.png"
---

En los SOC que conozco todos están probando la misma cosa: que el analista pregunte al SIEM en lenguaje natural. "¿Cuántos fallos de autenticación hubo en las últimas 24 horas y qué usuarios fueron objetivo?" es mejor interfaz que un DSL de consultas, y los LLM pueden sostenerla. Lo incómodo viene después: el modelo responde con fluidez haya o no verdad detrás, y en operaciones de seguridad un número falso dicho con seguridad es peor que el silencio.

El reto de ingeniería interesante, entonces, no es "¿puede una IA contestar sobre mis alertas?", sino "¿puedo demostrar que la respuesta es cierta, siempre, de forma estructural?". Este artículo recorre una PoC que diseñé y autoalojé tomándome en serio esa pregunta: un asistente de IA para [Wazuh](https://wazuh.com/) donde la veracidad es propiedad de la arquitectura, no una esperanza metida en el system prompt. Todo cabe en una Linux con Docker, y la inferencia es intercambiable: desde Amazon Bedrock hasta un modelo local sin salida a red.

*Actualizado el 17-07-2026: el asistente vive ya en el propio Wazuh Dashboard, la identidad se valida contra el indexador (sin IdP aparte), y los dos hitos que aquí figuraban como futuro — carril de conocimiento sobre documentación Wazuh y acciones con aprobación humana — están implementados. El principio de diseño no cambia; lo que sigue refleja la versión actual.*

## El principio central: el modelo nunca escribe consultas

De aquí sale todo lo demás: **el LLM no escribe consultas contra el almacén ni calcula cifras**. Cada pregunta recorre una escalera de carriles, ordenados por cuánto se puede verificar la respuesta:

- **Carril 0, sin modelo.** La pregunta se embebe y se compara con un corpus curado de ejemplos bilingües. Si la similitud supera umbral (0.80), corre una plantilla tipada preaprobada y la respuesta la genera código determinista. Unos 40 ms, cero tokens.
- **Carril 1, herramientas tipadas.** El modelo elige de un catálogo tipado (`count_alerts`, `top_rules`, `auth_failures`, `alert_histogram`, correlación como `alert_timeline` y `mitre_coverage`, entorno con `list_agents` e `index_health`, conocimiento). Parámetros validados contra esquema. El modelo elige, no compone.
- **Carril 2, plan de consulta restringido.** Si el catálogo no alcanza, el modelo emite una IR tipada, no consulta cruda. La IR se valida contra lista blanca de campos, se compila a DSL OpenSearch en servidor, y no puede incluir scripts, regex ni comodines: el compilador no tiene rutas que los emitan.
- **El carril 3, generación libre de consultas, existe como concepto y sigue apagado.**

Junto al carril 0 hay dos hermanos deterministas: un **enrutador de referencia** que reconoce preguntas recurrentes de metadatos ("qué significa la regla 5710", "qué es `data.srcip`", "qué sabes hacer") y llama la herramienta exacta, y **playbooks** que ejecutan investigaciones curadas de varios pasos con las mismas comprobaciones que una respuesta suelta.

Toda consulta que pasa validación atraviesa además cuatro comprobaciones de veracidad antes de que sus resultados lleguen al modelo:

1. **Validación contra el mapping**: campos comprobados contra el mapping real del índice, no solo la lista blanca.
2. **Dry-run previo a la ejecución**: el almacén valida la consulta compilada antes de ejecutarla.
3. **Recuentos calculados por el almacén**: toda respuesta "cuántos" sale de `total_matching` o buckets que calculó OpenSearch. La muestra de alertas que ve el modelo va truncada explícitamente: contarla es imposible por diseño.
4. **Diagnóstico diferencial de cero resultados**: si no hay filas, la tubería sondea ventana temporal y cada filtro por separado, para distinguir "verificado: 214 documentos en la ventana, ninguno del agente db-99" de "la consulta estaba mal".

Además, cada afirmación sintetizada debe citar `[alert:id]`, `[agg:name]` o `[kb:id]`, y el servicio verifica cada cita contra lo recuperado. Una cita inventada aparece como evento de corrección, no como mentira segura; cada respuesta lleva etiqueta de verificabilidad con carril y comprobaciones ejecutadas.

[![Un turno como iconos: identidad, la cascada de carriles y la compuerta de veracidad en la ruta de lectura, y la ruta de escritura proponer-confirmar-ejecutar desviándose por debajo](/blog/wazuh/v3-turn-flow.png)](/blog/wazuh/v3-turn-flow.png)

*Un turno de punta a punta. Lectura: cascada de carriles y compuerta de veracidad de izquierda a derecha; escritura: desvío abajo para proponer, confirmar y ejecutar. Clic en cualquier diagrama para resolución completa.*

## La arquitectura: el chat vive dentro de Wazuh

El cambio más visible respecto al primer borrador es dónde está el chat. Ya no es app aparte: el asistente es el **Assistant de OpenSearch Dashboards dentro del Wazuh Dashboard**, conectado vía conector HTTP de ML Commons a una puerta de enlace headless. Los analistas chatean donde ya trabajan y heredan la sesión del dashboard. La misma puerta de enlace atiende otros tres bordes — n8n, API JSON directa y adaptador MCP para herramientas tipo Claude Desktop — con los mismos internos endurecidos.

[![El PoC autoalojado en una sola máquina: el nodo único de wazuh-docker con los plugins del Assistant y ML Commons, los contenedores de la puerta de enlace y la inferencia local, todo en una red Docker](/blog/wazuh/v3-selfhosted.png)](/blog/wazuh/v3-selfhosted.png)

*Todo salvo inferencia corre en una máquina; hasta inferencia puede. Con Ollama local, preguntas y evidencia no salen del host.*

El reparto importa. Dashboard y demás bordes son entradas, nada más. El cerebro es un **tool service** headless (la puerta de enlace) con el bucle de agente completo: resuelve entorno por clave, expone carriles de lectura, tubería de veracidad, capa de acciones y pista de auditoría. Una superficie HTTP por herramienta ejecuta exactamente una herramienta validada sin modelo — lo que impulsan evaluaciones deterministas.

## La cadena de identidad: la IA consulta como tú

Quería demostrar que el núcleo de razonamiento no puede falsificar identidad ni guarda credenciales permanentes de telemetría. La cadena tiene cuatro saltos; cada uno verifica el anterior, sin IdP externo.

El analista presenta credenciales Wazuh existentes. Un sidecar, el **auth-shim**, las verifica contra el *propio* indexador del entorno vía `authinfo`: la identidad es la que ya confía el plugin de seguridad de Wazuh — usuarios internos, LDAP o SSO — sin levantar nada nuevo. El shim confirma rol de analista y acuña la credencial de turno: JWT RS256 con doble audiencia, vida máxima diez minutos y claim de tenant derivado de *qué* entorno aceptó el login por `authinfo`, no de la petición. Solo el shim guarda la clave de firma; el tool service verifica con la pública, así que un núcleo comprometido no puede acuñar identidades.

El cuarto salto es el que más me gusta. La configuración de seguridad del indexer Wazuh gana un dominio JWT que confía en esa clave pública; el tool service reenvía el token del analista y el indexer lo resuelve a un rol de solo lectura acotado a índices de alertas. Las consultas de telemetría corren **como quien inició sesión**, y el techo se demuestra sin IA de por medio:

```bash
# permitido: leer alertas como el analista
curl -sk -H "Authorization: Bearer $TURN" \
  "https://localhost:9200/wazuh-alerts-*/_count" | jq

# denegado: el rol de analista no puede escribir, borrar ni leer otros índices
curl -sk -X DELETE -H "Authorization: Bearer $TURN" \
  "https://localhost:9200/wazuh-alerts-4.x-2026.07.08"
```

El asistente no puede mostrar más de lo que ese token puede leer, porque consulta con ese token. Los negativos fallan cerrados: JWT firmado con otra clave muere en verificación de firma, token de otro tenant se rechaza y audita, usuario sin rol de analista no recibe credencial de turno.

## Un puerto, tres posturas de inferencia

Todo lo anterior descansa en un único puerto de proveedor. El bucle habla internamente Converse de Bedrock; un adaptador traduce al dialecto chat-completions de OpenAI, herramientas incluidas. Cambiar backend es `.env` más recrear contenedor; nada por encima del puerto se mueve: mismo bucle, misma IR, mismas comprobaciones, misma identidad, misma auditoría.

Esa costura habilita tres posturas de soberanía distintas:

| Backend | Qué cruza el límite de la máquina | Cuándo usarlo |
|---|---|---|
| Amazon Bedrock | Pregunta más evidencia compactada, bajo términos AWS sin retención ni entrenamiento | Semántica de producción; Guardrails por invocación |
| Ollama (local) | Nada. Aislado por completo | Demo de soberanía estricta, y gratis |
| Groq u otra nube OpenAI-compatible | Pregunta y evidencia bajo términos de ese proveedor | Solo laboratorio |

Dos niveles de modelo (pequeño para enrutado barato, mayor para investigación) pueden ir a proveedores distintos: enrutador local + análisis en Bedrock son dos líneas de config. Para local, los sparse MoE fueron el desbloqueo práctico: `gpt-oss:20b` da calidad de modelo grande con ~3.6B activos en 16 GB; `qwen3:30b-a3b` cabe entero en 24 GB VRAM. También monté un carril experimental de profundidad con layer streaming al estilo AirLLM, que ejecuta modelos clase 70B en GPU de 4 GB a 0.07-0.7 tokens/s. No es chat interactivo y ninguna config lo convierte en uno: está posicionado como carril batch nocturno para una pregunta dura, nunca como ruta del chat.

## Cuando los logs contraatacan

Un asistente de SIEM tiene un modelo de amenazas raro: la entrada más peligrosa no es la pregunta del usuario, sino la evidencia. Los cuerpos de alerta contienen lo que un atacante logró escribir en un log; cada pieza que lee el modelo puede ser instrucción adversaria. La tubería la trata así. La pregunta pasa filtro de prompt injection; la evidencia recuperada pasa guardrail propio antes de llegar al modelo; la salida pasa tercera comprobación de secretos, PII y grounding; la verificación de citas elimina y marca afirmaciones que citan evidencia no recuperada. Al navegador llega Markdown saneado: sin HTML, sin enlaces externos, sin imágenes de carga automática.

La defensa honesta, en todo caso, es estructural: todas las herramientas invocables son solo lectura y acotadas al tenant; una inyección perfecta no tiene nada peligroso que secuestrar. Y como intervenciones de guardrails y fallos de cita son eventos de auditoría en el indexer del tenant, el *intento* de inyección se convierte en detección SOC sobre el atacante. El asistente transforma el ataque en telemetría.

## Reconocer antes de razonar

La optimización que más me gustó no necesitó GPU. Los analistas repiten las mismas preguntas operativas; no necesitan modelo de razonamiento. El carril 0 embebe la pregunta con un modelo local pequeño (`bge-m3`, inglés y español en un espacio), compara ejemplos curados por coseno, extrae slots (ventanas temporales, nombres de agente) con reglas bilingües deterministas y ejecuta la plantilla acertada por la misma tubería de veracidad. Acierto: decenas de ms, cero tokens; en Bedrock, las preguntas frecuentes no cuestan. Fallo: escala en silencio; el carril 0 no rompe el asistente, solo lo alivia.

Un umbral de coseno solo, sin embargo, dispara plantilla equivocada ante paráfrasis con negación; un acierto necesita más que superar 0.80. La banda 0.65-0.80 no ejecuta plantilla: inyecta el ejemplo más cercano como pista few-shot transitoria tras el prefijo estable, para no envenenar la caché de prompts. Reconocimiento *casi* seguro ayuda sin fingir certeza.

A su lado, caché de evidencia con clave = hash del plan canónico y límites temporales redondeados a rejilla TTL: "últimas 24 h" preguntado dos veces en el mismo minuto es una consulta, no dos. Las respuestas cacheadas declaran `served_from_cache`; un asistente basado en verificabilidad no puede esconder atajos.

## El carril de conocimiento, ya implementado

Los analistas no solo preguntan telemetría. También "qué significa la regla 5710" o "cómo enrolo un agente"; esas preguntas merecen el mismo tratamiento de veracidad. El asistente tiene carril de conocimiento sobre documentación oficial Wazuh: corpus fijado a versión, ingerido, troceado y embebido; `knowledge_search` recupera, y cada pasaje se cita como `[kb:id]` y se verifica como `[alert:id]`. Es el único sitio donde se embebe algo, a propósito: el único almacén vectorial del diseño es sobre *referencia pública*, nunca telemetría de tenant. Los datos del tenant se consultan, no se embeben.

Junto a él, herramientas de búsqueda exacta resuelven metadatos sin semántica: `rule_reference` para ID o grupo de regla, `field_dictionary` para nombre de campo, `mitre_lookup` sobre corpus ATT&CK curado en la imagen, `describe_capabilities` para "qué sabes hacer". El enrutador de referencia reconoce esas formas y llama la herramienta correcta directo — sin modelo, sin embedding — mientras preguntas abiertas de "cómo hago / cómo remediar" van al carril semántico de documentación. Reconocimientos recurrentes: carril determinista; solo lo abierto llega al modelo.

## El modelo propone, un humano dispone

El otro hito implementado son acciones de escritura. Tarde o temprano piden *hacer* algo — reiniciar agente, silenciar regla ruidosa — y la regla de seguridad es estructural, como todo: el núcleo no posee credenciales que ejecuten acciones. Cuando el modelo emite `propose_action`, la puerta de enlace valida contra lista blanca, verifica el objetivo consultando el indexador como el analista, y renderiza tarjeta de hechos que el modelo no escribió. Nada corre hasta confirmación humana; la ejecución va bajo credencial de mínimo privilegio por nivel que el modelo no tiene — dashboard, manager o active-response, cada una con identidad acotada. Niveles de alto riesgo exigen retipear el nombre del objetivo. La mitad operativa — capacidad, flujo de acciones, auditoría, respuesta a incidentes — tiene artículo propio: [Operar un asistente de IA en un SOC](/es/blog/operar-ia-wazuh-soc/).

## Demostrarlo en lugar de enseñarlo

Las demos no convencen; el laboratorio convierte afirmaciones en aserciones. Un generador escribe ~2000 alertas sintéticas con semilla determinista y registra verdades exactas en fichero. Un golden set bilingüe de 32 casos corre contra el stack vivo por la cadena completa — login a respuesta final — comprobando selección de herramientas, recuentos contra verdad conocida, honestidad ante cero resultados, resistencia a prompt injection y ausencia de citas sin verificar. Sale con código distinto de cero ante cualquier fallo: puerta de CI; cambios de prompt no pueden fusionarse sin evaluar. Suites aparte cubren acciones de escritura (`make evals-actions`) y borde del conector del dashboard (`make evals-connector`); la suite unitaria pasó de 26 a más de 150 tests en el núcleo determinista — validación IR, compilación DSL, extracción de slots del carril 0, claves de caché, comprobaciones de citas.

Los bordes operativos recibieron el mismo trato. Respuestas token a token; capacidad es cola acotada que rechaza honestamente en lugar de degradar en silencio; kill switch convierte superficies en 503 cuando hace falta; endpoint Prometheus expone turnos por carril, resultados de herramientas e histogramas de latencia.

## Pruébalo tú mismo

El laboratorio completo está en [`integrations/ai-assistant`](https://github.com/leonfullxr/Wazuh/tree/main/integrations/ai-assistant) de mi repo Wazuh, junto a otras integraciones y PoCs alrededor de la plataforma. Reproducible en cualquier Linux con Docker y ~10 GB RAM libres (más si quieres inferencia local):

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

Abre `https://localhost`, pulsa **Assistant** y pregunta "¿cuántas alertas en las últimas 24 horas?". Si ya tienes Wazuh, no hace falta crear uno: dos instaladores idempotentes apuntan el mismo asistente a un despliegue existente — `install_gateway.sh` levanta puerta de enlace, modelo local y objetos de seguridad; `install_dashboard_assistant.sh` instala plugins del Assistant y conecta ML Commons. Un README recorre cada sección con detalle ejecutable, de Bedrock a variante aislada de red. Si lo pruebas y quieres comparar notas, [escríbeme](/es/#contact).

## De una máquina a una flota

La PoC replica a propósito el diseño de producción. Puerta de enlace, identidad y tubería de veracidad son idénticas sirvan un entorno o muchos; la diferencia estructural es el registro: aquí una entrada, en producción N, cada una resuelta por credencial por entorno.

[![Dos posturas de despliegue, un solo código: autoalojado en una sola máquina frente a nube multi-entorno, compartiendo la misma puerta de enlace, identidad y veracidad](/blog/wazuh/v3-deployment-postures.png)](/blog/wazuh/v3-deployment-postures.png)

*Mismo núcleo, identidad y comprobaciones. Solo cambia dónde corren las piezas — y si la inferencia sale del host — entre PoC autoalojada y forma multi-entorno en nube.*

En producción el laboratorio va a EKS con namespace por entorno tras NetworkPolicy de denegación por defecto; cada entorno recibe rol IAM (IRSA), perfil de inferencia y guardrail Bedrock, y clave KMS propia. La ruta de IA no toca internet: Bedrock, STS, Secrets Manager y logs vía endpoints de interfaz VPC; auditoría aterriza en indexer del entorno y bucket S3 con Object Lock. El único salto compartido de datos es la flota stateless de Bedrock — exactamente el salto sin retención.

## Lo que endurecería después

Una PoC gana credibilidad conociendo sus huecos. Mi lista, en orden:

- **La caché de evidencia debe incluir identidad en la clave, no solo el plan.** Dos analistas con permisos distintos no deben compartir entrada; el conjunto efectivo de roles entra en la clave. Bug que solo existe porque la caché funciona.
- **Los JWT de turno necesitan revocación.** Diez minutos es poco, pero un kill switch no debería esperar expiración; una lista de denegación de `jti` en memoria cierra la ventana.
- **El diagnóstico de cero resultados debe pagar bajo admisión.** Las sondas diferenciales multiplican consultas al indexer en cada turno vacío; deben ir bajo el mismo semáforo, etiquetadas en auditoría.
- **Los modelos locales merecen decodificación restringida.** Forzar gramática de Query IR convierte bucles parsear-y-reintentar en validez al primer intento; en un 20B local es latencia recuperada.
- **La deriva de escalada debería avisar.** Las métricas por carril existen; alerta sobre tasa creciente del carril 2 caza regresión de prompt antes de que alguien note respuestas más lentas y caras.
- **La pata Bedrock falta por demostrar.** Inferencia local validada end-to-end; postura en nube, incluida contabilidad de tokens con caché de prompts, es el único backend que aún no he corrido contra el golden set completo.

Nada cambia la arquitectura. Ese es el sentido de acertar primero la estructura: todo en la lista es endurecimiento dentro de una costura ya existente.

Las dos adiciones que señalé como hitos — carril de conocimiento y acciones con aprobación humana — son las secciones de arriba, implementadas y validadas en vivo. Las conversaciones multi-turno también persisten entre turnos, así que preguntas de seguimiento sobre evidencia anterior siguen siendo verificables. Lo que queda genuinamente abierto, más que sin construir, es la suite de aislamiento multi-tenant: la forma está, el registro es real, pero afirmar aislamiento entre tenants vivos es trabajo que aparté para mantener afilada la historia autoalojada.

## Lo que me llevo

Tres lecciones sobrevivieron a la implementación. Primera: la veracidad es estructural o no es nada — listas blancas, compilación en servidor, recuentos del almacén y citas verificadas aportan más confianza que prompt engineering, porque aguantan cuando el modelo falla. Segunda: la identidad es la funcionalidad que nadie enseña en demos y todos necesitan. Consultar como el usuario vía dominio JWT significa que la IA hereda permisos de quien pregunta; esa propiedad responde la mayoría de preguntas difíciles de multi-tenancy antes de formularse. Tercera: la ingeniería honesta gana a la impresionante. El carril de profundidad con layer streaming es lo más vistoso del stack, y lo más valioso fue medirlo, decir que 0.2 tokens/s no es chat, y confinarlo donde ayuda de verdad.

Un asistente de SIEM no gana confianza sonando convincente. La gana siendo comprobable — decisión de arquitectura.

*Esta es la mitad de diseño. La mitad operativa — capacidad sin balanceador, acciones con aprobación humana, mapa de auditoría y playbook de incidentes — está en [Operar un asistente de IA en un SOC](/es/blog/operar-ia-wazuh-soc/).*
