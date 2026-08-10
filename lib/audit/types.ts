import type { AuditTimelineEntry } from "../execution/audit.ts";
export type AuditStatus="confirmed"|"refused"|"failed"|"pending";
export interface AuditListItem{readonly id:string;readonly status:AuditStatus;readonly action:string;readonly chainId:string;readonly chainLabel:string;readonly correlationId:string;readonly policyVerdict:"allowed"|"refused";readonly createdAt:string;readonly keeperHubExecutionId?:string;readonly transactionHash?:string}
export interface AuditDetail extends AuditListItem{readonly agent:string;readonly sponsored:boolean;readonly spendUsd?:string;readonly timeline:readonly AuditTimelineEntry[];readonly evidence:unknown}
export interface AuditQuery{readonly status?:AuditStatus;readonly chainId?:string;readonly search?:string}
export type AuditResult<T>={readonly kind:"ready";readonly value:T}|{readonly kind:"unavailable";readonly reason:string}|{readonly kind:"not_found"};
export interface AuditDataSource{list(query:AuditQuery):Promise<AuditResult<readonly AuditListItem[]>>;get(id:string):Promise<AuditResult<AuditDetail>>}
