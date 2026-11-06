---
title: "Organizar la respuesta a incidentes alrededor de las detecciones de Wazuh"
date: "2026-11-06"
description: "Una forma práctica de conectar las alertas de Wazuh con guías de investigación, procedimientos de incidentes y runbooks de respuesta."
tags: ["Seguridad", "Wazuh", "Ingeniería de detección", "Respuesta a incidentes"]
lang: "es"
translation: "detection-driven-incident-response"
---

Una alerta de Wazuh nos dice que un evento ha coincidido con una regla. Las siguientes preguntas no suelen caber en la propia alerta. ¿Es una actividad esperada? ¿Qué más ha ocurrido en el equipo? ¿Quién puede autorizar un bloqueo y cómo lo deshacemos si nos equivocamos?

Las respuestas suelen estar repartidas. El plan de respuesta a incidentes puede indicar quién tiene autoridad, mientras que los pasos técnicos están en una wiki o en la memoria de alguien. A las tres de la mañana, un analista necesita poder llegar desde la alerta hasta ambos.

Este artículo parte del [post de Rcegan sobre respuesta a incidentes basada en detecciones](https://detect.fyi/re-writing-the-playbook-a-detection-driven-approach-to-incident-response-5269e2eb33ca). La idea central consiste en conectar la guía de cada detección con los procedimientos generales de incidentes y los runbooks detallados. Aquí la aplico a Wazuh mediante un ejemplo de SSH. El proceso y los diagramas proponen una forma de organizar el trabajo, no son funciones que Wazuh incluya automáticamente.

## Una función para cada documento

Una organización puede necesitar una política formal de respuesta a incidentes por motivos de gestión, contratos o cumplimiento. Ese documento puede definir responsables, comunicación y autoridad para tomar decisiones. No necesita explicar qué campos de Wazuh revisar durante una investigación de SSH.

Un procedimiento por escenario aborda un problema más concreto, como un servidor o una cuenta comprometida. Explica cuándo escalar, a quién contactar y qué acciones de contención se pueden autorizar. En un SOC gestionado también debe identificar al cliente y las restricciones acordadas.

La guía de detección está más cerca de la alerta. Describe qué busca una regla, qué pruebas conviene revisar y qué podría explicar una coincidencia legítima. Un runbook técnico explica cómo ejecutar una acción autorizada en una plataforma concreta y cómo comprobarla o revertirla. Separar estas piezas permite cambiar un comando de firewall sin reescribir la política de incidentes.

![Cuatro capas conectadas de respuesta, desde la política y los procedimientos por escenario hasta la guía de detección y los runbooks técnicos.](/images/blog/incident-response-layers-es.svg)

Los enlaces entre estas piezas son importantes. La persona responsable de una regla puede mantener una guía de investigación para esa detección, mientras cada cliente o entorno tiene sus propios contactos y runbooks. Wazuh no crea esos documentos ni establece el enlace por sí solo. El equipo puede mantenerlos en una wiki o sistema de casos accesible e incluir una referencia estable allí donde los analistas trabajen con las alertas.

## Empezar con una alerta de SSH

Imagina que Wazuh genera una alerta por varios fallos de autenticación SSH. La alerta justifica una investigación, pero no demuestra que un atacante haya conseguido entrar. El [ejemplo de fuerza bruta SSH de Wazuh](https://documentation.wazuh.com/current/user-manual/capabilities/active-response/ar-use-cases/blocking-ssh-brute-force.html) usa la regla `5763` en una configuración concreta. Tómala como ejemplo y comprueba las reglas y los campos decodificados en tu versión y entorno.

Abre la alerta y registra la fecha, `rule.id`, la descripción de la regla, la identidad del agente y cualquier campo relevante de IP de origen o cuenta que esté presente. Los campos exactos dependen del evento y del decodificador. El manager también puede tener alertas en `/var/ossec/logs/alerts/alerts.json` si el registro de alertas JSON está habilitado. Nuestro [ejemplo de búsqueda de alertas](https://github.com/leonfullxr/Wazuh/tree/main/scripts/alert-search) muestra cómo consultar ese archivo por identificador de regla y ventana temporal, aunque solo busca en el archivo local y en el intervalo elegido.

Después, amplía la ventana temporal y busca eventos de autenticación relacionados en el equipo afectado. ¿Los fallos afectan a una o varias cuentas? ¿Hay un inicio de sesión posterior desde el mismo origen? ¿La dirección pertenece a un escáner conocido, un servidor de salto o un servicio compartido? Si hubo un acceso, revisa la actividad posterior con la telemetría disponible en ese entorno.

Una dirección de origen rara vez resuelve el caso por sí sola. Una VPN compartida o una dirección NAT puede representar a muchas personas, y un escáner autorizado puede generar una alerta ruidosa. Registra tanto las pruebas que apoyan la valoración como lo que no pudiste comprobar. Los registros ausentes, un agente desconectado o una búsqueda fuera del intervalo adecuado deben quedar reflejados al escalar el caso.

![Flujo ilustrativo desde una alerta SSH de Wazuh hasta el análisis, la decisión, una respuesta autorizada y la revisión.](/images/blog/incident-response-flow-es.svg)

## Escribir el plan de respuesta junto a la regla

La persona que desarrolla la detección sabe qué evento o combinación de eventos hace saltar la regla. Ese contexto debe quedar en el plan de respuesta antes de llevar la regla a producción. Después, un analista puede revisar la guía y comprobar si los datos y las consultas están disponibles en el entorno que cubre.

Para una detección SSH, el plan puede indicar qué campos recopilar, describir actividades administrativas o escaneos habituales que podrían explicar la alerta y enlazar con el procedimiento de equipo comprometido. También debe indicar cuándo escalar y qué pruebas conservar. Conviene asignar una persona responsable y una fecha de revisión para que un cambio en el formato de los logs o un contacto obsoleto no deje la guía inutilizable.

Prueba la detección y también el documento. [Wazuh logtest](https://documentation.wazuh.com/current/user-manual/ruleset/testing.html) ayuda a comprobar cómo se decodifican eventos de muestra y qué reglas coinciden. Incluye un caso que deba activar la regla y otro legítimo o parecido que no deba hacerlo. Nuestra [lista para reglas personalizadas](https://github.com/leonfullxr/Wazuh/tree/main/rules) también propone comprobar los identificadores y campos decodificados, y vigilar el volumen de alertas tras el despliegue. Un resultado en logtest no demuestra por sí solo que la alerta haya llegado al analista ni que el procedimiento funcione de extremo a extremo. Esa parte necesita su propia prueba.

## Autorizar antes de contener

Si la investigación apunta a una amenaza activa, el procedimiento por escenario debe aclarar la siguiente decisión. ¿Quién puede aprobar un bloqueo de red? ¿Hay que contactar primero con el cliente? ¿Qué sistemas o direcciones compartidas no se pueden bloquear sin una revisión adicional?

El runbook puede explicar los pasos para ese entorno, cómo comprobar el cambio, cuánto tiempo debe mantenerse y cómo revertirlo. Registra quién tomó la decisión y qué se hizo. Un cambio en el firewall del equipo no equivale a bloquear tráfico en un firewall perimetral, y cualquiera de las dos acciones puede afectar a usuarios legítimos.

[Active Response de Wazuh](https://documentation.wazuh.com/current/user-manual/capabilities/active-response/index.html) puede ejecutar scripts configurados cuando coinciden determinadas alertas. Por ejemplo, la guía oficial de SSH usa `firewall-drop` en el equipo que generó el evento. Una vez configurada, es una respuesta automática, no un flujo de aprobación. Si se necesita autorización, hay que diseñar por separado el proceso de decisión y ejecución en vez de asumir que la regla espera a una persona.

El alcance importa. La [referencia de configuración](https://documentation.wazuh.com/current/user-manual/reference/ossec-conf/active-response.html) describe dónde se ejecutan los comandos, qué reglas pueden activarlos y cómo funcionan los tiempos límite para respuestas compatibles. Un tiempo límite solo sirve para revertir la acción si el comando admite esa función. Prueba en un laboratorio la regla, el campo de origen, el destino y la reversión antes de activar una respuesta. Las [notas locales de Active Response](https://github.com/leonfullxr/Wazuh/tree/main/scripts/active-response) ofrecen ejemplos para contrastar con la documentación oficial y la versión instalada.

## Revisar lo aprendido después del incidente

Un plan de respuesta debe cambiar cuando un analista encuentra una consulta mejor o un incidente revela un paso que faltaba. Después de una investigación real o un ejercicio de mesa, revisa si la alerta tenía suficiente contexto, si funcionaban los enlaces y si la persona adecuada podía decidir sobre la contención. Comprueba que el runbook explique cómo verificar y deshacer la acción.

No hace falta reescribir todos los playbooks a la vez. Elige una regla de Wazuh ruidosa o de alto impacto, sigue el recorrido desde la alerta hasta la decisión junto a un analista y corrige la primera brecha que encontréis. También es una forma de llevar a la práctica el [modelo de madurez de ingeniería de detección](/es/blog/modelo-madurez-ingenieria-deteccion/).
