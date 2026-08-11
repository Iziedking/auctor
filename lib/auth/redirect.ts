const allowed=new Set(["/agent","/chat","/audit"]);
export function safeNextPath(value:string|null|undefined):string{if(!value||!value.startsWith("/")||value.startsWith("//"))return"/agent";try{const url=new URL(value,"https://auctor.space");return url.origin==="https://auctor.space"&&allowed.has(url.pathname)?`${url.pathname}${url.search}`:"/agent"}catch{return"/agent"}}
