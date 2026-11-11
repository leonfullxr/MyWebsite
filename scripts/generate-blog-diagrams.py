#!/usr/bin/env python3
"""Generate responsive, themed SVG architecture figures for the blog."""
from html import escape
from pathlib import Path
from PIL import ImageFont

OUT = Path(__file__).resolve().parents[1] / 'public/images/blog'
FONT = '/usr/share/fonts/truetype/lato/Lato-Regular.ttf'
BOLD = '/usr/share/fonts/truetype/lato/Lato-Bold.ttf'
# Each step contains a heading, a short description, and a supporting detail.
DATA = {
'credential-flow': {'en': ('Credential injection on egress', [
('Agent','Requests an API operation','Uses a limited gateway identity'), ('Gateway','Authenticates the request','Evaluates user, action and resource'), ('Gateway injects','Adds the upstream credential','Credential service supplies it after approval'), ('Upstream API','Receives the forwarded request','Gateway records the decision without secrets')]),
'es': ('Inyección de credenciales a la salida', [
('Agente','Solicita una operación de API','Usa una identidad de pasarela limitada'), ('Pasarela','Autentica la petición','Evalúa usuario, acción y recurso'), ('La pasarela inyecta','Añade la credencial del servicio','El almacén la facilita tras la autorización'), ('API de destino','Recibe la petición enviada','La pasarela registra la decisión sin secretos')])},
'credential-risk': {'en': ('Controls around an agent request', [
('Agent runtime','Untrusted content can influence requests','Limit the agent identity and task scope'), ('Policy decision','Check user, destination and operation','Require approval for sensitive actions'), ('Credential boundary','Store and inject only approved secrets','Encrypt, rotate and revoke credentials'), ('Destination','Receive only permitted traffic','Block bypass; audit without logging tokens')]),
'es': ('Controles de una petición del agente', [
('Entorno del agente','El contenido no fiable puede influir','Limitar identidad y alcance de la tarea'), ('Decisión de política','Comprobar usuario, destino y operación','Exigir aprobación para acciones sensibles'), ('Límite de credenciales','Guardar e inyectar secretos permitidos','Cifrar, rotar y revocar credenciales'), ('Destino','Recibir solo tráfico autorizado','Bloquear desvíos y auditar sin tokens')])},
'soc': {'en': ('Evidence-first AI SOC investigation', [
('Analyst and plan','Question, topic and time window','Reads use the analyst’s permissions'), ('Evidence collection','Reviewed queries retrieve Wazuh data','Record results and missing sources'), ('Evidence pack','Facts are grouped by topic and hashed','Model judges a bounded pack without tools'), ('Validated answer','Application checks citations and rules','Audit is acknowledged before publication')])},
'ir-layers': {'en': ('From response policy to technical action', [
('Incident policy','Defines authority and ownership','Reporting and decision-making'), ('Scenario procedure','Defines escalation and contacts','Customer-specific restrictions'), ('Detection guidance','Connects the alert to evidence','Benign cases and investigation steps'), ('Technical runbook','Describes an approved action','Verification, rollback and review owner')]),
'es': ('De la política de respuesta a la acción', [
('Política de incidentes','Define autoridad y responsables','Comunicación y toma de decisiones'), ('Procedimiento','Define escalado y contactos','Restricciones de cada cliente'), ('Guía de detección','Conecta la alerta con evidencias','Casos benignos y pasos de análisis'), ('Runbook técnico','Describe la acción aprobada','Verificación, reversión y revisión')])},
'ir-flow': {'en': ('SSH alert: investigation and response', [
('Wazuh alert','A rule matches authentication events','The alert is a reason to investigate'), ('Analyst triage','Review the host, source and time window','Record evidence and missing telemetry'), ('Response decision','Determine authority and customer limits','If authorized, follow a runbook'), ('Action and review','Verify the result and record the case','Active Response is a separate automatic path')]),
'es': ('Alerta SSH: investigación y respuesta', [
('Alerta de Wazuh','Una regla coincide con eventos SSH','La alerta es un motivo para investigar'), ('Análisis','Revisar equipo, origen e intervalo','Registrar evidencias y datos ausentes'), ('Decisión de respuesta','Determinar autoridad y límites del cliente','Si se autoriza, seguir un runbook'), ('Acción y revisión','Verificar el resultado y registrar el caso','Active Response es una vía automática aparte')])},
'local-model-loop': {'en': ('Moving one task to a local specialist', [
('Examples','Real cases, rules and documentation','A frontier model produces synthetic sessions'), ('Fine-tuning','Reviewed sessions train a LoRA adapter','The base model remains unchanged'), ('Private benchmark','Compare candidates on fixed tasks','Failures guide further training data'), ('Deployment','A specialist takes over when ready','An evaluator checks each proposed reply')]),
'es': ('Pasar una tarea a un especialista local', [
('Ejemplos','Casos reales, reglas y documentación','Un modelo frontera genera sesiones sintéticas'), ('Ajuste fino','Sesiones revisadas entrenan una LoRA','El modelo base no cambia'), ('Benchmark privado','Comparar modelos con tareas fijas','Los fallos orientan los próximos datos'), ('Despliegue','El especialista asume la tarea','Un evaluador comprueba cada respuesta')])},
'reply-eval': {'en': ('Checking a support reply against evidence', [
('Customer case','A card expired and payment failed','The agent investigates the account'), ('Recorded session','Tool calls and results are captured','Code checks whether actions succeeded'), ('Draft reply','The model identifies claimed actions','Compare each claim against the session'), ('Decision','Approve supported claims or reject','A rejected reply has an explicit reason')]),
'es': ('Comprobar una respuesta con la evidencia', [
('Caso del cliente','Tarjeta caducada y pago fallido','El agente investiga la cuenta'), ('Sesión registrada','Se guardan llamadas y resultados','El código comprueba si tuvieron éxito'), ('Borrador','El modelo identifica acciones afirmadas','Contrastar cada afirmación con la sesión'), ('Decisión','Aprobar o rechazar según las pruebas','El rechazo incluye un motivo explícito')])},
'maturity': {'en': ('Detection engineering: assess and improve', [
('Tiers 0 and 1','Foundation and basic practices','Begin with a defined data source or threat'), ('Tiers 2 and 3','Intermediate and advanced practices','Record coverage, ownership and test evidence'), ('Tier 4','Expert practices','Choose one gap and a sustainable improvement'), ('Repeat','Review progress and reassess','Tier names adapted from Elastic DEBMM')]),
'es': ('Ingeniería de detección: evaluar y mejorar', [
('Niveles 0 y 1','Prácticas fundacionales y básicas','Elegir una fuente de datos o amenaza'), ('Niveles 2 y 3','Prácticas intermedias y avanzadas','Registrar cobertura, responsables y pruebas'), ('Nivel 4','Prácticas expertas','Elegir una laguna y una mejora sostenible'), ('Repetir','Revisar avances y volver a evaluar','Niveles adaptados de Elastic DEBMM')])}
}
THEMES={False: dict(bg='#ffffff',ink='#202b37',muted='#42515f',group='#e8a05a',box='#fdf3e8',support='#eef4fa',line='#34495a',dot='#e9eef1',accent='#b75b0c'),True: dict(bg='#16212c',ink='#f2f5f6',muted='#c5d0d9',group='#e6a65f',box='#44392e',support='#283d4c',line='#d0dbe3',dot='#31414e',accent='#ffc47b')}

def text(lines,x,y,size,color,weight='normal', anchor='middle'):
 return ''.join(f'<text x="{x}" y="{y+i*size*1.22:.1f}" text-anchor="{anchor}" fill="{color}" font-size="{size}" font-weight="{weight}">{escape(line)}</text>' for i,line in enumerate(lines))

def wrap(value,width,size=24,bold=False):
 f=ImageFont.truetype(BOLD if bold else FONT,size)
 words=value.split(); result=[]; line=''
 for word in words:
  test=(line+' '+word).strip()
  if line and f.getlength(test)>width: result.append(line); line=word
  else: line=test
 if line: result.append(line)
 return result

# Layouts are chosen for the relationship each article explains.
def svg(key,lang,dark,mobile):
 title,steps=DATA[key][lang]; t=THEMES[dark]; W,H=(700,850) if mobile else (1200,650)
 tag=key+'-'+lang+('-dark' if dark else '')+('-mobile' if mobile else '')
 out=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-labelledby="{tag}-title {tag}-desc">',f'<title id="{tag}-title">{escape(title)}</title>',f'<desc id="{tag}-desc">{escape("; ".join(". ".join(s) for s in steps))}</desc>',f'<rect width="{W}" height="{H}" fill="{t["bg"]}"/>',f'<defs><marker id="a-{tag}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="{t["line"]}"/></marker></defs>',f'<g font-family="Lato, Arial, sans-serif">',text(wrap(title,W-50,27,True),W/2,50,27,t['ink'],'bold')]
 def arrow(d,dash=''):
  out.append(f'<path d="{d}" fill="none" stroke="{t["line"]}" stroke-width="3" {dash} marker-end="url(#a-{tag})"/>')
 def boundary(x,y,w,h,label):
  out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="none" stroke="{t["group"]}" stroke-width="2" stroke-dasharray="7 5"/>')
  out.append(text([label],x+16,y+25,16,t['accent'],'bold','start'))
 def box(x,y,w,h,heading,body='',fill=None):
  out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{fill or t["box"]}"/>')
  hs=wrap(heading,w-24,22,True); bs=wrap(body,w-26,18) if body else []
  total=len(hs)*27+len(bs)*22; yy=y+(h-total)/2+20
  out.append(text(hs,x+w/2,yy,22,t['ink'],'bold'))
  out.append(text(bs,x+w/2,yy+len(hs)*27,18,t['muted']))
 def note(x,y,w,h,value): box(x,y,w,h,value,'',t['support'])
 if key=='credential-flow':
  a,g,inject,api=steps
  if mobile:
   boundary(195,180,310,365, 'PASARELA' if lang=='es' else 'GATEWAY')
   arrow('M350 165 V220'); arrow('M350 310 V345'); arrow('M350 440 V595')
   box(215,90,270,75,a[0],a[1]); box(225,220,250,90,g[0],g[1]); box(225,350,250,90,inject[0],inject[1]); box(215,600,270,90,api[0],api[1]);
   note(25,350,175,95,'Política' if lang=='es' else 'Policy'); note(500,350,175,95,'Almacén' if lang=='es' else 'Token store'); arrow('M200 396 H225'); arrow('M500 396 H475')
   out.append(text(wrap(inject[2],620,17),W/2,755,17,t['muted']))
  else:
   boundary(290,145,600,385,'PASARELA · LÍMITE DE CONFIANZA' if lang=='es' else 'GATEWAY · TRUST BOUNDARY')
   arrow('M230 275 H350');arrow('M590 275 H965');arrow('M470 320 V385');arrow('M730 390 V345 H570 V320')
   box(30,230,200,90,a[0],a[1]);box(350,230,240,90,g[0],g[1]);box(965,230,205,90,api[0],api[1]);note(350,390,240,80,('Política · acción y recurso' if lang=='es' else 'Policy · action and resource'));note(610,390,240,80,'Almacén de token' if lang=='es' else 'Credential store')
   out.append(text(wrap(inject[2],650,17),590,575,17,t['muted']))
 elif key in ('credential-risk','ir-layers'):
  # Both describe layers, but use a security boundary vs a documentation hierarchy.
  x=40 if mobile else 145; width=W-80 if mobile else 910; start=115; gap=155 if mobile else 126; hh=125 if mobile else 100
  for i,(head,summary,detail) in enumerate(steps):
   y=start+i*gap
   out.append(f'<rect x="{x}" y="{y}" width="{width}" height="{hh}" rx="8" fill="{t["box"] if i%2==0 else t["support"]}" stroke="{t["group"]}" stroke-width="2"/>')
   out.append(text([f'{i+1:02}'],x+20,y+33,19,t['accent'],'bold','start'))
   hx=x+65; out.append(text(wrap(head,width-90,23,True),hx,y+31,23,t['ink'],'bold','start'))
   content=wrap(summary+' · '+detail,width-90,18)
   out.append(text(content,hx,y+62,18,t['muted'],'normal','start'))
   if i<3: arrow(f'M{W/2} {y+hh} V{y+gap-5}')
 elif key=='maturity':
  # A staircase emphasizes progression; the reassessment loop is separate.
  if mobile:
   box(55,130,260,115,steps[0][0],steps[0][1]);box(385,270,260,115,steps[1][0],steps[1][1]);box(55,410,260,115,steps[2][0],steps[2][1]);box(385,550,260,115,steps[3][0],steps[3][1]);
   arrow('M315 185 H350 V325 H385');arrow('M385 325 H350 V465 H315');arrow('M315 465 H350 V605 H385')
  else:
   xys=[(35,395),(325,320),(615,245),(905,170)]
   for (x,y),step in zip(xys,steps): box(x,y,245,105,step[0],step[1])
   for (x,y),(xx,yy) in zip(xys,xys[1:]): arrow(f'M{x+245} {y+52} H{xx-20} V{yy+52} H{xx}')
  out.append(text(wrap(steps[-1][2],W-50,17),W/2,H-45,17,t['muted']))
 elif key in ('reply-eval','ir-flow'):
  # Two streams converge for evaluation; response has an independent automatic path.
  if mobile:
   if key=='reply-eval':
    box(35,125,270,115,steps[1][0],steps[1][1]);box(395,125,270,115,steps[2][0],steps[2][1]);
    box(190,370,320,115,'Evaluación' if lang=='es' else 'Evaluator','Contrasta con la sesión' if lang=='es' else 'Compare claims to the session');box(190,615,320,115,steps[3][0],steps[3][1]);
    arrow('M170 240 V300 H280 V370');arrow('M530 240 V300 H420 V370');arrow('M350 485 V615')
   else:
    box(215,105,270,100,steps[0][0],steps[0][1]);box(45,300,270,115,steps[1][0],steps[1][1]);box(385,300,270,115,'Active Response','Solo si se configura' if lang=='es' else 'Only if configured');box(45,540,270,115,steps[2][0],steps[2][1]);box(385,540,270,115,steps[3][0],steps[3][1]);
    arrow('M290 205 V250 H180 V300');arrow('M410 205 V250 H520 V300');arrow('M180 415 V540');arrow('M520 415 V540')
  else:
   if key=='reply-eval':
    box(35,130,260,110,steps[1][0],steps[1][1]);box(35,365,260,110,steps[2][0],steps[2][1]);box(465,245,270,110,'Evaluación' if lang=='es' else 'Evaluator','Contrasta con la sesión' if lang=='es' else 'Compare claims to the session');box(895,245,270,110,steps[3][0],steps[3][1]);
    arrow('M295 185 H365 V270 H465');arrow('M295 420 H365 V330 H465');arrow('M735 300 H895')
   else:
    box(40,260,230,110,steps[0][0],steps[0][1]);box(365,120,240,110,steps[1][0],steps[1][1]);box(720,120,240,110,steps[2][0],steps[2][1]);box(365,405,240,110,'Active Response','Solo si se configura' if lang=='es' else 'Only if configured');box(720,405,240,110,steps[3][0],steps[3][1]);
    arrow('M270 285 H315 V175 H365');arrow('M270 345 H315 V460 H365');arrow('M605 175 H720');arrow('M605 460 H720')
  out.append(text(wrap(steps[-1][2],W-60,17),W/2,H-35,17,t['muted']))
 elif key=='local-model-loop':
  # Loop back from evaluation to the training examples.
  if mobile:
   pts=[(55,120),(385,120),(385,475),(55,475)];bw=260;bh=125
   arrow('M315 180 H385');arrow('M515 245 V475');arrow('M385 535 H315');arrow('M645 535 H680 V95 H185 V120')
  else:
   pts=[(80,130),(850,130),(850,425),(80,425)];bw=270;bh=110
   arrow('M350 185 H850');arrow('M985 240 V425');arrow('M850 480 H350');arrow('M1120 480 H1160 V95 H215 V130')
  for (x,y),(h,s,d) in zip(pts,steps): box(x,y,bw,bh,h,s)
  out.append(text(wrap(steps[2][2],W-60,17),W/2,H/2+10,17,t['muted']))
 else: # SOC evidence path: model judgment is bounded by the evidence pack.
  if mobile:
   pts=[(40,120),(390,120),(40,465),(390,465)];bw=270;bh=120
   arrow('M310 180 H390');arrow('M525 240 V255 H350 V430 H175 V465');arrow('M310 525 H390')
  else:
   pts=[(35,250),(335,250),(635,250),(935,250)];bw=230;bh=130
   for x in (265,565,865): arrow(f'M{x} 315 H{x+70}')
  for (x,y),(h,s,d) in zip(pts,steps): box(x,y,bw,bh,h,s)
  if mobile:
   for (x,y),step in zip(pts,steps): note(x,y+145,bw,90,step[2])
  else:
   boundary(25,180,1150,330,'EVIDENCIA · ALCANCE · VALIDACIÓN' if lang=='es' else 'EVIDENCE · SCOPE · VALIDATION')
   for (x,y),step in zip(pts,steps): note(x,y+165,bw,65,step[2])
 out.append('</g></svg>');return ''.join(out)

for key,languages in DATA.items():
 for lang in languages:
  for dark in (False,True):
   for mobile in (False,True):
    if key in ('credential-risk', 'soc', 'ir-layers') or (key == 'credential-flow' and not mobile):
     continue
    stem=('ai-soc-evidence-flow' if key=='soc' else 'incident-response-'+key[3:]+'-'+lang if key.startswith('ir-') else key+'-'+lang)
    name=stem+('-dark' if dark else '')+('-mobile' if mobile else '')+'.svg'
    (OUT/name).write_text(svg(key,lang,dark,mobile))
