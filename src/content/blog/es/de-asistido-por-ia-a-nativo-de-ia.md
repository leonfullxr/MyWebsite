---
title: "Del desarrollo asistido por IA al desarrollo nativo de IA"
date: "2026-11-14"
description: "Una nota de lectura sobre los experimentos de Amazon con agentes de programación: qué miden las cifras de 20x y 4,5x, qué encontraron los estudios independientes y qué prácticas de ingeniería parecen marcar la diferencia."
tags: ["Inteligencia artificial", "Ingeniería de software", "Agentes"]
image: "/images/blog/covers/agents.png"
lang: "es"
translation: "from-ai-assisted-to-ai-native-development"
---

Este año circulan dos tipos de cifras sobre herramientas de programación con IA, y cuesta encajarlas. Amazon cuenta que seis ingenieros reconstruyeron el motor de inferencia de Amazon Bedrock en 76 días, un proyecto estimado en su día en 30 desarrolladores y más de un año, y habla de una productividad individual 20 veces mayor. Por otro lado, DX analizó el volumen de pull requests en más de 400 empresas y encontró una mejora mediana del 7,76%, y un estudio aleatorizado de METR concluyó que desarrolladores con experiencia tardaban un 19% más cuando podían usar IA.

Llegué a este tema por dos vídeos: [I Looked Into How Devs Are Actually Using AI](https://www.youtube.com/watch?v=qCheZDyFX2U), de ForrestKnight, y [From AI-Assisted to AI-Native: Building a Frontier Development Team](https://www.youtube.com/watch?v=pqlWNihgdjI), la charla en la que Clare Liguori, senior principal engineer en AWS, repasa los experimentos de Amazon. Las cifras que cito salen de los textos que Amazon ha publicado, el [artículo de AWS sobre equipos frontera](https://aws.amazon.com/blogs/machine-learning/how-frontier-teams-are-reinventing-ai-native-development/) de Swami Sivasubramanian y el [caso de estudio de Kiro sobre Bedrock](https://kiro.dev/case-studies/bedrock/), para que se puedan comprobar. Mi lectura es que el tamaño de la mejora depende menos de la herramienta que elige un equipo que de cuánto cambia su proceso de desarrollo alrededor de ella. Las pruebas que respaldan esa idea son más débiles de lo que sugieren los titulares, y el resto del artículo repasa ambas cosas.

## Asistido y nativo son flujos de trabajo distintos

La mayoría de los equipos usa estas herramientas de forma asistida. Un modelo de autocompletado termina líneas, o un asistente de chat escribe una función que el desarrollador copia, ejecuta y corrige. Agentes como Claude Code, Codex, Cursor o Kiro van más allá: leen el repositorio, editan archivos, ejecutan comandos y tests, y vuelven a intentarlo cuando algo falla.

Instalar un agente no cambia el flujo de trabajo por sí solo. Si el desarrollador vigila cada comando, aprueba cada pequeña decisión e interviene cada pocos minutos, el trabajo sigue avanzando al ritmo de la persona, solo que otra herramienta escribe el código. El desarrollador se ha convertido en supervisor de respuestas sueltas del modelo.

Un equipo nativo de IA organiza su trabajo para que un agente pueda llevar una tarea bien definida de principio a fin sin esa supervisión. El ingeniero dedica más tiempo a decidir qué construir, cómo dividirlo y cómo comprobar el resultado, y menos a escribir código. El artículo de AWS dice que algunos equipos que trabajan así escriben a mano solo entre el 1 y el 2% de su código. No dice qué equipos ni cómo se midió, así que lo leo como una indicación de hacia dónde van, no como una referencia.

## Tres experimentos en Amazon

El artículo de AWS describe tres experimentos en condiciones bastante distintas. Las condiciones importan tanto como los resultados.

El primero fue un equipo piloto que reconstruyó Mantle, el motor de inferencia de Amazon Bedrock. Seis ingenieros sénior lo entregaron en 76 días, con Kiro como entorno principal, frente a una estimación inicial de 30 desarrolladores durante 12 a 18 meses. Amazon midió el 20x como velocidad de commits normalizada, es decir, commits por desarrollador y semana ajustados por la complejidad del repositorio y el tamaño del equipo, que pasó de unos 2 a unos 40. El caso de estudio de Kiro añade que alrededor del 95% de las cerca de 100.000 líneas nuevas de Rust salieron del agente. El equipo también cambió casi todo lo que rodeaba al código. Mantuvieron código y documentación en un único monorepo con módulos pequeños y aislados, eligieron Rust en parte por sus comprobaciones en tiempo de compilación, construyeron un servidor MCP pequeño y específico para operaciones y depuración, se apoyaron en mocks de alta fidelidad para las pruebas y dejaron sus agendas en una sola reunión diaria de 30 minutos. Los agentes seguían trabajando en tareas en cola fuera del horario laboral.

El segundo fue un equipo de Prime Video Financial Systems. Seis ingenieros pasaron un sprint de 10 días en una misma sala, sin guardias, sin otros proyectos y con pocas reuniones. Hicieron 556 commits frente a una base de 96 en un periodo comparable, y la estimación del proyecto bajó de 90 semanas a 24. Antes del sprint, un ingeniero sénior dedicó tres semanas a dividir el trabajo en tareas bien acotadas y con requisitos detallados. Las 24 semanas son una estimación revisada, no un proyecto entregado, y las tres semanas de preparación forman parte del coste.

El tercer experimento es el más parecido al trabajo de todos los días. Amazon Stores estudió más de 50 equipos que trabajaban con su backlog habitual, sin ingenieros elegidos a dedo ni condiciones especiales. Aproximadamente la mitad, 25 equipos, adoptó prácticas nuevas además de las herramientas. Esos equipos alcanzaron una mejora mediana de 4,5x en velocidad de despliegue normalizada, que Amazon define como funcionalidades desplegadas por sprint frente al histórico de cada equipo, y algunos superaron el 10x. Según el artículo de AWS, superaron a los equipos que solo añadieron IA al flujo que ya tenían.

## Lo que muestran esas cifras y lo que no

Los tres experimentos usan tres medidas distintas. La velocidad de commits premia los commits pequeños, y el equipo de Bedrock acotó a propósito cada prompt a un único commit revisable, así que el 20x refleja en parte un cambio en la forma de dividir el trabajo. La velocidad de despliegue se acerca más a lo que le importa al negocio, pero ninguna de las dos dice mucho sobre la mantenibilidad o sobre cuántos incidentes provoca después el código nuevo. Los equipos de los dos primeros experimentos eran sénior, estaban protegidos de interrupciones y formaban parte de una iniciativa interna muy visible. Todas las cifras las publica AWS sobre sí misma, y el caso de estudio de Kiro es además una página de producto.

La investigación independiente da cifras más modestas. El [análisis longitudinal de DX](https://getdx.com/report/ai-and-engineering-velocity-a-longitudinal-analysis/) siguió el volumen de pull requests entre noviembre de 2024 y febrero de 2026 en más de 400 empresas en las que el uso de herramientas de IA creció de media un 65%. El volumen mediano aumentó un 7,76%, y el informe concluye que entre un 5 y un 15% es lo que obtiene la mayoría de las organizaciones con la generación actual de herramientas. El [estudio aleatorizado de METR](https://arxiv.org/abs/2507.09089) repartió 246 tareas reales de 16 desarrolladores de código abierto con experiencia para hacerlas con o sin IA, usando herramientas de principios de 2025 como Cursor con Claude 3.5 y 3.7 Sonnet. Con IA, las tareas tardaron un 19% más. Los desarrolladores esperaban ir un 24% más rápido y, al terminar, seguían creyendo que habían ido un 20% más rápido.

Estos resultados miden cosas distintas y no se anulan entre sí. Un estudio controlado de tareas individuales en proyectos de código abierto maduros no equivale a un piloto interno que mide despliegues. Las cifras de DX describen lo que pasa cuando las herramientas se extienden por organizaciones que, en su mayoría, mantuvieron sus procesos, que es justo la situación en la que el artículo de AWS dice que se obtienen las mejoras más pequeñas. El cambio de flujo de trabajo es una explicación plausible de la diferencia, pero la experiencia, la selección de tareas, la infraestructura de pruebas y el método de medida también varían entre estos estudios, y ninguno aísla una única causa.

## Las cinco prácticas detrás de las mayores mejoras

El artículo de AWS menciona cinco prácticas que compartían los equipos con mejores resultados. Ninguna es nueva. Todas son hábitos de ingeniería conocidos que rinden más cuando el trabajo lo hace un agente.

### Invertir en el contexto del agente

Un equipo acumula mucho conocimiento que nunca se escribe: qué servicio es responsable de qué, qué módulo es frágil, qué patrón se probó y se descartó hace dos años. Una persona nueva lo aprende en las revisiones de código, en los hilos del chat y en la comida. Un agente solo lee el repositorio, así que puede producir código que compila y pasa los tests mientras duplica una función que ya existía, toca el servicio equivocado o añade una dependencia que el equipo evita a propósito.

La solución es escribir ese conocimiento donde un agente lo encuentre, en archivos como `AGENTS.md`, `CLAUDE.md`, los steering files de Kiro o skills, además de la documentación habitual del repositorio. Yo incluiría la estructura del repositorio y los límites entre servicios, las convenciones de errores, logs y dependencias, las restricciones de seguridad y de acceso a datos, y los comandos exactos para compilar y probar. El material detallado y propio de cada tarea puede vivir en documentos aparte que el agente lea cuando lo necesite. Un único archivo de instrucciones enorme cuesta tokens en cada ejecución y entierra las restricciones que importan.

Los equipos de Amazon tratan los errores repetidos de un agente como señal de que falta algo en ese contexto. Cuando un agente comete el mismo error dos veces, alguien se pregunta qué no sabía y lo deja por escrito. Mis propias instrucciones para agentes de programación incluyen una regla para lanzar cualquier trabajo largo en una sesión de tmux independiente, porque un cuelgue del escritorio mataría cualquier proceso lanzado como hijo de la shell del agente. Aun así, no todos los fallos merecen una regla nueva. A veces el modelo tenía la información correcta y se equivocó igualmente, y las reglas escritas para sortear los límites de un modelo antiguo pueden convertirse en ruido cuando el modelo mejora. El contexto de un agente necesita el mismo mantenimiento que el código: revisarlo, probarlo y borrar lo que ya no ayuda.

### Ir más despacio para ir más rápido

El artículo de AWS avisa de que las dos primeras semanas se sienten más lentas. Los equipos dejaron de empujar funcionalidades y dedicaron ese tiempo a la cobertura de tests, la estructura del repositorio, la documentación y las herramientas. En un panel que mide funcionalidades entregadas, ese periodo parece un retroceso.

A los agentes les ayudan las mismas propiedades que hacen que el código sea fácil de mantener para las personas. Unos límites claros entre módulos reducen lo que el agente tiene que entender a la vez. Los tipos estrictos y los compiladores señalan toda una clase de errores antes de ejecutar nada, que es parte de por qué el equipo de Bedrock eligió Rust. Eso no significa reescribir un servicio de Python en Rust. Las anotaciones de tipos, el análisis estático, la validación de esquemas y unos tests mejores adelantan los errores en cualquier lenguaje.

Los mensajes de error también cuentan. Un comando que falla con "Operation failed" no le da al agente nada con lo que trabajar, así que adivina o le pregunta a una persona. Un mensaje que nombra la operación, el servicio, la restricción incumplida y el siguiente paso de diagnóstico le permite arreglar el problema por su cuenta. El mismo razonamiento vale para los servidores MCP y demás herramientas que se le dan a un agente: unas pocas fiables que cubran la búsqueda, los tests y las operaciones que de verdad necesita son mejores que una larga lista de integraciones que nadie ha revisado, y cada una de ellas amplía la superficie de ataque.

### Alimentar a los agentes en lugar de vigilarlos

Si un agente necesita indicaciones cada 30 segundos, la persona sigue siendo el cuello de botella. El objetivo es una tarea lo bastante completa para que el agente la termine solo. Para un cambio importante en un código en producción, esperaría que la descripción de la tarea indicara:

- el resultado que hay que conseguir
- qué módulos o servicios pueden cambiar, y qué interfaces y comportamientos no
- los criterios de aceptación y los comandos exactos que tienen que pasar
- qué debe hacer el agente si una suposición resulta falsa, y qué decisiones necesitan a una persona
- qué pruebas debe entregar junto al cambio: resultados de tests, logs y una explicación breve

"Añade registro de auditoría" no basta para un servicio sensible. Una tarea útil nombra los eventos que hay que registrar, el esquema, el periodo de retención, las restricciones de privacidad, qué pasa si el registro falla y los tests que demuestran que funciona. Con eso, el agente trabaja hacia un objetivo en lugar de renegociar los requisitos a mitad de camino.

Cuando las tareas pueden ejecutarse sin vigilancia, se pueden lanzar varias a la vez. Un agente implementa un endpoint mientras otro escribe tests de integración y un tercero investiga un fallo. Eso exige aislamiento, como worktrees de git o contenedores separados, un responsable claro para cada tarea y cierto cuidado con el orden. Una tarea que depende de una interfaz todavía en discusión debe esperar a que se cierre. Tener más agentes en marcha no significa terminar más trabajo, y la medida útil es cuánto trabajo validado sale al otro lado.

### Dejar clara la intención antes de escribir código

El fallo más caro con un agente es una implementación convincente de algo equivocado. El desarrollador pasa entonces horas explicando el malentendido mientras el agente reescribe veinte archivos. Para trabajo complejo o ambiguo, el artículo de AWS recomienda acordar antes una especificación, en la línea del desarrollo guiado por especificaciones o por comportamiento.

Una especificación útil cubre el comportamiento normal, los casos límite, la gestión de errores, la autorización, la compatibilidad y los tests que definen cuándo está terminado. Para un endpoint nuevo que devuelve eventos de auditoría, podría exigir que las peticiones estén autorizadas para el tenant correcto, que los resultados se ordenen siempre igual y estén paginados, que se excluyan los campos sensibles, que los filtros no válidos devuelvan errores documentados y que los clientes existentes sigan funcionando. Un requisito que falta se ve mucho antes en media página de especificación que en un pull request terminado. La extensión de la especificación debe ir acorde con el riesgo del cambio, y un arreglo de una línea no necesita un documento de diseño.

### Adelantar las pruebas

Los agentes se equivocan, así que el entorno tiene que detectar esos errores pronto y con poco coste. El orden de validación es conocido: formato y lint, comprobación de tipos o compilación, tests unitarios, tests de integración y de contrato, comprobaciones de seguridad y dependencias, y pruebas de extremo a extremo antes del despliegue. Cuanto antes falla una etapa, más barato sale.

El detalle que más me llamó la atención es que los equipos de Amazon hicieron que los tests de integración se ejecutaran en local contra servicios simulados. Una batería que necesita desplegar varios servicios en la nube antes de arrancar le da al agente un intento cada media hora. Una batería local y determinista le permite escribir código, ejecutar los tests, leer el fallo y volver a intentarlo muchas veces sin que intervenga nadie. Los mocks tienen límites, porque pueden alejarse del servicio real y rara vez reproducen fallos de red o casos límite de autenticación, así que necesitan detrás tests de contrato, un entorno de integración realista y monitorización en producción. El objetivo es que el agente reciba información fiable sobre si su cambio es correcto.

<figure data-diagram="agent-loop" data-alt="Una especificación se convierte en una tarea acotada. Un agente trabaja en un entorno aislado y reintenta contra las comprobaciones locales hasta que pasan; después una persona revisa el cambio y sus pruebas. Lo que sale de la revisión actualiza la especificación y el contexto del agente."></figure>

## El cuello de botella pasa a la revisión y a las decisiones

Generar código más deprisa no acelera la revisión, la integración ni el despliegue. Un ingeniero con cinco agentes puede recibir en una tarde más código del que escribiría en una semana, pero alguien tiene que entenderlo, comprobar las suposiciones y decidir si se fusiona. Leer código ajeno suele ser más difícil que escribirlo, sobre todo para ingenieros con menos experiencia, que todavía están aprendiendo cómo se ve un problema de arquitectura sutil.

Las comprobaciones automáticas deberían encargarse de todo lo mecánico, para que la revisión humana se centre en si el cambio resuelve el problema correcto, encaja en la arquitectura y trata bien la seguridad. Que los tests pasen no sustituye esa revisión. Un cambio con todos sus tests en verde puede exponer datos por un camino inesperado o añadir una dependencia que el equipo no sabe operar.

Las decisiones de la organización se convierten en la siguiente restricción. Un proceso de aprobación de dos meses apenas se nota en un proyecto de nueve. En un proyecto que ahora dura tres semanas, ocupa la mayor parte del calendario. Los equipos que aceleran la implementación notarán la presión sobre la planificación de producto, la aprobación de arquitectura, la revisión de seguridad y la gestión de versiones, y esos procesos también tienen que cambiar.

## Tratar a los agentes como identidades con autoridad limitada

Un agente que puede editar archivos, ejecutar comandos y llamar a sistemas externos es una identidad de automatización, y hay que gestionarlo como tal. Eso supone darle solo los permisos que necesita la tarea, trabajar en entornos aislados en lugar del equipo principal de un desarrollador o de producción, y entregarle las credenciales por una vía controlada en lugar de pegarlas en prompts o guardarlas en archivos de instrucciones. Escribí sobre una forma de hacerlo en [mantener las credenciales fuera de los agentes de IA](/es/blog/credenciales-fuera-agentes-ia/). Las llamadas a herramientas y los cambios deberían quedar registrados, y las operaciones destructivas o que tocan producción deberían requerir una aprobación explícita.

La inyección de prompts merece su propia línea. Los archivos del repositorio, el texto de una issue, los logs, las páginas web y la salida de las herramientas pueden contener instrucciones, y un agente debe tratarlas como datos. Cada servidor MCP que se añade para ampliar lo que puede hacer un agente amplía también lo que un atacante puede alcanzar a través de él. La decisión del equipo de Bedrock de no dar a los operadores acceso directo a los servidores de producción, y trabajar a través de CloudWatch, es un buen ejemplo de diseñar esos límites desde el principio.

## Medir resultados, no actividad

Las líneas de código, los commits y las ejecuciones de agentes son fáciles de contar y dicen poco del valor. Diez pull requests mal diseñados no valen más que uno bueno, y un agente que escribe miles de líneas puede dejar mucho mantenimiento detrás. Yo seguiría cuatro grupos de medidas a la vez:

| Dimensión | Qué medir |
| --- | --- |
| Entrega | Tiempo hasta producción, frecuencia de despliegue, duración del ciclo de un PR |
| Calidad | Tasa de cambios fallidos, defectos que llegan a producción, retrabajo |
| Eficacia del agente | Tareas terminadas sin intervención, cuántas veces tuvo que intervenir una persona, coste de los reintentos |
| Sostenibilidad | Carga de revisión, carga de incidentes, gasto en cómputo |

Si tuviera que hacer un piloto, primero mediría una base con tareas comparables y el proceso actual. Después introduciría los agentes poco a poco con el mismo listón de calidad y contaría el ciclo completo: escribir especificaciones, revisar, depurar, desplegar, la factura de cómputo y el tiempo dedicado a mantener la configuración de los agentes. Generar código más rápido no es un resultado por sí solo. La mejora tiene que sobrevivir hasta llegar a producción de forma fiable.

## Por dónde empezaría

Para un equipo pequeño o un desarrollador que trabaja solo en un proyecto existente, no intentaría automatizar todo el proceso de golpe. Un primer mes podría ser así:

1. Medir cuánto tardan hoy unas cuantas tareas representativas y en qué se va el tiempo: implementación, tests, revisión, depuración, despliegue.
2. Escribir un archivo corto de contexto para agentes, hacer fiables los comandos de compilación y de tests, arreglar los tests inestables y reescribir los mensajes de error que no dicen nada.
3. Lanzar agentes sobre unas pocas tareas acotadas en worktrees aislados, cada una con criterios de aceptación y comandos de validación, y anotar cada vez que una persona tuvo que intervenir y por qué: falta de contexto, un requisito ambiguo, herramientas pobres o un error del modelo.
4. Solo entonces probar varios agentes en paralelo con tareas que no se solapen, y comparar entrega, carga de revisión, calidad y coste con la base.

El objetivo de ese mes es tener una configuración que se pueda medir y mejorar, y es poco probable que salga de ahí un titular de 10x.

## Con qué me quedo

Lo que más me llama la atención es que casi ninguna de las prácticas que lo hacen posible es nueva. Especificaciones, tests automáticos, diseño modular, documentación, integración continua, observabilidad y mínimo privilegio llevan décadas siendo buena ingeniería. Los agentes dan a los equipos un motivo más para invertir en ellas. Una batería de tests mejor ayuda ahora al próximo agente además de a la próxima persona, y una interfaz clara facilita dividir el trabajo en tareas que un agente puede terminar solo.

La misma disciplina funciona en sentido contrario. La autonomía sin validación es un riesgo, los agentes en paralelo sin coordinación producen conflictos y suposiciones incoherentes, y más código sin mejores decisiones genera deuda técnica más deprisa. Para los ingenieros con menos experiencia hay un problema añadido: si los agentes hacen la mayor parte de la implementación rutinaria, los equipos tendrán que encontrar otra forma de que desarrollen el criterio necesario para revisar y dirigir ese trabajo.

Dudo que la mayoría de los equipos vaya a ser diez veces más productiva. Aun así, los experimentos de Amazon muestran que el entorno de ingeniería que rodea a un agente decide buena parte de lo que puede hacer, y esa parte depende del equipo.

## Referencias

- Clare Liguori, [From AI-Assisted to AI-Native: Building a Frontier Development Team](https://www.youtube.com/watch?v=pqlWNihgdjI) (charla)
- ForrestKnight, [I Looked Into How Devs Are Actually Using AI](https://www.youtube.com/watch?v=qCheZDyFX2U) (vídeo)
- Swami Sivasubramanian, [How frontier teams are reinventing AI-native development](https://aws.amazon.com/blogs/machine-learning/how-frontier-teams-are-reinventing-ai-native-development/), AWS, 10 de junio de 2026
- Kiro, [Six engineers completed a 30-person project in 76 days](https://kiro.dev/case-studies/bedrock/) (caso de estudio)
- DX, [AI and engineering velocity: a longitudinal analysis](https://getdx.com/report/ai-and-engineering-velocity-a-longitudinal-analysis/)
- Joel Becker, Nate Rush, Elizabeth Barnes y David Rein, [Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity](https://arxiv.org/abs/2507.09089), METR, 2025

Los resultados de Amazon los publica la propia empresa. La lista de comprobación de tareas, el diseño del piloto y el plan del primer mes son sugerencias mías basadas en estas fuentes, no prácticas que las charlas o el artículo de AWS describan de esa forma.
