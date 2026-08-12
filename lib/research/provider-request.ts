export type ResearchProvider={name:string;category:"market"|"onchain"|"sentiment"|"news";endpoint:string};
export type ResearchHttpRequest={url:string;init:RequestInit};
const symbols=["BTC","ETH","SOL","USDC","USDT","BNB","XRP","DOGE","ADA","AVAX","LINK","UNI","ARB","OP"];
export function buildResearchRequest(provider:ResearchProvider,text:string):ResearchHttpRequest{
 const url=new URL(provider.endpoint);const selected=symbols.filter(s=>new RegExp("\\b"+s+"\\b","i").test(text));const requested=selected.length?selected:["BTC","ETH"];
 if(provider.name.toLowerCase().includes("coingecko")){if(provider.category==="market"){url.searchParams.set("vs_currencies","usd");url.searchParams.set("symbols",requested.map(x=>x.toLowerCase()).join(","));url.searchParams.set("include_market_cap","true");url.searchParams.set("include_24hr_vol","true");url.searchParams.set("include_24hr_change","true");url.searchParams.set("precision","full")}else{url.searchParams.set("query",requested[0]!.toLowerCase());url.searchParams.set("include","base_token,quote_token,dex");url.searchParams.set("page","1")}return{url:url.toString(),init:{method:"GET",headers:{accept:"application/json"}}}}
 if(provider.name.toLowerCase().includes("coinmarketcap")){url.searchParams.set("symbol",requested.join(","));url.searchParams.set("convert","USD");return{url:url.toString(),init:{method:"GET",headers:{accept:"application/json"}}}}
 return{url:url.toString(),init:{method:"POST",headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify({query:text})}}
}
