import{highlightCode}from'/home/arda/Masaüstü/Project/SiteBuilder/frontend/src/utils/syntaxHighlight.js';
for(const repeats of [333,3333,16666,66000]){const s='/*x'.repeat(repeats);const start=performance.now();const out=highlightCode(s,'css');console.log(JSON.stringify({bytes:s.length,ms:performance.now()-start,outputBytes:out.length}));}
