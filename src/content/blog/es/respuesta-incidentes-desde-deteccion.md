---
title: "Conectar las alertas de detección con la respuesta a incidentes"
date: "2026-11-06"
description: "Cómo unir la guía de cada detección, los procedimientos de respuesta y los runbooks para pasar de una alerta a una acción autorizada."
tags: ["Seguridad", "Ingeniería de detección", "Respuesta a incidentes"]
lang: "es"
translation: "detection-driven-incident-response"
---

Llega una alerta a la cola. La regla ha encontrado algo sospechoso, pero ¿y ahora qué? El analista todavía tiene que averiguar qué ha pasado, dónde buscar y quién puede autorizar una respuesta. Puede que esas respuestas estén repartidas entre una wiki, un acuerdo con el cliente y un runbook que nadie abre desde hace meses.

En un [artículo publicado en Detect FYI](https://detect.fyi/re-writing-the-playbook-a-detection-driven-approach-to-incident-response-5269e2eb33ca), Rcegan propone conectar la guía de cada detección con el proceso general de respuesta a incidentes. El plan de detección ayuda al analista a investigar. El procedimiento establece quién toma las decisiones y a quién hay que avisar. El runbook explica los pasos para un sistema o cliente concreto.

## Seguir una alerta durante la respuesta

Imagina una alerta por un inicio de sesión sospechoso. El analista necesita saber qué cuenta está afectada, cuándo ocurrió, desde qué dirección y por qué saltó la regla. A partir de ahí, el plan puede dirigirle a la actividad reciente de la cuenta y a los registros del proveedor de identidad. Una ubicación inusual merece una revisión, pero no demuestra que hayan robado la cuenta.

Si las pruebas justifican una escalada, el analista puede consultar el procedimiento de compromiso de cuentas para saber a quién avisar y quién autoriza la contención. Después, un runbook del entorno explica cómo revocar sesiones o desactivar la cuenta una vez aprobada la acción, comprobar que ha funcionado y registrar lo ocurrido. Si faltan registros, también hay que dejar constancia de ello. Una búsqueda vacía no demuestra que la cuenta esté a salvo.

En un SOC gestionado esto se complica. Dos clientes pueden usar la misma plataforma de identidad y tener contactos distintos o reglas diferentes para desactivar cuentas. Un plan de detección compartido puede enlazar con los datos de cada cliente para que el analista no tenga que adivinar qué puede hacer.

## Mantener útiles los enlaces

El plan tiene que ser fácil de encontrar cuando salta una alerta. Enlázalo desde la detección y pide a un analista que pruebe las consultas antes de poner la regla en producción. Después de un incidente o un ejercicio, revisa qué frenó al equipo. Quizá faltaba un campo, un enlace estaba roto o nadie sabía quién estaba de guardia por parte del cliente.

Asigna a alguien la responsabilidad de mantener el plan al día y fija una fecha para revisarlo. Automatizar la recopilación repetitiva de pruebas puede ahorrar tiempo, pero las acciones que cambian accesos siguen necesitando la autorización adecuada, tanto si las ejecuta una persona como una herramienta.

El [modelo de madurez de ingeniería de detección](/es/blog/modelo-madurez-ingenieria-deteccion/) ofrece una forma de continuar este trabajo. Empieza con una detección, prueba la guía con quienes la usan y aplica lo aprendido en la siguiente revisión.
