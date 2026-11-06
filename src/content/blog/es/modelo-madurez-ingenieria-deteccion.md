---
title: "Una forma práctica de evaluar la madurez de la ingeniería de detección"
date: "2026-11-06"
description: "Una nota de lectura sobre el modelo de madurez de Elastic y cómo convertir una evaluación en un plan de mejora útil."
tags: ["Seguridad", "Ingeniería de detección", "Elastic"]
lang: "es"
translation: "detection-engineering-maturity-model"
---

¿Cómo se demuestra que un programa de detección está mejorando? Contar reglas dice poco sobre si funcionan o si los analistas pueden responder a sus alertas. [El artículo de Rcegan en Detect FYI](https://detect.fyi/from-zero-to-expert-level-detection-engineering-with-elastics-maturity-model-bc230107741e), publicado el 5 de octubre de 2024, presenta el modelo de madurez del comportamiento de ingeniería de detección de Elastic (DEBMM) como una forma de abordar esa conversación.

El artículo original de Elastic, [Elastic releases the Detection Engineering Behavior Maturity Model](https://www.elastic.co/security-labs/threat-command/elastic-releases-debmm), de Mika Ayenson, Terrance DeJesus y Samir Bousseaden, describe cinco niveles, desde el trabajo inicial sobre reglas individuales hasta un programa experto que incorpora búsqueda de amenazas y automatización. Entre ambos aparecen prácticas como el control de versiones, el ajuste de falsos positivos, la documentación de brechas de cobertura y las pruebas para detectar amenazas que pasan desapercibidas. Cada nivel incluye criterios para evaluar tanto el estado del conjunto de reglas como el trabajo necesario para mantenerlo.

![El modelo de madurez de Elastic como un ciclo: nivel 0 fundacional, nivel 1 básico, nivel 2 intermedio, nivel 3 avanzado y nivel 4 experto, seguido de refinamiento, repetición y maduración.](https://images.contentstack.io/v3/assets/bltefdd0b53724fa2ce/blt181534fe2ef46811/6a7c80d18fc2d05fa33e889c/image5.png)

*Imagen: Elastic, procedente de su [artículo sobre DEBMM](https://www.elastic.co/security-labs/threat-command/elastic-releases-debmm).*

## Aplicar el modelo

Empieza con una evaluación acotada: elige una fuente de datos o un escenario de amenaza importante y registra qué detecciones lo cubren, quién es responsable y cuándo se probaron por última vez. Anota las brechas conocidas junto con las pruebas que respaldan cada conclusión. Un mapa de técnicas de ATT&CK puede ayudar a organizar la revisión, pero vincular una regla a una técnica no demuestra que genere una alerta ante ese comportamiento.

Elige una mejora que el equipo pueda mantener. Por ejemplo, acuerda una fecha de revisión para las reglas que generan demasiado ruido y registra el resultado de cada ajuste. Para una detección prioritaria, realiza una prueba segura y autorizada y comprueba si la alerta esperada llega a un analista. Estos ejemplos son puntos de partida, no objetivos establecidos por Elastic.

Repite la evaluación y comparte las brechas y los avances con las personas responsables. Elastic advierte de que las prácticas avanzadas requieren tiempo y personal, y de que saltarse el trabajo básico puede debilitarlas. Usa el modelo para priorizar la siguiente mejora útil, sin tratar un nivel como una certificación.
