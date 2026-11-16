---
title: "Una forma práctica de evaluar la madurez de la ingeniería de detección"
date: "2026-11-06"
description: "Una nota de lectura sobre el modelo de madurez de ingeniería de detección de Elastic: qué pide cada nivel a un equipo, cómo evaluar una fuente de datos con pruebas y cómo elegir la siguiente mejora."
tags: ["Seguridad", "Ingeniería de detección", "Elastic"]
image: "/images/blog/covers/maturity.png"
lang: "es"
translation: "detection-engineering-maturity-model"
---

Si le preguntas a un equipo de seguridad cómo va su programa de detección, lo normal es que responda con una cifra: 400 reglas propias, el 70% de ATT&CK cubierto, unas cuantas reglas nuevas cada semana. Son números fáciles de obtener y difíciles de interpretar. Algunas de esas reglas pueden depender de logs que ya nadie ingiere. Otras saltan tan a menudo que los analistas cierran las alertas sin leerlas, y alguna no ha saltado nunca, lo que puede significar que el comportamiento no se ha producido o que la regla está rota. La cifra no dice cuál de los dos casos es.

[El artículo de Rcegan en Detect FYI](https://detect.fyi/from-zero-to-expert-level-detection-engineering-with-elastics-maturity-model-bc230107741e), publicado el 5 de octubre de 2024, me llevó a una forma mejor de plantear la pregunta. Repasa el [Detection Engineering Behavior Maturity Model](https://www.elastic.co/security-labs/threat-command/elastic-releases-debmm) (DEBMM) de Elastic, que Mika Ayenson, Terrance DeJesus y Samir Bousseaden publicaron en Elastic Security Labs el 6 de septiembre de 2024. En este artículo resumo el modelo y después lo aplico a una sola fuente de datos de Wazuh, que es como yo empezaría a usarlo.

## Qué mide el modelo

DEBMM evalúa los comportamientos de un equipo de ingeniería de detección, no a cada ingeniero por separado ni un conjunto de reglas aislado. Lo que pregunta es si el equipo tiene hábitos repetibles para crear, probar, ajustar y retirar detecciones. Un equipo con 50 reglas bien mantenidas y un proceso de revisión fiable puede ser más maduro que otro con 500 reglas sin responsable.

El modelo tiene dos ejes. Cinco niveles, numerados del 0 al 4, agrupan los criterios desde lo fundamental hasta lo experto. Dentro de cada criterio, el equipo se sitúa en uno de cinco grados: Initial, Repeatable, Defined, Managed u Optimized. Elastic indica que estos grados siguen, de forma aproximada, los niveles de madurez que se usan con el NIST Cybersecurity Framework.

Cada criterio tiene además dos caras. La cualitativa describe el estado del conjunto de reglas: si la documentación está completa, si existe un esquema definido, si alguien revisa los cambios. Elastic reconoce que esta parte es subjetiva, porque dos evaluadores pueden leer el mismo conjunto de reglas de forma distinta. La cuantitativa mide las actividades que mantienen ese estado, como cuántos falsos positivos ha eliminado el equipo este trimestre o cuánto tarda en publicar una regla ante una amenaza nueva. Esas cifras se comparan mejor a lo largo del tiempo.

El alcance es más estrecho de lo que sugiere el nombre. El modelo se centra en reglas de SIEM basadas en búsquedas y no cubre las detecciones que se evalúan sobre el flujo de eventos ni las de machine learning. La mayoría de las reglas de Wazuh se evalúan a medida que llegan los eventos, pero los comportamientos por los que pregunta el modelo (responsables, revisión, pruebas, ajuste) se les aplican igual.

<figure data-diagram="maturity" data-alt="Los cinco niveles de madurez de Elastic y un ciclo ilustrativo: elegir ámbito, registrar evidencias, mejorar y reevaluar.">
  <figcaption>Resumen de niveles adaptado del <a href="https://www.elastic.co/security-labs/threat-command/elastic-releases-debmm">artículo de Elastic sobre DEBMM</a>; el flujo de evaluación es un ejemplo de aplicación.</figcaption>
</figure>

## Los cinco niveles

El nivel 0, Foundation, es donde la creación de reglas deja de ser improvisada. Los criterios piden un enfoque estructurado para escribir y gestionar reglas, creación y mantenimiento continuos, una hoja de ruta documentada o al menos planificada y algún tipo de modelado de amenazas. Un equipo en este nivel puede seguir escribiendo reglas como reacción al último incidente, pero ya deja por escrito qué construye y por qué.

El nivel 1, Basic, establece una cobertura de base y gestiona las reglas como código. El equipo tiene reglas para las tácticas principales y las amenazas más relevantes para su entorno, las guarda en control de versiones y prueba cada publicación de principio a fin antes de que llegue a producción. Revisa los cambios en el panorama de amenazas, trabaja con los responsables de producto en las funciones de las que dependen las detecciones y, de forma opcional, mejora la calidad de la propia telemetría. Es el nivel en el que suele aparecer "Detections as Code".

El nivel 2, Intermediate, trata de la precisión y de la cobertura comprobada. El equipo ajusta los falsos positivos de forma continua, no solo cuando alguien se queja, documenta las brechas que conoce y prueba sus reglas internamente con emulación o detonación de malware. Una regla que nunca se ha disparado a propósito se considera sin probar.

El nivel 3, Advanced, se fija en las alertas que nunca llegan. El equipo analiza los falsos negativos, es decir, ataques o pruebas que deberían haber generado una alerta y no lo hicieron, y se somete a revisión externa mediante red teams, pruebas de penetración o evaluaciones de terceros. También amplía la cobertura a técnicas más avanzadas.

El nivel 4, Expert, añade la búsqueda de amenazas en la telemetría propia y la mejora continua mediante automatización, incluido el uso de IA generativa para sugerir o revisar cambios en las reglas. Elastic aclara que este nivel no es una meta final. La madurez sube y baja a medida que cambian las personas, las herramientas y las amenazas.

## Métricas de ejemplo y cómo leerlas

El artículo de Elastic asocia umbrales de ejemplo a cada grado, y eso hace que los grados se entiendan mejor. Algunos de ellos:

| Criterio | Umbral de ejemplo | Grado |
| --- | --- | --- |
| Documentación de reglas (nivel 0) | Menos del 20% de las reglas documentadas por completo | Repeatable |
| Cobertura de base (nivel 1) | 90% o más de las técnicas ATT&CK de base por fuente de datos | Managed |
| Amenazas emergentes (nivel 1) | Regla para una amenaza nueva desplegada en menos de 24 horas | Managed |
| Ajuste de falsos positivos (nivel 2) | Reducción del 10 al 25% por trimestre | Repeatable |
| Pruebas automatizadas (nivel 2) | El 80% de las reglas cubiertas por pruebas automáticas | Defined |
| Análisis de falsos negativos (nivel 3) | Entre el 70 y el 90% de las muestras probadas generan alerta | Defined |

Elastic los presenta como ejemplos que hay que adaptar, y el artículo pide a cada organización que defina los cálculos que encajen con su caso. Yo los usaría para abrir la conversación con el equipo, no como objetivos. Un objetivo de reducción de falsos positivos, por ejemplo, se cumple con facilidad desactivando las reglas ruidosas, con lo que también se pierde lo que esas reglas detectaban. Cualquier métrica que se adopte necesita otra que vigile ese tipo de atajo, como el porcentaje de ataques probados que siguen generando alerta.

## Evaluar una fuente de datos, con pruebas

Elastic propone auditar el nivel actual con un cuestionario de preguntas de sí o no y de opción múltiple, y después acotar el trabajo, fijar objetivos y construir una hoja de ruta empezando por las áreas de mayor riesgo. Evaluar todo un programa de una vez suele acabar en una hoja de cálculo llena de respuestas optimistas. Yo empezaría por algo más pequeño: una fuente de datos o un escenario de amenaza que importe a la organización, evaluado con pruebas.

Tomemos los logs de autenticación SSH de Linux en Wazuh, el mismo ejemplo que usé en el [artículo sobre respuesta a incidentes desde la detección](/es/blog/respuesta-incidentes-desde-deteccion/). Las preguntas siguen los niveles.

Para los niveles 0 y 1, haz una lista de las reglas que cubren la actividad SSH, tanto las reglas de sshd que trae Wazuh como las reglas propias de `local_rules.xml`. La [guía de Wazuh sobre fuerza bruta en SSH](https://documentation.wazuh.com/current/user-manual/capabilities/active-response/ar-use-cases/blocking-ssh-brute-force.html) usa la regla `5763`, pero comprueba los identificadores y los campos decodificados en tu propia versión. Para cada regla, anota si está en un repositorio, quién revisa sus cambios y si un despliegue pasa por alguna prueba antes de llegar al manager. Una regla editada directamente en un manager de producción no deja historial que revisar.

Para el nivel 2, mira qué han producido las reglas en los últimos meses. ¿Cuántas alertas ha generado cada regla de SSH y cuántas han cerrado los analistas como benignas? Escribe de forma explícita las brechas conocidas. Si hay equipos que no envían logs de autenticación, eso es una brecha aunque todas las reglas sean perfectas. Después comprueba si alguien ha disparado las reglas a propósito. [Wazuh logtest](https://documentation.wazuh.com/current/user-manual/ruleset/testing.html) con líneas de log de ejemplo muestra cómo se decodifica un evento y qué regla coincide. Un intento autorizado de fuerza bruta contra un equipo de laboratorio muestra otra cosa: si la alerta llegó al dashboard y si un analista pudo actuar.

Para el nivel 3, busca detecciones perdidas. ¿Algún incidente o ejercicio incluyó actividad SSH que debería haber generado una alerta y no lo hizo? Si la respuesta es "nunca lo hemos comprobado", la evaluación honesta es que el equipo no lo sabe.

Anota cada respuesta junto a la prueba que la respalda: un enlace al repositorio, un recuento de alertas, el resultado de una prueba, un ticket. Una técnica de ATT&CK asociada a una regla sin ninguna prueba es una afirmación, y la evaluación debe decirlo. El valor del ejercicio está en las brechas que saca a la luz, y una evaluación sin pruebas las esconde.

## Elegir una mejora que el equipo pueda mantener

La evaluación producirá más brechas de las que un equipo puede cerrar a la vez. Elige una mejora que el equipo pueda sostener con el personal que tiene. En el ejemplo de SSH, podría ser mover las reglas propias a control de versiones con un paso de revisión, o acordar una revisión mensual de la regla más ruidosa y anotar el resultado de cada ajuste. Para una detección prioritaria, podría ser una prueba autorizada en laboratorio cada trimestre, con el resultado por escrito.

Después, repite la evaluación pasado un tiempo fijo y comparte tanto las brechas como los avances con quien financia el trabajo. Una tabla que muestra que las detecciones de SSH han pasado de "sin probar" a "probadas cada trimestre, con dos falsos negativos encontrados y corregidos" le sirve más a un responsable que un recuento de reglas.

## Advertencias de los autores del modelo

Elastic desaconseja saltarse criterios de los niveles inferiores. Las prácticas avanzadas dependen de las básicas: buscar amenazas sirve de poco si nadie sabe qué fuentes de datos son fiables, y es difícil fiarse de reglas sugeridas por IA sin control de versiones y pruebas que detecten una mala. Los autores también dicen que un equipo puede trabajar en comportamientos de niveles superiores cuando el riesgo lo justifica, pero que avanzar por el modelo con prisas y sin presupuesto ni personal suficientes puede acabar en agotamiento.

Esa advertencia es la razón principal por la que no presentaría un nivel como una certificación. El modelo resulta más útil como vocabulario común para decidir qué arreglar a continuación, y como registro que muestra si el último arreglo se ha mantenido.
