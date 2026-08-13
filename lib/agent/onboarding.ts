export function isAgentOnboardingComplete(agent:{readonly onboardingCompletedAt:Date|string|null;readonly[key:string]:unknown}):boolean{return agent.onboardingCompletedAt!==null}
