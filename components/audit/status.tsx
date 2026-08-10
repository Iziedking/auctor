import{CheckCircle2,XCircle,Clock3,AlertTriangle}from"lucide-react";import type{AuditStatus}from"../../lib/audit/types";
const map={confirmed:{label:"Confirmed",Icon:CheckCircle2},refused:{label:"Refused",Icon:XCircle},failed:{label:"Failed",Icon:AlertTriangle},pending:{label:"Pending",Icon:Clock3}};
export function Status({status}:{status:AuditStatus}){const{label,Icon}=map[status];return <span className={`status ${status}`}><Icon size={14}/>{label}</span>}
