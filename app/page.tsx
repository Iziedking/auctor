import{Suspense}from"react";import{BrandLoader}from"../components/auth/brand-loader";import{PublicGateway}from"../components/auth/public-gateway";
export default function Home(){return <Suspense fallback={<BrandLoader/>}><PublicGateway/></Suspense>}
