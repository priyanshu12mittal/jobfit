import {NextRequest,  NextResponse} from "next/server";

export function middleware(request: NextRequest){
    const apiKey = process.env.APP_API_KEY ?? '';

    if(request.nextUrl.pathname.startsWith('/api')){
        const orchestratrUrl = process.env.ORCHESTRATOR_URL ?? 'http://localhost:8081';
        const target  = new URL(request.nextUrl.pathname + request.nextUrl.search, orchestratrUrl);

        const headers = new Headers(request.headers);
        if(apiKey){
            headers.set('Authorization', `Bearer ${apiKey}`);
        }

        return NextResponse.rewrite(target, {request:{headers}});
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/api/:path*',
};
