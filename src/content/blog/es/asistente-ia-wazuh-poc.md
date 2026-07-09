---
title: "Un asistente de IA fiable para Wazuh: diseño y PoC autoalojado"
date: "2026-07-09"
description: "Cómo diseñé y autoalojé un asistente de seguridad con IA para Wazuh cuyas respuestas son verificables por construcción, con una cadena de identidad real e inferencia intercambiable desde Amazon Bedrock hasta modelos completamente locales."
tags: ["Ciberseguridad", "IA", "SIEM", "AWS"]
lang: "es"
---

Todos los equipos SOC que conozco están experimentando con la misma idea: dejar que los analistas pregunten a su SIEM en lenguaje natural. "¿Cuántos fallos de autenticación hubo en las últimas 24 horas y qué usuarios fueron objetivo?" es una interfaz mejor que un DSL de consultas, y los modelos de lenguaje claramente son capaces de soportarla. La parte incómoda es lo que ocurre después. Un modelo de lenguaje responderá a esa pregunta con total fluidez sea o no cierta la respuesta, y en un contexto de operaciones de seguridad un número equivocado dicho con confianza es peor que ningún número.

Así que el problema de ingeniería interesante no es "puede una IA responder preguntas sobre mis alertas". Es "puedo demostrar que la respuesta es verdadera, siempre, de forma estructural". Este artículo recorre una prueba de concepto que diseñé y autoalojé tomándose esa pregunta en serio: un asistente de IA para [Wazuh](https://wazuh.com/) donde la veracidad es una propiedad de la arquitectura y no una esperanza expresada en un system prompt. Todo funciona en una sola máquina Linux con Docker, y la inferencia es intercambiable, desde Amazon Bedrock hasta un modelo local completamente aislado de la red.

## El principio central: el modelo nunca escribe consultas

La decisión de la que se deriva todo lo demás es esta: **el modelo de lenguaje nunca escribe una consulta contra el almacén de datos y nunca calcula un número**. En su lugar, el asistente enruta cada pregunta a través de una escalera de carriles, ordenados por lo verificable que resulta la respuesta:

- **Carril 0, sin modelo.** La pregunta se convierte en un embedding y se compara con un corpus curado de ejemplos bilingües. Si la similitud supera un umbral (0.80), se ejecuta directamente una plantilla tipada preaprobada y la respuesta la genera código determinista. Unos 40 milisegundos y cero tokens de modelo.
- **Carril 1, herramientas tipadas.** El modelo elige de un catálogo pequeño de herramientas tipadas (`count_alerts`, `top_rules`, `auth_failures`, `alert_histogram` y similares). Los parámetros se validan contra un esquema. El modelo elige, nunca compone.
- **Carril 2, un plan de consulta restringido.** Para preguntas que el catálogo no puede expresar, el modelo emite una representación intermedia tipada (una Query IR) en lugar de una consulta cruda. La IR se valida contra una lista blanca de campos, se compila a DSL de OpenSearch en el servidor, y nunca puede contener scripts, expresiones regulares ni comodines porque el compilador no tiene ninguna ruta de código que los emita.
- **El carril 3, generación libre de consultas, existe como concepto y permanece apagado.**

Toda consulta que supera la validación pasa además por cuatro comprobaciones de veracidad antes de que sus resultados lleguen al modelo:

1. **Validación contra el mapping**: los campos se comprueban contra el mapping real del índice, no solo contra la lista blanca.
2. **Dry-run previo a la ejecución**: el almacén de datos valida la consulta compilada antes de ejecutarla.
3. **Recuentos calculados por el almacén**: toda respuesta de tipo "cuántos" proviene de `total_matching` o de buckets de agregación que calculó OpenSearch. La lista de alertas de muestra que se entrega al modelo está truncada de forma explícita, así que contarla es imposible por construcción.
4. **Diagnóstico diferencial de cero resultados**: cuando una consulta no devuelve nada, la tubería sondea la ventana temporal y cada filtro por separado, de modo que la respuesta puede distinguir entre "verificado: hay 214 documentos en la ventana y ninguno es del agente db-99" y "la consulta estaba mal".

Por último, cada afirmación de una respuesta sintetizada debe citar un identificador `[alert:id]` o `[agg:name]`, y el servicio verifica cada cita contra lo que realmente se recuperó. Una cita inventada aflora como un evento de corrección en lugar de una mentira dicha con confianza, y cada respuesta lleva una etiqueta de verificabilidad que indica qué carril la produjo y qué comprobaciones se ejecutaron.

```
pregunta ──▶ admisión ──▶ ¿carril 0? ──acierto──▶ plantilla tipada ──▶ respuesta
                              │ fallo                            (sin modelo)
                              ▼
                 bucle de agente (llamadas acotadas)
          el modelo elige herramienta tipada o emite Query IR
                              │
             validar ▸ compilar ▸ mapping ▸ dry-run
                              │
               ejecutar como el analista (turn JWT)
                              │
        totales exactos + agregaciones + muestra truncada
                              │
       síntesis con citas [alert:id], verificadas después
                              ▼
                respuesta + etiqueta de verificabilidad
```

## La arquitectura en una sola máquina

El PoC es un overlay de Docker Compose sobre el stack oficial `wazuh-docker` de nodo único, que aporta un indexer, un manager y un dashboard reales de Wazuh 4.14. Alrededor hay cuatro contenedores:

[![Qué corre dónde: el stack autoalojado en una sola máquina y el puerto de inferencia enchufable](/blog/wazuh/1-local-poc-harness.png)](/blog/wazuh/1-local-poc-harness.png)

*Todo excepto la inferencia corre en una sola máquina, y hasta la inferencia puede. Haz clic en cualquier diagrama para verlo a resolución completa.*

El reparto de responsabilidades importa. n8n es la puerta de entrada y nada más, un canal de chat y pegamento de flujos. El cerebro es un **tool service** sin interfaz propia que posee el bucle de agente completo y expone tres superficies: una API de chat por SSE con streaming de tokens, un endpoint JSON síncrono, y una superficie HTTP por herramienta que ejecuta exactamente una herramienta validada sin ningún modelo de por medio. Los mismos internos endurecidos responden por todas las puertas.

## La cadena de identidad: la IA consulta como tú

La propiedad que quería demostrar es que el núcleo de razonamiento no puede falsificar una identidad y no posee ninguna credencial permanente que lea telemetría. La cadena tiene cuatro saltos y cada salto verifica el anterior.

[![Una pregunta de principio a fin: la cadena de identidad y luego la tubería de veracidad en cada llamada a herramienta](/blog/wazuh/2-turn-data-flow.png)](/blog/wazuh/2-turn-data-flow.png)

*Una pregunta de principio a fin: primero la cadena de identidad, luego la tubería de veracidad en cada llamada a herramienta, con el carril 0 desviándose pronto.*

El analista se autentica contra el proveedor de identidad y obtiene un token OIDC. Un sidecar dedicado, el **auth-shim**, verifica ese token contra el JWKS del IdP, comprueba que el usuario tiene el rol de analista y acuña la credencial del turno: un JWT RS256 con doble audiencia, una vida máxima de diez minutos y un claim de tenant que proviene de la configuración del despliegue y nunca de la petición. El shim es el único contenedor que guarda la clave de firma. El tool service verifica solo con la clave pública, de modo que ni siquiera un núcleo de razonamiento comprometido puede acuñar identidades.

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

[![Un puerto de proveedor, tres posturas: qué sale realmente de tu máquina según el backend](/blog/wazuh/3-inference-backends.png)](/blog/wazuh/3-inference-backends.png)

*Un puerto de proveedor, tres posturas. Lo que cruza el límite de la máquina depende por completo del backend que vincules.*

Esa única costura produce tres posturas de soberanía muy distintas:

| Backend | Qué cruza el límite de la máquina | Cuándo usarlo |
|---|---|---|
| Amazon Bedrock | La pregunta más la evidencia compactada, bajo términos de AWS sin retención ni entrenamiento | Semántica de producción, los Guardrails se aplican por invocación |
| Ollama (local) | Nada. Completamente aislado | La demo de soberanía más estricta, y gratis |
| Groq u otra nube OpenAI-compatible | Pregunta y evidencia bajo los términos de ese proveedor | Solo experimentos de laboratorio |

Los dos niveles de modelo (un modelo pequeño de enrutado para las decisiones baratas y un modelo mayor de análisis para el bucle de investigación) pueden vincularse cada uno a un proveedor distinto, así que un enrutador local con análisis en Bedrock son dos líneas de configuración. Para servir en local, los modelos sparse mixture-of-experts resultaron ser el desbloqueo práctico: `gpt-oss:20b` da calidad de modelo grande con unos 3.6B de parámetros activos y corre en una máquina de 16 GB, y `qwen3:30b-a3b` cabe entero en 24 GB de VRAM. En el extremo monté un carril de profundidad experimental alrededor del layer streaming al estilo AirLLM, que de verdad ejecuta modelos de clase 70B en una GPU de 4 GB, a entre 0.07 y 0.7 tokens por segundo. Eso no es un asistente interactivo y ninguna configuración lo convierte en uno, así que está posicionado honestamente como un carril por lotes para una pregunta difícil durante la noche, nunca como la ruta del chat.

## Reconocer antes de razonar

La optimización que más me gusta no necesitó ninguna GPU. Los analistas hacen las mismas preguntas operativas constantemente, y esas preguntas no necesitan un modelo de razonamiento. El carril 0 convierte cada pregunta entrante en un embedding con un modelo local pequeño (`bge-m3`, que maneja inglés y español en un mismo espacio), la compara con los ejemplos curados por similitud coseno, extrae slots como ventanas temporales y nombres de agente con reglas bilingües deterministas, y ejecuta la plantilla acertada a través de la misma tubería de veracidad que cualquier otro carril. Un acierto responde en decenas de milisegundos con cero tokens de modelo, y en Bedrock eso significa literalmente que las preguntas más frecuentes no cuestan nada. Un fallo escala en silencio, así que el carril 0 nunca puede romper el asistente, solo aliviarlo.

[![Cascada de consultas: carril 0, los niveles de enrutado y análisis, el carril de profundidad y la tubería de veracidad compartida](/blog/wazuh/4-query-cascade.png)](/blog/wazuh/4-query-cascade.png)

*Reconocer antes de razonar: cada etapa solo ve lo que la anterior no pudo responder, y todas pasan por la misma tubería de veracidad.*

A su lado hay una caché de evidencia cuya clave es un hash del plan de consulta canónico, con los límites temporales redondeados a una rejilla de TTL, de modo que "las últimas 24 horas" preguntado dos veces en el mismo minuto es una consulta y no dos. Las respuestas cacheadas declaran `served_from_cache`, porque un asistente construido sobre la verificabilidad no tiene derecho a esconder sus atajos.

## Demostrarlo en lugar de enseñarlo

Las demos no convencen a nadie, así que el laboratorio convierte sus afirmaciones en aserciones. Un generador escribe unas dos mil alertas sintéticas con semilla determinista y registra las verdades exactas en un fichero. Un conjunto dorado bilingüe de casos de evaluación se ejecuta después contra el stack vivo a través de la cadena completa, desde el login OIDC hasta la respuesta final, comprobando la selección de herramientas, los recuentos contra la verdad conocida, la honestidad ante cero resultados, la resistencia a inyección de prompts y la ausencia de citas sin verificar. Sale con código distinto de cero ante cualquier fallo, lo que lo convierte en una puerta de CI: los cambios de prompt pasan a ser físicamente incapaces de fusionarse sin evaluar. Una suite unitaria aparte de 26 tests cubre el núcleo determinista, es decir, la validación de la IR, la compilación a DSL, la extracción de slots del carril 0 y las claves de caché.

Los bordes operativos recibieron el mismo trato. Las respuestas fluyen token a token, la capacidad es una cola acotada que rechaza honestamente en lugar de degradar en silencio, un kill switch convierte todas las superficies en un 503 cuando hace falta, y un endpoint de Prometheus expone turnos por carril, resultados de herramientas e histogramas de latencia.

## Pruébalo tú mismo

El laboratorio completo está publicado en [`integrations/ai-assistant`](https://github.com/leonfullxr/Wazuh/tree/main/integrations/ai-assistant) de mi repositorio de Wazuh, junto al resto de integraciones y PoCs que he construido alrededor de la plataforma. Es reproducible en cualquier máquina Linux con Docker y unos 8 GB de RAM libre (más si quieres inferencia local):

```bash
cp .env.example .env      # elige dentro un backend de inferencia
make keys                 # par de claves JWT por tenant
make wazuh                # wazuh-docker oficial de nodo único, con certificados
make securityconfig       # dominio de autenticación JWT + rol de analista de solo lectura
make ollama               # opcional: inferencia completamente local
make poc                  # keycloak, n8n, auth-shim, tool service
make seed                 # ~2000 alertas sintéticas con verdades conocidas
make evals                # el conjunto dorado bilingüe, de extremo a extremo
make test                 # 26 tests unitarios del núcleo determinista
```

Está todo allí: el overlay de compose, el auth shim, el tool service, el generador de alertas, el conjunto dorado con su ejecutor, y un README que recorre cada sección de este artículo con detalle ejecutable, desde la configuración de Bedrock hasta la variante aislada de la red. Si lo pruebas y quieres comparar notas, [escríbeme](/es/#contact).

## Lo que me llevo

Tres lecciones sobrevivieron al contacto con la implementación. Primera, la veracidad es estructural o no es nada: las listas blancas, la compilación en servidor, los recuentos calculados por el almacén y las citas verificadas hacen más por la confianza que cualquier cantidad de prompt engineering, porque se sostienen incluso cuando el modelo se equivoca. Segunda, la identidad es la funcionalidad que nadie enseña en demos y todo el mundo necesita. Consultar como el usuario a través de un dominio de autenticación JWT significa que la IA hereda exactamente los permisos de la persona que pregunta, y esa única propiedad responde la mayoría de las preguntas difíciles de multi-tenancy antes de que se formulen. Y tercera, la ingeniería honesta gana a la ingeniería impresionante. El carril de profundidad con layer streaming es técnicamente la parte más vistosa del stack, y lo más valioso que hice con él fue medirlo, decir que 0.2 tokens por segundo no es una experiencia de chat, y confinarlo al carril donde ayuda de verdad.

Un asistente para un SIEM no se gana la confianza sonando convincente. Se la gana siendo comprobable, y eso es una decisión de arquitectura.
