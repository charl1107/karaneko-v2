var p={},M=(P,h,R)=>(p.__chunk_9191=(v,b,f)=>{"use strict";var _=Object.create,u=Object.defineProperty,m=Object.getOwnPropertyDescriptor,r=Object.getOwnPropertyNames,l=Object.getPrototypeOf,d=Object.prototype.hasOwnProperty,a=(e,t,o,s)=>{if(t&&typeof t=="object"||typeof t=="function")for(let n of r(t))d.call(e,n)||n===o||u(e,n,{get:()=>t[n],enumerable:!(s=m(t,n))||s.enumerable});return e},g=((e,t)=>function(){return t||(0,e[r(e)[0]])((t={exports:{}}).exports,t),t.exports})({"../../node_modules/dedent-tabs/dist/dedent-tabs.js"(e){Object.defineProperty(e,"__esModule",{value:!0}),e.default=function(t){for(var o=typeof t=="string"?[t]:t.raw,s="",n=0;n<o.length;n++)if(s+=o[n].replace(/\\\n[ \t]*/g,"").replace(/\\`/g,"`").replace(/\\\$/g,"$").replace(/\\\{/g,"{"),n<(1>=arguments.length?0:arguments.length-1)){var B=s.substring(s.lastIndexOf(`
`)+1).match(/^(\s*)\S?/);s+=((1>n+1||arguments.length<=n+1?void 0:arguments[n+1])+"").replace(/\n/g,`
`+B[1])}var O=s.split(`
`),c=null;if(O.forEach(function(i){var C=Math.min,D=i.match(/^(\s+)\S+/);if(D){var w=D[1].length;c=c?C(c,w):w}}),c!==null){var k=c;s=O.map(function(i){return i[0]===" "||i[0]==="	"?i.slice(k):i}).join(`
`)}return s.trim().replace(/\\n/g,`
`)}}}),x={};((e,t)=>{for(var o in t)u(e,o,{get:t[o],enumerable:!0})})(x,{getOptionalRequestContext:()=>j,getRequestContext:()=>q}),v.exports=a(u({},"__esModule",{value:!0}),x),f(6075);var y=((e,t,o)=>(o=e!=null?_(l(e)):{},a(!t&&e&&e.__esModule?o:u(o,"default",{value:e,enumerable:!0}),e)))(g()),E=Symbol.for("__cloudflare-request-context__");function j(){let e=h[E];if((process?.release?.name==="node"?"nodejs":"edge")=="nodejs")throw Error(y.default`
			\`getRequestContext\` and \`getOptionalRequestContext\` can only be run
			inside the edge runtime, so please make sure to have included
			\`export const runtime = 'edge'\` in all the routes using such functions
			(regardless of whether they are used directly or indirectly through imports).
		`);return e}function q(){let e=j();if(!e)throw process?.env?.NEXT_PHASE==="phase-production-build"?Error(y.default`
				\n\`getRequestContext\` is being called at the top level of a route file, this is not supported
				for more details see https://developers.cloudflare.com/pages/framework-guides/nextjs/ssr/troubleshooting/#top-level-getrequestcontext \n
			`):Error("Failed to retrieve the Cloudflare request context.");return e}},p.__chunk_6089=(v,b,f)=>{"use strict";f.d(b,{M:()=>u,x:()=>m});var _=f(9191);function u(r){let l=r instanceof Error?r.message:typeof r=="string"?r:r&&typeof r=="object"&&"message"in r?String(r.message):"";return l.includes("D1 database binding")&&l.includes("DB")}function m(r){let l=(0,_.getOptionalRequestContext)();if(l?.env&&"DB"in l.env)return l.env.DB;let d=h.__env__;if(d?.DB)return d.DB;let a=r?.__cloudflare__?.env;if(a?.DB)return a.DB;let g=h.DB;if(g)return g;throw Error(`D1 database binding 'DB' not found.
For local dev, run: npm run dev:local
For production, make sure wrangler.toml has the correct database_id.`)}},p.__chunk_6075=()=>{},p);export{M as __getNamedExports};
