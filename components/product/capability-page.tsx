import Link from "next/link";
import { AuctorSymbol } from "../brand/auctor-symbols";

type SymbolName = Parameters<typeof AuctorSymbol>[0]["name"];
export function CapabilityPage(props:{title:string;eyebrow:string;description:string;symbol:SymbolName;facts:readonly string[]}){
  return <section className="capabilityPage"><header><AuctorSymbol name={props.symbol}/><p className="eyebrow">{props.eyebrow}</p><h1>{props.title}</h1><p>{props.description}</p></header><div className="capabilityFacts">{props.facts.map((fact,index)=><div key={fact}><span>{String(index+1).padStart(2,"0")}</span><p>{fact}</p></div>)}</div><Link className="capabilityCommand" href="/chat">Open Command</Link></section>
}
