export type SettingsForm={business_name:string;whatsapp:string;instagram_url:string;location:string};
export function validateSettings(f:SettingsForm){
 const errors:string[]=[],hints:string[]=[];
 const name=f.business_name.trim();if(!name)errors.push('Falta el nombre del negocio.');else if(name.length>80)errors.push('El nombre es demasiado largo (máximo 80 caracteres).');
 const wa=f.whatsapp.replace(/\D/g,'');
 if(!wa)hints.push('Sin número de WhatsApp, los botones de contacto se ocultan en la web.');
 else if(wa.startsWith('0'))errors.push('El número de WhatsApp no debe empezar con 0: usá el código de país (ej. 54 para Argentina).');
 else if(wa.length<8||wa.length>15)errors.push('El número de WhatsApp debe tener entre 8 y 15 dígitos, con código de país y sin símbolos.');
 else if(wa.startsWith('54')&&!wa.startsWith('549')&&wa.length>=12)hints.push('Si es un celular argentino, el formato suele ser 549 + código de área (sin 0) + número (sin 15). Probá el enlace antes de guardar.');
 let ig=f.instagram_url.trim();
 if(ig){if(/^@?[A-Za-z0-9._]+$/.test(ig))ig=`https://www.instagram.com/${ig.replace(/^@/,'')}/`;
  if(!/^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]+\/?$/.test(ig))errors.push('El enlace de Instagram no es válido. Ejemplo: https://www.instagram.com/tuusuario/');}
 const loc=f.location.trim();if(loc.length>120)errors.push('La ubicación es demasiado larga (máximo 120 caracteres).');
 return {errors,hints,clean:{business_name:name,whatsapp:wa||null,instagram_url:ig||null,location:loc||null}};}
export type IgStatus={connected:boolean;expires_at?:string|null;last_sync_at?:string|null;last_error?:string|null};
/** Avisos para el panel: vencimiento cercano, error de la última sincronización o sincronizaciones detenidas. */
export function igAlerts(c:IgStatus,now=Date.now()):string[]{
 if(!c.connected)return [];const out:string[]=[];
 if(c.expires_at){const d=(new Date(c.expires_at).getTime()-now)/864e5;
  if(d<=0)out.push('El acceso a Instagram venció. Reconectá la cuenta desde Instagram > Reconectar.');
  else if(d<10)out.push(`El acceso a Instagram vence en ${Math.ceil(d)} día(s) y no se renovó solo. Reconectá la cuenta desde Instagram > Reconectar.`);}
 if(c.last_error)out.push(`La última sincronización con Instagram tuvo un problema: ${c.last_error}`);
 if(c.last_sync_at&&(now-new Date(c.last_sync_at).getTime())>24*36e5)out.push('Hace más de 24 horas que no hay una sincronización (se esperan cada 6 horas). Revisá la tarea programada.');
 return out;}
