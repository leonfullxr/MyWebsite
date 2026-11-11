---
title: "Modelos frontera entrenando a sus reemplazos locales"
date: "2026-11-10"
description: "Una nota de lectura sobre el plan de Simon Høiberg para pasar trabajo de GPT-6 y Opus 5.5 a modelos locales ajustados, una tarea cada vez, con datos de entrenamiento, evals y un benchmark privado."
tags: ["Inteligencia artificial", "Self-Hosting", "Aprendizaje automático"]
image: "/images/blog/covers/local-models.png"
lang: "es"
translation: "frontier-models-training-local-replacements"
---

Simon Høiberg dirige cuatro productos SaaS con un equipo pequeño y muchos agentes de IA. En [I'm using GPT-6 to train its own replacement](https://www.youtube.com/watch?v=KVM7Tm7Sikw), publicado el 9 de noviembre de 2026, explica por qué quiere sacar ese trabajo de los modelos de OpenAI y Anthropic y cómo piensa trasladarlo a modelos de pesos abiertos que ejecuta él mismo. Su equipo ya dejó AWS, Supabase y Vercel por una infraestructura autoalojada, así que la dirección le resultará conocida a quien haya leído mis entradas sobre servicios en casa.

## Por qué quiere irse

Høiberg reconoce que GPT-6 y Opus 5.5 explican buena parte de lo que su equipo puede hacer. Su queja es el control. Los límites de uso se endurecen sin aviso, la calidad del modelo cambia de un día para otro y los modelos rechazan más trabajo rutinario que antes. Sus ejemplos vienen del marketing: actualizar una web siguiendo instrucciones, escribir artículos comparativos, configurar campañas de anuncios. Describe modelos que exigen pruebas de cada afirmación y que, en un caso, devolvieron a "en curso" una tarea que él ya había aprobado.

Lo compara con un proveedor de hosting que te diera servidores más lentos cada vez que lanza un producto, sin decírtelo. Te irías ese mismo día. Con los modelos alojados, sostiene, una empresa no tiene voz sobre la inteligencia con la que funciona.

El obstáculo es la calidad. En un vídeo anterior dejó que Qwen 3.8 editara un vídeo completo, y terminó el trabajo, pero tomó decisiones extrañas y su harness tuvo que esforzarse para mantenerlo encauzado. Un modelo pequeño no va a igualar a un modelo frontera en general. Su plan solo necesita que lo iguale en una tarea concreta.


<figure class="architecture-figure">
<picture class="diagram-light">
  <source media="(max-width: 600px)" srcset="/images/blog/local-model-loop-es-mobile.svg">
  <img src="/images/blog/local-model-loop-es.svg" alt="Datos de entrenamiento, ajuste fino, benchmark y evaluación forman un ciclo para sustituir un modelo frontera en una tarea.">
</picture>
<picture class="diagram-dark">
  <source media="(max-width: 600px)" srcset="/images/blog/local-model-loop-es-dark-mobile.svg">
  <img src="/images/blog/local-model-loop-es-dark.svg" alt="Datos de entrenamiento, ajuste fino, benchmark y evaluación forman un ciclo para sustituir un modelo frontera en una tarea.">
</picture>
</figure>

## Datos de entrenamiento generados por el modelo frontera

El vídeo construye tres cosas alrededor de cada tarea, con la atención al cliente como ejemplo. La primera es el ajuste fino. El equipo no toca los pesos de Qwen y entrena una LoRA, un pequeño conjunto de pesos adicionales que se aplica sobre el modelo base. Un mismo modelo base puede llevar varios adaptadores, por ejemplo uno para soporte y otro para código. Høiberg lo compara con las skills de Claude Code, que son instrucciones que el modelo lee en cada ejecución; una LoRA cambia los propios pesos.

Un ejemplo de entrenamiento para soporte recoge la sesión entera. El agente revisa la cuenta y el pago del cliente en Stripe, consulta logs y trazas, decide qué herramientas llamar y solo entonces responde. Nadie puede escribir miles de esas sesiones a mano, así que el equipo le da a un modelo frontera sus mejores casos reales, la documentación del producto y sus normas de soporte, y le pide que genere y resuelva miles de tickets sintéticos. Los ejemplos flojos se descartan y Høiberg revisa una muestra personalmente.

El entrenamiento se ejecuta en una GPU alquilada en Vast, y el resultado es un archivo de adaptador que el equipo conserva. La inferencia usa el modo serverless de Vast, que escala a cero. Qwen queda en reposo hasta que llega un ticket, carga el adaptador de soporte, hace el trabajo y se apaga de nuevo.

## Un árbitro antes de enviar nada

Un modelo pequeño ajustado sigue cometiendo más errores que GPT-6, y Høiberg no quiere revisar cada respuesta. La segunda pieza es un eval: un pequeño programa que se ejecuta cuando el agente termina y antes de que el cliente vea nada. Devuelve aprobado o rechazado, con un motivo.

Su ejemplo es un cliente cuya cuenta quedó en pausa porque le caducó la tarjeta. El agente encuentra el pago fallido y la tarjeta nueva, y responde que ha cobrado en la tarjeta nueva y reactivado la cuenta. No hizo ninguna de las dos cosas. La regla que lo detecta dice que toda acción que afirme la respuesta tiene que haber ocurrido.

El eval lee la sesión registrada y nunca toca la cuenta real de Stripe. Comprueba en dos pasos. Código normal responde las preguntas de sí o no: hubo una llamada de reintento, Stripe confirmó el cobro, la cuenta está activa. Un modelo pequeño se ocupa del texto de la respuesta. Enumera cada acción que la respuesta afirma, marca si el log la recoge y contesta en un formato fijo que cita la frase que incumple la regla.

El equipo prueba el eval antes de fiarse de él. Un modelo frontera toma sesiones correctas y las rompe a propósito, por ejemplo quitando el reintento o haciendo que Stripe rechace la tarjeta mientras la respuesta sigue diciendo "todo listo". También genera casos que parecen incorrectos pero no lo son, como un pago que sigue en proceso. El eval se ejecuta contra cientos de estas sesiones etiquetadas, y el equipo ajusta las reglas hasta que detecta las rotas y deja pasar las buenas. Los errores nuevos con clientes reales se añaden al conjunto de pruebas. Como el estándar vive en un eval probado, sustituir GPT-6 por el modelo ajustado mantiene las mismas reglas.

<figure class="architecture-figure">
<picture class="diagram-light">
  <source media="(max-width: 600px)" srcset="/images/blog/reply-eval-es-mobile.svg">
  <img src="/images/blog/reply-eval-es.svg" alt="El evaluador compara las afirmaciones de una respuesta de soporte con los resultados registrados antes de aprobarla.">
</picture>
<picture class="diagram-dark">
  <source media="(max-width: 600px)" srcset="/images/blog/reply-eval-es-dark-mobile.svg">
  <img src="/images/blog/reply-eval-es-dark.svg" alt="El evaluador compara las afirmaciones de una respuesta de soporte con los resultados registrados antes de aprobarla.">
</picture>
</figure>

## Un benchmark privado

La tercera pieza decide cuándo está listo un modelo local. Un eval comprueba un trabajo concreto; un benchmark puntúa un modelo sobre un conjunto fijo de tareas con respuestas conocidas. Los benchmarks públicos como SWE-bench miden lo que les interesa a los laboratorios, así que el equipo construyó uno con su propio trabajo: casos de soporte, cambios de código, briefs de marketing, contactos con partners y guiones de vídeo. Mantenerlo privado reduce el riesgo de que los modelos hayan visto los casos durante el entrenamiento.

Cada caso parte de trabajo real reciente, y la IA convierte un puñado de buenos ejemplos en unos cientos de variaciones. Un modelo frontera redacta la respuesta de referencia, Høiberg corrige una muestra y cada caso recibe el eval que lo califica. Los casos que aprueban todos los modelos se eliminan, y los errores pasados se convierten en casos permanentes con variantes más difíciles. Después el conjunto se bloquea, para que una puntuación de hoy signifique lo mismo que una dentro de tres meses.

GPT-6, Opus 5.5, Qwen sin ajustar y los modelos Qwen ajustados pasan por los mismos casos. En sus resultados, los modelos ajustados puntúan muy por encima de Qwen sin ajustar, y algunos alcanzan a los modelos frontera. Los fallos indican qué datos de entrenamiento generar a continuación. Cuando un modelo local resuelve aproximadamente tantos casos como los modelos frontera, incluidos los difíciles y los permanentes, se queda con esa tarea.

## Lo que me llevo

Lo primero que copiaría es el eval, y funciona sin ningún ajuste fino. Comprobar que cada acción que afirma una respuesta aparece en el log de la sesión sigue el mismo principio que mi [asistente de SOC con IA basado en evidencias](/en/blog/evidence-first-ai-soc/) (en inglés): el modelo redacta la respuesta y las comprobaciones contra la evidencia registrada deciden si sale. Código para los hechos y un modelo con un alcance estrecho para el texto es una división que encaja en casi cualquier trabajo con agentes.

Tengo dos reservas. Las puntuaciones del benchmark son de Høiberg y el vídeo no publica los casos, así que muestran su método más que demostrar un resultado. Además, antes de generar datos de entrenamiento con un modelo alojado, conviene leer los términos del proveedor. Los términos de OpenAI y de Anthropic han restringido el uso de sus resultados para desarrollar modelos competidores, y un plan para sustituirlos queda cerca de esa línea. El vídeo no lo menciona.

Su consejo final es elegir una tarea, partir de tu mejor trabajo real y construir los datos de entrenamiento, el eval y el benchmark antes de ajustar nada. Ese orden compensa aunque nunca dejes un modelo alojado, porque el eval y el benchmark te dicen si un cambio de modelo ha mejorado o empeorado tu trabajo.
